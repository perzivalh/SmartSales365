import { api } from "./client";
import type { AuditLogRecord, PaginatedResponse } from "../types/api";

export type AuditLogQuery = {
  page?: number;
  event_type?: string;
  search?: string;
};

export async function getAuditLogs(query: AuditLogQuery = {}): Promise<PaginatedResponse<AuditLogRecord>> {
  const response = await api.get<PaginatedResponse<AuditLogRecord>>("/audit-logs/", {
    params: {
      page: query.page,
      event_type: query.event_type,
      search: query.search,
    },
  });
  return response.data;
}
