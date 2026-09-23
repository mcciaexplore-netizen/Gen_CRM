const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

function errorMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "Something went wrong";
  const message = (payload as { message?: unknown }).message;
  if (Array.isArray(message)) return message.join(". ");
  return typeof message === "string" ? message : "Something went wrong";
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  const payload = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new ApiError(errorMessage(payload), response.status);
  return payload as T;
}

export async function apiDownload(
  path: string,
): Promise<Blob> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(errorMessage(payload), response.status);
  }
  return response.blob();
}
