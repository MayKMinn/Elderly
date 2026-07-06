export type SchedulePayload = {
  nurseId: string;
  nurseName?: string;
  elderlyId: string;
  elderlyName?: string;
  elderlyAvatar?: string;
  visitTime: string;
  visitDate: string;
  purpose: string;
  scheduleStatus: string;
  recurringGroupId?: string | null;
  recurringSequence?: number | null;
};

export type ScheduleAssignment = SchedulePayload & {
  id: number;
  nurseName: string;
  nurseAvatar: string;
  elderlyName: string;
  elderlyAvatar: string;
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text;

    try {
      const data = JSON.parse(text);
      const errors = data.errors ? Object.values(data.errors).filter(Boolean) : [];
      message = errors.length > 0 ? String(errors[0]) : data.error || data.details || text;
    } catch {
      message = text;
    }

    throw new Error(message || `Request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : (undefined as T);
}

export function getSchedules() {
  return request<{ schedules: ScheduleAssignment[] }>("/api/schedules");
}

export function createSchedule(payload: SchedulePayload) {
  return request<ScheduleAssignment>("/api/schedules", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateSchedule(id: number, payload: SchedulePayload, options?: { group?: boolean; stopRecurring?: boolean }) {
  const params = new URLSearchParams();
  if (options?.group) params.set("group", "true");
  if (options?.stopRecurring) params.set("stopRecurring", "true");
  const query = params.toString() ? `?${params.toString()}` : "";
  return request<ScheduleAssignment | { schedules: ScheduleAssignment[] }>(`/api/schedules/${id}${query}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function updateScheduleStatus(id: number, scheduleStatus: string) {
  return request<ScheduleAssignment>(`/api/schedules/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ scheduleStatus }),
  });
}

export function deleteSchedule(id: number, options?: { group?: boolean }) {
  const query = options?.group ? "?group=true" : "";
  return request<void>(`/api/schedules/${id}${query}`, {
    method: "DELETE",
  });
}
