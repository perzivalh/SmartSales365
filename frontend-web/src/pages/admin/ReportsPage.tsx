import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { generateDynamicReport, transcribeReportAudio } from "../../api/reports";
import type { DynamicReportResponse } from "../../types/api";

type ReportFormat = "pdf" | "xlsx";

type ReportRecord = DynamicReportResponse & {
  id: string;
  prompt: string;
  createdAt: string;
};

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `report-${Math.random().toString(36).slice(2, 11)}`;
}

function downloadBase64File(base64: string, filename: string, mimeType: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function summarizeNumericInsights(columns: string[], rows: Record<string, unknown>[]) {
  const metrics: Array<{ label: string; value: string; tone?: "positive" | "neutral" }> = [
    { label: "Filas", value: rows.length.toString() },
  ];

  if (!rows.length) {
    return metrics;
  }

  const numericColumns = columns.filter((column) => rows.some((row) => typeof row[column] === "number"));
  if (numericColumns.length === 0) {
    return metrics;
  }

  const highlightedColumn = numericColumns[0];
  const values = rows
    .map((row) => row[highlightedColumn])
    .filter((value): value is number => typeof value === "number");

  if (values.length > 0) {
    const maxValue = Math.max(...values);
    const total = values.reduce((accumulator, current) => accumulator + current, 0);
    metrics.push({
      label: `Máximo (${highlightedColumn})`,
      value: new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(maxValue),
      tone: "positive",
    });
    metrics.push({
      label: `Suma (${highlightedColumn})`,
      value: new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(total),
      tone: "neutral",
    });
  }

  return metrics.slice(0, 4);
}

type ChartData = {
  column: string;
  labelColumn: string;
  points: Array<{ label: string; value: number }>;
  maxValue: number;
};

function computeChartData(columns: string[], rows: Record<string, unknown>[]): ChartData | null {
  if (!columns.length || !rows.length) {
    return null;
  }

  const numericColumn = columns.find((column) => {
    return rows.some((row) => typeof row[column] === "number" || !Number.isNaN(Number(row[column])));
  });

  if (!numericColumn) {
    return null;
  }

  const labelColumn = columns.find((column) => column !== numericColumn) ?? numericColumn;

  const points = rows
    .map((row, index) => {
      const rawValue = row[numericColumn];
      const numericValue = typeof rawValue === "number" ? rawValue : Number(rawValue);
      if (!Number.isFinite(numericValue)) {
        return null;
      }
      const labelSource = row[labelColumn];
      const label = labelSource ? String(labelSource) : `Fila ${index + 1}`;
      return { label, value: numericValue };
    })
    .filter((point): point is { label: string; value: number } => point !== null);

  const sortedPoints = points.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 8);

  if (!sortedPoints.length) {
    return null;
  }

  const maxValue = Math.max(...sortedPoints.map((point) => Math.abs(point.value)));

  return {
    column: numericColumn,
    labelColumn,
    points: sortedPoints,
    maxValue,
  };
}

const TECHNICAL_COLUMNS = new Set([
  "id",
  "created_at",
  "updated_at",
  "createdat",
  "updatedat",
  "fecha_creacion",
  "fecha_actualizacion",
  "creado_en",
  "actualizado_en",
]);

function renderInlineSegments(text: string, keyPrefix: string): ReactNode[] {
  const segments = text.split(/\*\*(.*?)\*\*/g);
  return segments
    .map((segment, index) => {
      if (!segment) {
        return null;
      }
      if (index % 2 === 1) {
        return (
          <strong key={`${keyPrefix}-strong-${index}`} className="font-semibold text-white">
            {segment}
          </strong>
        );
      }
      return <span key={`${keyPrefix}-text-${index}`}>{segment}</span>;
    })
    .filter(Boolean) as ReactNode[];
}

function buildSummaryElements(summary: string): ReactNode[] {
  const rawLines = summary
    .split(/\\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!rawLines.length) {
    return [
      <p key="summary-empty" className="leading-relaxed text-sm text-white/80">
        No se generA3 un resumen para esta consulta.
      </p>,
    ];
  }

  const ignoredPrefixes = [/^hallazgos clave/i, /^tendencias/i, /^conclusiones/i, /^acciones/i, /^---+$/];
  const bulletCandidates: string[] = [];

  for (const line of rawLines) {
    if (ignoredPrefixes.some((pattern) => pattern.test(line))) {
      if (/^conclusiones/i.test(line) || /^acciones/i.test(line)) {
        break;
      }
      continue;
    }

    const listMatch = /^[-*\d.]+\s+(.*)/.exec(line);
    if (listMatch) {
      bulletCandidates.push(listMatch[1]);
      continue;
    }

    if (!bulletCandidates.length) {
      bulletCandidates.push(line);
    }
  }

  if (!bulletCandidates.length) {
    bulletCandidates.push(rawLines[0]);
  }

  const condensed = bulletCandidates.slice(0, 4).map((line, index) => {
    const cleanLine = line.replace(/:\s*$/, "");
    return (
      <li key={`summary-bullet-${index}`} className="leading-relaxed text-sm text-white/85">
        {renderInlineSegments(cleanLine, `summary-bullet-${index}`)}
      </li>
    );
  });

  return [
    <ul key="summary-condensed" className="list-disc space-y-2 pl-5">
      {condensed}
    </ul>,
  ];
}

export function ReportsPage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<ReportRecord | null>(null);
  const [history, setHistory] = useState<ReportRecord[]>([]);
  const [exportingFormat, setExportingFormat] = useState<ReportFormat | null>(null);
  const [recordingState, setRecordingState] = useState<"idle" | "recording" | "processing">("idle");

  const abortControllerRef = useRef<AbortController | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordedTranscriptRef = useRef("");

  const visibleColumns = useMemo(() => {
    if (!activeReport) {
      return [] as string[];
    }
    const filtered = activeReport.columnas.filter((column) => {
      const normalized = column.toLowerCase();
      return !TECHNICAL_COLUMNS.has(normalized);
    });
    return filtered.length ? filtered : activeReport.columnas;
  }, [activeReport]);

  const metrics = useMemo(
    () => (activeReport ? summarizeNumericInsights(visibleColumns, activeReport.filas) : []),
    [activeReport, visibleColumns],
  );

  const summaryElements = useMemo(
    () => buildSummaryElements(activeReport?.resumen ?? ""),
    [activeReport?.resumen],
  );

  const chartData = useMemo(
    () => (activeReport ? computeChartData(visibleColumns, activeReport.filas) : null),
    [activeReport, visibleColumns],
  );

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat("es-ES", {
        maximumFractionDigits: 2,
      }),
    [],
  );

  const historyDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [],
  );

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(true);

  const historyItems = useMemo(() => {
    if (!activeReport) {
      return history;
    }
    const seen = new Set<string>();
    const combined = [activeReport, ...history];
    return combined.filter((report) => {
      if (seen.has(report.id)) {
        return false;
      }
      seen.add(report.id);
      return true;
    });
  }, [activeReport, history]);

  const isHistoryEmpty = historyItems.length === 0;

  const isRecording = recordingState === "recording";
  const isProcessingRecording = recordingState === "processing";

  const stopMediaStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      mediaStreamRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    } else {
      mediaRecorderRef.current = null;
      stopMediaStream();
      setRecordingState("idle");
    }
  }, [stopMediaStream]);

  useEffect(
    () => () => {
      stopRecording();
    },
    [stopRecording],
  );

  const handleGenerateReport = useCallback(
    async (requestedPrompt?: string, options?: { skipStop?: boolean; preservePrompt?: boolean }) => {
      const finalPrompt = (requestedPrompt ?? prompt).trim();
      if (!finalPrompt) {
        setError("Escribe una pregunta en lenguaje natural.");
        return;
      }

      if (!options?.skipStop) {
        stopRecording();
      }
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const response = await generateDynamicReport({
          prompt: finalPrompt,
          limit: 200,
          signal: controller.signal,
          timeoutMs: 60000,
        });

        setHistory((current) => {
          const base = activeReport ? [activeReport, ...current] : current;
          const unique: ReportRecord[] = [];
          const seen = new Set<string>();
          for (const report of base) {
            if (!seen.has(report.id)) {
              unique.push(report);
              seen.add(report.id);
            }
          }
          return unique.slice(0, 20);
        });

        const newReport: ReportRecord = {
          ...response,
          id: createId(),
          prompt: finalPrompt,
          createdAt: response.generado_en ?? new Date().toISOString(),
        };
        setActiveReport(newReport);
        if (!options?.preservePrompt) {
          setPrompt("");
        }
        recordedTranscriptRef.current = options?.preservePrompt ? finalPrompt : "";
      } catch (requestError) {
        if ((requestError as { name?: string }).name === "CanceledError") {
          return;
        }
        console.error(requestError);
        const axiosCode = (requestError as { code?: string }).code;
        if (axiosCode === "ECONNABORTED") {
          setError("La generación tardó demasiado. Intenta de nuevo; si el problema persiste, revisa el backend o tu conexión.");
        } else {
          setError("No se pudo generar el reporte. Intenta nuevamente.");
        }
      } finally {
        abortControllerRef.current = null;
        setLoading(false);
      }
    },
    [activeReport, prompt, stopRecording],
  );

  const selectSupportedMimeType = () => {
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
    for (const candidate of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(candidate)) {
        return candidate;
      }
    }
    return "audio/webm";
  };

  const handleToggleRecording = useCallback(async () => {
    if (recordingState === "recording") {
      stopRecording();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Tu navegador no soporta captura de audio.");
      return;
    }

    recordedTranscriptRef.current = "";
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mimeType = selectSupportedMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        stopRecording();
        setError("Ocurrió un error durante la grabación.");
      };

      recorder.onstop = async () => {
        mediaRecorderRef.current = null;
        stopMediaStream();
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];
        if (audioBlob.size === 0) {
          setRecordingState("idle");
          setError("No se detectó audio. Vuelve a intentarlo.");
          return;
        }
        setRecordingState("processing");
        try {
          const transcript = await transcribeReportAudio(audioBlob);
          recordedTranscriptRef.current = transcript;
          if (!transcript.trim()) {
            setError("La transcripción llegó vacía. Intenta grabar nuevamente.");
            setPrompt("");
          } else {
            setPrompt(transcript);
            await handleGenerateReport(transcript, { skipStop: true });
          }
        } catch (transcriptionError) {
          console.error(transcriptionError);
          const axiosCode = (transcriptionError as { code?: string }).code;
          if (axiosCode === "ECONNABORTED") {
            setError("La transcripción tomó demasiado tiempo. Prueba otra vez.");
          } else {
            setError("No se pudo transcribir el audio. Intenta nuevamente.");
          }
        } finally {
          setRecordingState("idle");
        }
      };

      recorder.start();
      setRecordingState("recording");
    } catch (mediaError) {
      console.error(mediaError);
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
      stopMediaStream();
      setRecordingState("idle");
      if ((mediaError as DOMException).name === "NotAllowedError") {
        setError("Permite el acceso al micrófono para usar dictado de voz.");
      } else if ((mediaError as DOMException).name === "NotFoundError") {
        setError("No se encontró un micrófono disponible.");
      } else {
        setError("No se pudo iniciar la grabación. Revisa tu micrófono.");
      }
    }
  }, [handleGenerateReport, recordingState, stopMediaStream, stopRecording]);

  const handleSelectHistory = (reportId: string) => {
    const selected = historyItems.find((report) => report.id === reportId);
    if (!selected) {
      return;
    }
    setActiveReport(selected);
    setHistoryOpen(false);
  };

  const handleExport = async (format: ReportFormat) => {
    if (!activeReport) {
      return;
    }

    setExportingFormat(format);
    setError(null);

    try {
      const exportResponse = await generateDynamicReport({
        prompt: activeReport.prompt,
        limit: activeReport.filas.length || 200,
        exportFormat: format,
        timeoutMs: 60000,
      });

      const exportFile = exportResponse.exportacion;
      if (!exportFile) {
        throw new Error("missing export");
      }

      downloadBase64File(exportFile.archivo, exportFile.nombre, exportFile.content_type);
    } catch (exportError) {
      console.error(exportError);
      const axiosCode = (exportError as { code?: string }).code;
      if (axiosCode === "ECONNABORTED") {
        setError("La exportación tardó demasiado y fue cancelada.");
      } else {
        setError("No se pudo generar la exportación solicitada.");
      }
    } finally {
      setExportingFormat(null);
    }
  };

  const handleExportHtml = useCallback(() => {
    if (!activeReport) {
      return;
    }

    const title = activeReport.prompt || "Reporte inteligente";
    const timestamp = new Date(activeReport.generado_en ?? activeReport.createdAt);
    const summaryLines = (activeReport.resumen ?? "")
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    const bulletLines = summaryLines
      .filter((line) => /^[-*\d.]+\s+/.test(line))
      .map((line) => line.replace(/^[-*\d.]+\s+/, ""));

    let summaryHtml = "";
    if (bulletLines.length) {
      summaryHtml = `<ul>${bulletLines.slice(0, 4).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
    } else if (summaryLines.length) {
      summaryHtml = `<p>${escapeHtml(summaryLines[0])}</p>`;
    } else {
      summaryHtml = "<p>Sin resultados</p>";
    }

    const formatValue = (value: unknown): string => {
      if (value === null || value === undefined || value === "") {
        return "-";
      }
      if (typeof value === "number") {
        return numberFormatter.format(value);
      }
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed !== "" && Number.isFinite(Number(trimmed))) {
          return numberFormatter.format(Number(trimmed));
        }
        return trimmed;
      }
      if (value instanceof Date) {
        return value.toLocaleString();
      }
      return String(value);
    };

    const tableHead = visibleColumns
      .map((column) => `<th style="text-align:left;padding:8px;border-bottom:1px solid #15324a;">${escapeHtml(column)}</th>`)
      .join("");

    const tableRows = activeReport.filas
      .map((row) => {
        const cells = visibleColumns
          .map((column) => `<td style="padding:8px;border-bottom:1px solid #0f2438;">${escapeHtml(formatValue(row[column]))}</td>`)
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");

    const formattedDate = historyDateFormatter.format(timestamp);
    const htmlContent = `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #031225; color: #e5f5ff; margin: 32px; }
      h1 { font-size: 24px; margin-bottom: 8px; }
      .meta { font-size: 13px; color: #9cbcd9; margin-bottom: 24px; }
      ul { margin: 0 0 24px 20px; }
      table { width: 100%; border-collapse: collapse; background: #04172a; border-radius: 16px; overflow: hidden; }
      th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em; color: #81d7ff; }
      td { color: #f0f7ff; font-size: 13px; }
      tr:nth-child(even) { background: rgba(255, 255, 255, 0.04); }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">Generado el ${escapeHtml(formattedDate)}</div>
    ${summaryHtml}
    <table>
      <thead><tr>${tableHead}</tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  </body>
</html>`;

    const filename = `reporte-${timestamp.toISOString().slice(0, 10)}.html`;
    downloadBlob(new Blob([htmlContent], { type: "text/html;charset=utf-8" }), filename);
  }, [activeReport, historyDateFormatter, numberFormatter, visibleColumns]);

  const handleCancelGeneration = () => {
    if (!loading) {
      return;
    }
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setLoading(false);
    setError("Generacion cancelada por el usuario.");
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleGenerateReport();
  };

  return (
    <div className="relative flex h-[calc(100vh-4rem)] w-full min-w-0 overflow-hidden bg-[#010b17] text-white">
      <aside
        className={`absolute inset-y-0 left-0 z-40 flex h-full w-72 flex-col border-r border-white/5 bg-[#04121f]/95 transition-[transform,width,opacity] duration-300 ease-out lg:relative lg:z-0 lg:translate-x-0 lg:bg-[#04121f] ${
          historyOpen ? "translate-x-0 pointer-events-auto" : "-translate-x-full pointer-events-none lg:pointer-events-auto"
        } ${historyCollapsed ? "lg:w-0 lg:border-r-0" : "lg:w-72"}`}
      >
        <div
          className={`flex h-full flex-col px-5 py-6 transition-opacity duration-200 ${
            historyCollapsed ? "pointer-events-none opacity-0 lg:px-0 lg:py-0" : "opacity-100"
          }`}
        >
          <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.35em] text-white/45">Historial de consultas</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/70">
                {historyItems.length} {historyItems.length === 1 ? "registro" : "registros"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setHistoryOpen(false)}
              className="rounded-full border border-white/10 bg-white/5 p-1 text-white/70 transition hover:bg-white/10 lg:hidden"
              aria-label="Cerrar historial"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="mt-6 flex-1 overflow-y-auto pr-1 scrollbar-hide">
            {isHistoryEmpty ? (
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-8 text-center text-xs text-white/60">
                <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true" className="text-white/55">
                  <path
                    d="M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9.5h5M9.5 12h4"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="mt-3 text-sm text-white/65">Aun no hay consultas guardadas.</p>
                <p className="text-xs text-white/45">Genera tu primer reporte para poblar el historial.</p>
              </div>
            ) : (
              <ul className="space-y-3 pb-10">
                {historyItems.map((report) => {
                  const isActive = activeReport?.id === report.id;
                  const formattedDate = historyDateFormatter.format(new Date(report.generado_en ?? report.createdAt));
                  const preview = report.resumen || report.prompt;
                  return (
                    <li key={report.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectHistory(report.id)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-[#4dd2ff]/50 ${
                          isActive ? "border-[#1fb7ff]/60 bg-[#083043]" : "border-white/5 bg-white/0 hover:border-white/15 hover:bg-white/5"
                        }`}
                      >
                        <p className="text-xs uppercase tracking-[0.3em] text-white/45">{formattedDate}</p>
                        <p
                          className="mt-1 text-sm font-semibold text-white/90"
                          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                        >
                          {preview}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </aside>

      {historyOpen ? (
        <button
          type="button"
          onClick={() => setHistoryOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          aria-label="Cerrar historial"
        />
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex flex-col gap-3 border-b border-white/5 bg-[#021322]/95 px-4 py-4 backdrop-blur lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <div className="min-w-0">
                <h1 className="text-xl font-semibold text-white/90">Reportes inteligentes</h1>
              </div>
              <button
                type="button"
                onClick={() => {
                  setHistoryCollapsed((current) => !current);
                  setHistoryOpen(false);
                }}
                className="hidden items-center justify-center rounded-md border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 lg:flex"
              aria-label={historyCollapsed ? "Mostrar historial" : "Ocultar historial"}
              title={historyCollapsed ? "Mostrar historial" : "Ocultar historial"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                {historyCollapsed ? (
                  <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
            </button>
          </div>
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:bg-white/10 lg:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="text-white/80">
              <path
                d="M5 3h14a1 1 0 011 1v16a1 1 0 01-1.555.832L12 17.202l-6.445 3.63A1 1 0 014 20V4a1 1 0 011-1z"
                fill="currentColor"
              />
            </svg>
            Historial
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          <main className="flex min-h-0 flex-1 flex-col px-4 py-0 lg:px-8 lg:py-0">
            <div className="mx-auto flex h-full w-full max-w-4xl flex-1 flex-col overflow-hidden">
              {error ? (
                <div className="mb-4 rounded-3xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>
              ) : null}

              <div className="relative flex min-h-0 flex-1 overflow-hidden">
                  <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-transparent">
                  <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-8 scrollbar-hide sm:px-6">
                    {activeReport ? (
                      <div className="space-y-7">
                        <div className="flex justify-end">
                          <div className="w-full rounded-3xl bg-primary/80 px-6 py-4 text-sm leading-relaxed text-white shadow-lg shadow-primary/30 sm:max-w-3xl">
                            <p className="whitespace-pre-line">{activeReport.prompt}</p>
                            <span className="mt-3 block text-xs uppercase tracking-[0.3em] text-white/70">
                              {historyDateFormatter.format(new Date(activeReport.generado_en ?? activeReport.createdAt))}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="hidden h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xs font-semibold uppercase tracking-[0.25em] text-white/70 sm:flex">
                            IA
                          </div>
                          <div className="flex w-full min-w-0 flex-col gap-5">
                            <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 shadow-lg shadow-black/30 backdrop-blur-sm">
                              <div className="space-y-3 text-white/85">{summaryElements}</div>
                            </div>

                            {metrics.length ? (
                              <div className="flex flex-wrap gap-3">
                                {metrics.map((metric) => (
                                  <div
                                    key={metric.label}
                                    className={`flex min-w-[150px] flex-1 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] ${
                                      metric.tone === "positive"
                                        ? "border-emerald-300/60 bg-emerald-400/15 text-emerald-100"
                                        : "border-white/10 bg-white/5 text-white/70"
                                    }`}
                                  >
                                    <span className="truncate">{metric.label}</span>
                                    <span className="text-sm font-semibold text-white/90">{metric.value}</span>
                                  </div>
                                ))}
                              </div>
                            ) : null}

                            {chartData ? (
                              <div className="rounded-3xl border border-white/8 bg-[#04172a]/80 p-6 shadow-inner shadow-black/20">
                                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                  <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">Visualizacion rapida</h3>
                                  <span className="text-xs uppercase tracking-[0.2em] text-white/45">Metrica base: {chartData.column}</span>
                                </div>
                                {chartData.labelColumn !== chartData.column ? (
                                  <p className="mt-1 text-xs text-white/55">Agrupado por {chartData.labelColumn}</p>
                                ) : null}
                                <div className="mt-5 space-y-4">
                                  {chartData.points.map((point, index) => {
                                    const ratio = chartData.maxValue === 0 ? 0 : (Math.abs(point.value) / chartData.maxValue) * 100;
                                    const widthPercent = Math.max(0, Math.min(100, ratio));
                                    const barColor = point.value >= 0 ? "bg-primary" : "bg-rose-400";
                                    return (
                                      <div key={`${point.label}-${index}`} className="space-y-2">
                                        <div className="flex items-center justify-between gap-3 text-xs text-white/70">
                                          <span className="truncate">{point.label}</span>
                                          <span className="font-semibold text-white/85">{numberFormatter.format(point.value)}</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-white/10">
                                          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${widthPercent}%` }} />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : activeReport.filas.length > 0 ? (
                              <div className="rounded-3xl border border-dashed border-white/10 bg-[#04172a]/60 p-6 text-sm text-white/65">
                                Agrega metricas numericas en la consulta para generar una vista grafica automatica.
                              </div>
                            ) : null}

                            <section className="rounded-3xl border border-white/8 bg-[#04121f]/80">
                              <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
                                <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">Tabla de resultados</h3>
                                <span className="text-xs uppercase tracking-[0.2em] text-white/45">{activeReport.filas.length} filas</span>
                              </div>
                              <div className="max-w-full overflow-hidden">
                                <div className="max-h-[420px] overflow-auto">
                                  <table className="min-w-max divide-y divide-white/10 text-sm">
                                    <thead className="bg-white/5">
                                      <tr>
                                        {visibleColumns.map((column) => (
                                          <th key={column} className="whitespace-nowrap px-4 py-3 text-left font-semibold uppercase tracking-[0.2em] text-white/70">
                                            {column}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                      {activeReport.filas.length === 0 ? (
                                        <tr>
                                          <td colSpan={visibleColumns.length || activeReport.columnas.length} className="px-4 py-6 text-center text-sm text-white/60">
                                            No se encontraron resultados para esta consulta.
                                          </td>
                                        </tr>
                                      ) : (
                                        activeReport.filas.map((row, index) => (
                                          <tr key={index} className={index % 2 === 0 ? "bg-transparent" : "bg-white/5"}>
                                            {visibleColumns.map((column) => {
                                              const value = row[column];
                                              let formatted = "";
                                              if (value === null || value === undefined || value === "") {
                                                formatted = "-";
                                              } else if (
                                                typeof value === "number" ||
                                                (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value)))
                                              ) {
                                                formatted = numberFormatter.format(Number(value));
                                              } else if (value instanceof Date) {
                                                formatted = value.toLocaleString();
                                              } else {
                                                formatted = String(value);
                                              }
                                              return (
                                                <td key={column} className="whitespace-nowrap px-4 py-3 text-white/80">
                                                  {formatted}
                                                </td>
                                              );
                                            })}
                                          </tr>
                                        ))
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </section>
                          </div>
                        </div>
                      </div>
                    ) : !loading ? (
                      <div className="flex h-full flex-col justify-center gap-6 px-4 py-10 text-sm text-white/70 sm:px-8">
                        <h2 className="text-base font-semibold text-white/80">¿Necesitas ideas?</h2>
                        <div className="space-y-4 text-white/65">
                          <p>
                            Ventas: ¿Cuáles fueron los 5 productos más vendidos este mes? Incluye cantidades, ingresos y variación frente al mes anterior.
                          </p>
                          <p>
                            Clientes: Muestra los clientes con mayor ticket promedio en el último trimestre junto con su correo, número de pedidos y ticket promedio.
                          </p>
                          <p>
                            Pagos: Resúmeme los pagos fallidos por método durante la última semana, agrupando intentos y monto afectado.
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {loading ? (
                      <div className="mt-8 flex items-start gap-3">
                        <div className="hidden h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xs font-semibold uppercase tracking-[0.25em] text-white/60 sm:flex">
                          IA
                        </div>
                        <div className="max-w-3xl rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white/75 shadow-inner shadow-black/30">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-3 w-3 animate-ping rounded-full bg-primary/70" />
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Generando reporte...</p>
                          </div>
                          <p className="mt-2 text-sm text-white/70">Puedes esperar unos segundos mientras procesamos tu consulta.</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </main>

          <div className="mt-auto border-t border-white/5 bg-[#031320]/95 px-4 py-3 backdrop-blur lg:px-8">
            <div className="w-full">
              {activeReport ? (
                <div className="mb-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => void handleExport("pdf")}
                    className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/85 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={exportingFormat === "xlsx" || loading}
                    title="Exportar PDF"
                  >
                    {exportingFormat === "pdf" ? "PDF..." : "PDF"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleExport("xlsx")}
                    className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/85 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={exportingFormat === "pdf" || loading}
                    title="Exportar Excel"
                  >
                    {exportingFormat === "xlsx" ? "Excel..." : "Excel"}
                  </button>
                  <button
                    type="button"
                    onClick={handleExportHtml}
                    className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/85 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={loading}
                    title="Exportar HTML"
                  >
                    HTML
                  </button>
                </div>
              ) : null}
              <form onSubmit={handleSubmit} className="rounded-xl border border-white/10 bg-[#020b16]/90 px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-center gap-3 rounded-lg border border-white/10 bg-[#010b16]/70 px-3 py-2">
                    <input
                      className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
                      placeholder="Pregunta en lenguaje natural..."
                      value={prompt}
                      onChange={(event) => {
                        recordedTranscriptRef.current = "";
                        setPrompt(event.target.value);
                      }}
                    />
                    <div className="hidden min-w-[160px] justify-end sm:flex">
                      {isRecording ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-100">
                          <span className="h-2 w-2 rounded-full bg-rose-200" />
                          Grabando...
                        </span>
                      ) : isProcessingRecording ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-white/60" />
                          Transcribiendo...
                        </span>
                      ) : recordedTranscriptRef.current ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100">
                          <span className="h-2 w-2 rounded-full bg-emerald-300" />
                          Dictado listo
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleToggleRecording()}
                      className={`relative flex h-11 w-11 items-center justify-center rounded-lg border transition ${
                        isRecording ? "border-rose-400 bg-rose-500/25" : "border-white/10 hover:bg-white/10"
                      } ${isProcessingRecording ? "opacity-60" : ""}`}
                      title={isRecording ? "Detener dictado" : "Grabar"}
                      aria-pressed={isRecording}
                      aria-label={isRecording ? "Detener dictado de voz" : "Iniciar dictado de voz"}
                      disabled={isProcessingRecording}
                    >
                      {isRecording ? (
                        <>
                          <span className="absolute h-9 w-9 animate-ping rounded-full bg-rose-400/40" />
                          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="relative text-rose-100">
                            <path
                              d="M12 15c1.657 0 3-1.343 3-3V6a3 3 0 10-6 0v6c0 1.657 1.343 3 3 3z"
                              fill="currentColor"
                            />
                            <path
                              d="M19 12a1 1 0 10-2 0 5 5 0 11-10 0 1 1 0 10-2 0 7 7 0 006 6.92V22a1 1 0 102 0v-3.08A7 7 0 0019 12z"
                              fill="currentColor"
                            />
                          </svg>
                        </>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M12 15c1.657 0 3-1.343 3-3V6a3 3 0 10-6 0v6c0 1.657 1.343 3 3 3z"
                            fill="currentColor"
                          />
                          <path
                            d="M19 12a1 1 0 10-2 0 5 5 0 11-10 0 1 1 0 10-2 0 7 7 0 006 6.92V22a1 1 0 102 0v-3.08A7 7 0 0019 12z"
                            fill="currentColor"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    {loading ? (
                      <button
                        type="button"
                        onClick={handleCancelGeneration}
                        className="inline-flex items-center justify-center rounded-md border border-rose-400/50 bg-rose-500/20 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.24em] text-rose-100 transition hover:bg-rose-500/30"
                      >
                        Detener
                      </button>
                    ) : null}
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.24em] text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={loading}
                    >
                      {loading ? "Generando..." : "Generar reporte"}
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex justify-end sm:hidden">
                  {isRecording ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-100">
                      <span className="h-2 w-2 rounded-full bg-rose-200" />
                      Grabando...
                    </span>
                  ) : isProcessingRecording ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-white/60" />
                      Transcribiendo...
                    </span>
                  ) : recordedTranscriptRef.current ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100">
                      <span className="h-2 w-2 rounded-full bg-emerald-300" />
                      Dictado listo
                    </span>
                  ) : null}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


