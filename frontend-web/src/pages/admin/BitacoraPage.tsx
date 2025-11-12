import { useEffect, useMemo, useState } from "react";

import { getAuditLogs, type AuditLogQuery } from "../../api/auditLogs";
import type { AuditLogEventType, AuditLogRecord } from "../../types/api";

const eventLabels: Record<AuditLogEventType, string> = {
  LOGIN: "Inicio de sesion",
  LOGOUT: "Cierre de sesion",
  CREATE: "Creacion",
  UPDATE: "Actualizacion",
  DELETE: "Eliminacion",
  SYSTEM_ERROR: "Error de sistema",
  ACTION: "Accion",
};

const eventOptions: Array<{ value: AuditLogEventType | "all"; label: string }> = [
  { value: "all", label: "Todos los eventos" },
  { value: "LOGIN", label: "Inicios de sesion" },
  { value: "LOGOUT", label: "Cierres de sesion" },
  { value: "CREATE", label: "Creaciones" },
  { value: "UPDATE", label: "Actualizaciones" },
  { value: "DELETE", label: "Eliminaciones" },
  { value: "SYSTEM_ERROR", label: "Errores del sistema" },
  { value: "ACTION", label: "Otras acciones" },
];

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatMetadata(metadata: Record<string, unknown>): string {
  const entries = Object.entries(metadata ?? {});
  if (entries.length === 0) {
    return "—";
  }
  return entries
    .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
    .join(" | ");
}

export function BitacoraPage() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [eventFilter, setEventFilter] = useState<AuditLogEventType | "all">("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  const activeFilters = useMemo(
    () => ({
      event_type: eventFilter !== "all" ? eventFilter : undefined,
      search: search.trim() || undefined,
    }),
    [eventFilter, search],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadLogs(query: AuditLogQuery) {
      setLoading(true);
      setError(null);
      try {
        const response = await getAuditLogs(query);
        if (cancelled) {
          return;
        }
        setLogs(response.results);
        setTotal(response.count);
        setHasNext(Boolean(response.next));
        setHasPrev(Boolean(response.previous));
      } catch (fetchError) {
        console.error(fetchError);
        if (!cancelled) {
          setError("No se pudo cargar la bitacora.");
          setLogs([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadLogs({
      page,
      event_type: activeFilters.event_type,
      search: activeFilters.search,
    });

    return () => {
      cancelled = true;
    };
  }, [page, activeFilters.event_type, activeFilters.search]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const resetFilters = () => {
    setEventFilter("all");
    setSearch("");
    setSearchInput("");
    setPage(1);
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-white">Bitacora de eventos</h1>
      </header>

      <form className="grid gap-4 px-[10px] md:grid-cols-[minmax(0,1fr)_180px_160px]" onSubmit={handleSearchSubmit}>
        <div className="flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-2">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M15.5 14h-.79l-.28-.27A6.473 6.473 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.02 14 5 11.98 5 9.5S7.02 5 9.5 5 14 7.02 14 9.5 11.98 14 9.5 14z"
            />
          </svg>
          <input
            className="w-full border-none bg-transparent text-sm text-white outline-none placeholder:text-white/50"
            placeholder="Buscar por descripcion, entidad o usuario"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
        <select
          className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40"
          value={eventFilter}
          onChange={(event) => {
            setEventFilter(event.target.value as AuditLogEventType | "all");
            setPage(1);
          }}
        >
          {eventOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white transition hover:bg-primary/90 disabled:opacity-70"
            disabled={loading}
            aria-label="Buscar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M15.5 14h-.79l-.28-.27A6.473 6.473 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28.79.79 5 4.99L20.49 19zM9.5 14a4.5 4.5 0 110-9 4.5 4.5 0 010 9z"
              />
            </svg>
          </button>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:border-white/40 hover:text-white"
            onClick={resetFilters}
            aria-label="Limpiar filtros"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M18.3 5.71a1 1 0 00-1.41 0L12 10.59 7.11 5.7a1 1 0 10-1.41 1.41L10.59 12l-4.9 4.89a1 1 0 101.41 1.42L12 13.41l4.89 4.9a1 1 0 001.42-1.41L13.41 12l4.9-4.89a1 1 0 000-1.4z"
              />
            </svg>
          </button>
        </div>
      </form>

      <div className="flex flex-col gap-4 px-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-white/60">
            <span>
              Registros encontrados:{" "}
              <span className="font-semibold text-primary">{total.toLocaleString("es-ES")}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-full border border-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={!hasPrev || loading || page === 1}
              >
                Anterior
              </button>
              <span className="text-xs uppercase tracking-[0.3em] text-white/50">Pagina {page}</span>
              <button
                type="button"
                className="rounded-full border border-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => setPage((current) => current + 1)}
                disabled={!hasNext || loading}
              >
                Siguiente
              </button>
            </div>
          </div>

          {error ? (
            <div className="rounded-3xl border border-red-500/40 bg-red-500/15 px-6 py-10 text-center text-sm font-semibold uppercase tracking-[0.28em] text-red-100">
              {error}
            </div>
          ) : loading && logs.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-10 text-center text-sm font-semibold uppercase tracking-[0.3em] text-white/60">
              Cargando bitacora...
            </div>
          ) : logs.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-10 text-center text-sm font-semibold uppercase tracking-[0.3em] text-white/60">
              No hay eventos registrados con los filtros actuales.
            </div>
          ) : (
            <div className="max-h-[55vh] overflow-y-auto overflow-x-auto thin-scrollbar">
              <table className="min-w-[760px] text-sm text-white/85">
                <thead className="sticky top-0 z-10 bg-[#06152b]/90 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/50 backdrop-blur">
                  <tr>
                    <th className="px-5 py-3 text-left">Fecha</th>
                    <th className="px-5 py-3 text-left">Usuario</th>
                    <th className="px-5 py-3 text-left">Evento</th>
                    <th className="px-5 py-3 text-left">Descripcion</th>
                    <th className="px-5 py-3 text-left">Metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-white/5 last:border-transparent transition hover:bg-white/5">
                      <td className="px-5 py-4 text-xs font-medium text-white">
                        {dateFormatter.format(new Date(log.created_at))}
                        {log.request_ip ? (
                          <span className="mt-1 block text-[10px] uppercase tracking-[0.35em] text-white/40">
                            {log.request_ip}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-semibold text-white">{log.actor_name ?? "Sistema"}</div>
                        <div className="text-xs text-white/45">{log.actor_email ?? "Sin correo"}</div>
                      </td>
                    <td className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/60">
                      {eventLabels[log.event_type]}
                    </td>
                    <td className="px-5 py-4 text-sm text-white/85">
                      {log.description || "—"}
                      {log.entity_type || log.entity_id ? (
                        <span className="mt-2 block text-[10px] uppercase tracking-[0.35em] text-white/35">
                          {log.entity_type ?? "Recurso"} · {log.entity_id ?? "Sin ID"}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-4 text-xs text-white/60">
                      <span
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {formatMetadata(log.metadata)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
}
