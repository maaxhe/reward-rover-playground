export interface Progress {
  level: number;
  episodes: number;
  freemode_unlocked: number;
}

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

async function req<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json().catch(() => ({ error: "Network error" }));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Request failed");
  return data as T;
}

export const api = {
  getProgress: (token: string) => req<Progress>("/progress", token),

  /** Server merges by taking the max of each field, so this can never lower progress. */
  updateProgress: (token: string, data: Partial<Progress>) =>
    req<Progress>("/progress", token, { method: "PUT", body: JSON.stringify(data) }),
};
