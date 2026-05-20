import { ApiError } from "@/lib/api";

export function getApiErrorMessage(
  error: unknown,
  fallback = "Не удалось выполнить действие. Попробуйте ещё раз.",
): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return fallback;
}
