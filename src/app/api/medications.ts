export type MedicationAssignmentPayload = {
  elderlyId: string;
  elderlyName: string;
  nurseName: string;
  medicationName: string;
  dosage: string;
  instructions: string;
  scheduledTime: string;
  scheduledDate: string;
  complianceStatus: string;
  notes: string;
};

export type MedicationAssignment = MedicationAssignmentPayload & {
  id: number;
  createdAt: string;
  reportNotes?: string | null;
  reportedAt?: string | null;
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return response.json();
}

export function createMedicationAssignment(payload: MedicationAssignmentPayload) {
  return request<MedicationAssignment>("/api/medications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMedicationAssignments(nurseName?: string) {
  const query = nurseName ? `?nurseName=${encodeURIComponent(nurseName)}` : "";
  return request<{ medications: MedicationAssignment[] }>(`/api/medications${query}`);
}

export function updateMedicationAssignmentStatus(id: number, complianceStatus: string, notes?: string) {
  return request<MedicationAssignment>(`/api/medications/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ complianceStatus, notes }),
  });
}
