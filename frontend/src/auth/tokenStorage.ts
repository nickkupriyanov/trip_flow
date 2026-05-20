const AUTH_TOKEN_KEY = "tripflow_access_token:v1";
const LEGACY_AUTH_TOKEN_KEY = "tripflow_access_token";

export function readStoredToken(): string | null {
  try {
    return (
      window.localStorage.getItem(AUTH_TOKEN_KEY) ??
      window.localStorage.getItem(LEGACY_AUTH_TOKEN_KEY)
    );
  } catch {
    return null;
  }
}

export function saveStoredToken(token: string): void {
  try {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    window.localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
  } catch {
    // Auth still works for the current tab through React state.
  }
}

export function clearStoredToken(): void {
  try {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
  } catch {
    // Storage may be unavailable in private browsing or locked-down contexts.
  }
}
