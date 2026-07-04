export type AdminSession = {
  role: "admin";
  id: number;
  username: string;
  name: string;
  email: string | null;
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
