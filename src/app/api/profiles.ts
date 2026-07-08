import type { ElderlyProfile, NurseProfile } from "../admin/data";

type ProfilesResponse = {
  elderly: ElderlyProfile[];
  nurses: NurseProfile[];
  nurseElderlyAssignments?: NurseElderlyAssignment[];
};

export type NurseElderlyAssignment = {
  nurseId: string | number;
  elderlyId: string | number;
};

export type NewProfilePayload = {
  type: "elderly" | "nurse";
  name: string;
  age: string;
  gender: string;
  phone: string;
  avatar: string;
  email: string;
  birthdate: string;
  address: string;
  medicalCondition: string;
  bloodType: string;
  allergies: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyAddress: string;
  elderlyStatus: string;
  enrollDate: string;
  doctorName: string;
  admissionDate: string;
  username: string;
  password: string;
  confirmPassword: string;
  position: string;
  workArea: string;
  hireDate: string;
  nurseStatus: string;
  licenseNumber: string;
  shiftSchedule: string;
};

export type ValidationErrors = Record<string, string>;

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

  return response.json();
}

export function getProfiles() {
  return request<ProfilesResponse>("/api/profiles");
}

export function createElderlyProfile(profile: NewProfilePayload) {
  return request<ElderlyProfile>("/api/elderly", {
    method: "POST",
    body: JSON.stringify(profile),
  });
}

export function updateElderlyProfile(profile: ElderlyProfile) {
  return request<ElderlyProfile>(`/api/elderly/${profile.id}`, {
    method: "PUT",
    body: JSON.stringify(profile),
  });
}

export function deleteElderlyProfile(id: string) {
  return request<void>(`/api/elderly/${id}`, {
    method: "DELETE",
  });
}

export function createNurseProfile(profile: NewProfilePayload) {
  return request<NurseProfile>("/api/nurses", {
    method: "POST",
    body: JSON.stringify(profile),
  });
}

export function updateNurseProfile(profile: NurseProfile) {
  return request<NurseProfile>(`/api/nurses/${profile.id}`, {
    method: "PUT",
    body: JSON.stringify(profile),
  });
}

export function deleteNurseProfile(id: string) {
  return request<void>(`/api/nurses/${id}`, {
    method: "DELETE",
  });
}

export function updateNurseElderlyAssignments(nurseId: string, elderlyIds: string[]) {
  return request<{ assignments: NurseElderlyAssignment[] }>(`/api/nurses/${nurseId}/elderly-assignments`, {
    method: "PUT",
    body: JSON.stringify({ elderlyIds }),
  });
}

export function searchElderlyProfiles(name: string) {
  return request<{ elderly: ElderlyProfile[] }>(`/api/elderly/search?name=${encodeURIComponent(name)}`);
}
