export type MedicationAssignmentPayload = {
  scheduleId?: number | null;
  medicationId?: number | null;
  nurseId?: string;
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

export type ElderlyMedicationPayload = {
  elderlyId: string;
  elderlyName: string;
  medicationName: string;
  dosage: string;
  instructions: string;
  notes: string;
  status: "Active" | "Inactive";
};

export type ElderlyMedication = ElderlyMedicationPayload & {
  id: number;
  createdAt: string;
  updatedAt: string;
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

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : (undefined as T);
}

function normalizeElderlyMedication(medication: ElderlyMedication): ElderlyMedication {
  return {
    ...medication,
    status: String(medication.status).toLowerCase() === "inactive" ? "Inactive" : "Active",
  };
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

export function getElderlyMedications(elderlyId?: string) {
  const query = elderlyId ? `?elderlyId=${encodeURIComponent(elderlyId)}` : "";
  return request<{ medications: ElderlyMedication[] }>(`/api/elderly-medications${query}`)
    .then((response) => ({
      medications: response.medications.map(normalizeElderlyMedication),
    }));
}

export function createElderlyMedication(payload: ElderlyMedicationPayload) {
  return request<ElderlyMedication>("/api/elderly-medications", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(normalizeElderlyMedication);
}

export function updateElderlyMedication(id: number, payload: ElderlyMedicationPayload) {
  return request<ElderlyMedication>(`/api/elderly-medications/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }).then(normalizeElderlyMedication);
}

export function deleteElderlyMedication(id: number) {
  return request<void>(`/api/elderly-medications/${id}`, {
    method: "DELETE",
  });
}
