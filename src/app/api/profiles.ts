import type { ElderlyProfile, NurseProfile } from "../admin/data";

type ProfilesResponse = {
  elderly: ElderlyProfile[];
  nurses: NurseProfile[];
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

  return response.json();
}

export function getProfiles() {
  return request<ProfilesResponse>("/api/profiles");
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
