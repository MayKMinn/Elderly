export type AdminSession = {
  role: "admin";
  id: number;
  username: string;
  name: string;
  email: string | null;
  loginHistoryId: number;
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

export function signOutAdmin(loginHistoryId: number | undefined, username: string | undefined) {
  return request<{ ok: boolean }>("/api/auth/admin-logout", {
    method: "POST",
    body: JSON.stringify({ loginHistoryId, username }),
  });
}
