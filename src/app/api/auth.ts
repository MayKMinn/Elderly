export type AdminSession = {
  role: "admin";
  id: number;
  username: string;
  name: string;
  email: string | null;
  avatar?: string;
  loginHistoryId: number;
};

export type AdminProfile = {
  id: number;
  username: string;
  name: string;
  email: string | null;
  avatar: string;
  status: string;
  licenseNumber?: string;
  position?: string;
  avatar?: string;
};

export type AdminLoginHistoryItem = {
  id: number;
  adminId: number;
  username: string;
  name: string;
  signedInAt: string;
  signedOutAt: string | null;
};

type AdminLoginHistoryResponse = {
  history: AdminLoginHistoryItem[];
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

export function signInAdmin(login: string, password: string) {
  return request<AdminSession>("/api/auth/admin-login", {
    method: "POST",
    body: JSON.stringify({ login, password }),
  });
}

export function getAdminLoginHistory() {
  return request<AdminLoginHistoryResponse>("/api/admin/login-history");
}

export function getAdminProfile(username: string) {
  return request<AdminProfile>(`/api/admin/profile?username=${encodeURIComponent(username)}`);
}

export function updateAdminAvatar(id: number, avatar: string) {
  return request<AdminProfile>(`/api/admin/profile/${id}/avatar`, {
    method: "PUT",
    body: JSON.stringify({ avatar }),
  });
}

export function signOutAdmin(loginHistoryId: number | undefined, username: string | undefined) {
  return request<{ ok: boolean }>("/api/auth/admin-logout", {
    method: "POST",
    body: JSON.stringify({ loginHistoryId, username }),
  });
}

export function signInNurse(login: string, password: string) {
  return request<{
    role: "nurse";
    id: number;
    username: string;
    name: string;
    email: string;
    licenseNumber: string;
    position: string;
    avatar: string;
    status: string;
  }>("/api/auth/nurse-login", {
    method: "POST",
    body: JSON.stringify({ login, password }),
  });
}
