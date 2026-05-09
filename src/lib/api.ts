export interface AuthResponse {
  token: string;
  user: { id: number; username: string; role: string };
}

export interface Progress {
  level: number;
  episodes: number;
  freemode_unlocked: number;
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, options);
  const data = await res.json().catch(() => ({ error: "Network error" }));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Request failed");
  return data as T;
}

export const api = {
  register: (username: string, password: string) =>
    req<AuthResponse>("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    }),

  login: (username: string, password: string) =>
    req<AuthResponse>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    }),

  getProgress: (token: string) =>
    req<Progress>("/progress", {
      headers: { Authorization: `Bearer ${token}` },
    }),

  updateProgress: (token: string, data: Partial<Progress>) =>
    req<Progress>("/progress", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    }),
};
