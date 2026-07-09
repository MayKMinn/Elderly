type HealthLogPayload = {
  nurseId: string | number;
  elderlyId: string | number;
  scheduleId?: number | null;
  systolic?: number | null;
  diastolic?: number | null;
  bloodSugar?: number | null;
  notes?: string;
  purpose?: string;
  complianceStatus?: string;
  medicationName?: string;
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return text ? JSON.parse(text) : (undefined as T);
}

export function createHealthLog(payload: HealthLogPayload) {
  return request<any>("/api/health", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type { HealthLogPayload };

export async function fetchHealthLogs(params: { nurseId?: number | string; elderlyId?: number | string; scheduleId?: number | string; limit?: number } = {}) {
  const qs = new URLSearchParams();
  // allow scheduleId override
  if (typeof (params as any).scheduleId !== "undefined" && (params as any).scheduleId !== null) {
    qs.set("scheduleId", String((params as any).scheduleId));
  }
  if (params.nurseId) qs.set("nurseId", String(params.nurseId));
  if (params.elderlyId) qs.set("elderlyId", String(params.elderlyId));
  if (params.limit) qs.set("limit", String(params.limit));
  const url = `/api/health/logs?${qs.toString()}`;
  return request<{ logs: any[] }>(url, { method: "GET" });
}
