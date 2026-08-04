import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../constants/config";

const SESSION_TOKEN_KEY = "lockedin_session_token";
const REQUEST_TIMEOUT_MS = 10_000;

// ─── Token management ─────────────────────────────────────────────────────────

export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function storeToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { skipAuth = false, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string> | undefined),
  };

  if (!skipAuth) {
    const token = await getStoredToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    // On 401: the stored token is expired. The caller (AuthProvider) handles refresh.
    if (!response.ok) {
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      throw new ApiError(
        response.status,
        body,
        `API ${path} failed with ${response.status}`,
      );
    }

    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string, options?: ApiOptions) =>
    apiRequest<T>(path, { method: "GET", ...options }),

  post: <T>(path: string, body: unknown, options?: ApiOptions) =>
    apiRequest<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
      ...options,
    }),

  patch: <T>(path: string, body: unknown, options?: ApiOptions) =>
    apiRequest<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
      ...options,
    }),

  delete: <T>(path: string, options?: ApiOptions) =>
    apiRequest<T>(path, { method: "DELETE", ...options }),
};
