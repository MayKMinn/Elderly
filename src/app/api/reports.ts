import type { ElderlyProfile } from "../admin/data";
import type { MedicationAssignment } from "./medications";

export type ElderlyVital = {
  id: number;
  vitalType?: "Blood Pressure" | "Blood Glucose";
  scheduleId?: number | null;
  nurseId?: string | null;
  elderlyId: string;
  elderlyName: string;
  recordedDate: string;
  recordedTime: string;
  systolic?: number | null;
  diastolic?: number | null;
  glucoseValue?: number | null;
  notes?: string | null;
};

export type ElderlyReportSummary = {
  elderly: ElderlyProfile;
  range: {
    startDate: string;
    endDate: string;
  };
  bloodPressure: {
    averageSystolic: number | null;
    averageDiastolic: number | null;
    readings: number;
    status: string;
  };
  bloodGlucose: {
    average: number | null;
    readings: number;
    status: string;
  };
  medication: {
    total: number;
    taken: number;
    missed: number;
    pending: number;
    dueSoon: number;
    compliancePercent: number | null;
  };
  note: string;
  vitals: ElderlyVital[];
  medications: MedicationAssignment[];
};

async function request<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return response.json();
}

export function getElderlyReportSummary(elderlyId: string, startDate: string, endDate: string) {
  const params = new URLSearchParams({ elderlyId, startDate, endDate });
  return request<ElderlyReportSummary>(`/api/reports/elderly-summary?${params.toString()}`);
}
