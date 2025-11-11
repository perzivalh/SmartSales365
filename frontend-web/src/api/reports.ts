import { api } from "./client";

import type { DynamicReportResponse } from "../types/api";

type GenerateReportPayload = {
  prompt: string;
  limit?: number;
  exportFormat?: "pdf" | "xlsx";
  signal?: AbortSignal;
  timeoutMs?: number;
};

export async function generateDynamicReport({
  prompt,
  limit,
  exportFormat,
  signal,
  timeoutMs,
}: GenerateReportPayload): Promise<DynamicReportResponse> {
  const response = await api.post<DynamicReportResponse>(
    "/reportes/dinamicos/",
    {
      prompt_de_usuario: prompt,
      limite_filas: limit,
      export_format: exportFormat,
    },
    {
      signal,
      timeout: timeoutMs ?? 60000,
    },
  );
  return response.data;
}

export async function transcribeReportAudio(audio: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("audio", audio, "consulta.webm");

  const response = await api.post<{ transcripcion: string }>("/reportes/transcribir/", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    timeout: 120000,
  });
  return response.data.transcripcion;
}
