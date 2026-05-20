import type {
  PipelineTravelRequest,
  TourOption,
  TravelRequest
} from "@/lib/api";

const ruDateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

const ruShortDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short"
});

const ruTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit",
  minute: "2-digit"
});

export function formatRange(
  from: number | string | null,
  to: number | string | null,
): string | null {
  if (from && to) {
    return `${from} - ${to}`;
  }
  return from?.toString() ?? to?.toString() ?? null;
}

export function formatBudget(
  min: number | null,
  max: number | null,
): string | null {
  return formatRange(min, max);
}

export function formatDateTime(value: string): string {
  return ruDateTimeFormatter.format(new Date(value));
}

export function formatShortDate(value: string): string {
  return ruShortDateFormatter.format(new Date(value));
}

export function formatTime(value: string): string {
  return ruTimeFormatter.format(new Date(value));
}

export function formatTourists(request: TravelRequest): string {
  return `${request.adults} взрослых, ${request.children} детей`;
}

export function formatRequestMeta(
  request: PipelineTravelRequest | TravelRequest,
  fallback = "Параметры ещё не заполнены",
): string {
  const parts = [
    request.departureCity,
    formatRange(request.dateFrom, request.dateTo),
    formatBudget(request.budgetMin, request.budgetMax)
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : fallback;
}

export function formatHotel(option: TourOption): string | null {
  if (!option.hotelName && !option.hotelStars) {
    return null;
  }
  return [option.hotelName, option.hotelStars ? `${option.hotelStars}*` : null]
    .filter(Boolean)
    .join(" ");
}

export function formatPlace(option: TourOption): string | null {
  const parts = [option.country, option.resort].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

export function formatPrice(option: TourOption): string | null {
  return option.price === null ? null : `${option.price} ${option.currency}`;
}

export function formatTourOptionMeta(option: TourOption): string {
  const parts = [
    formatPlace(option),
    formatHotel(option),
    option.mealType,
    formatPrice(option)
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Детали варианта ещё не заполнены";
}

export function startOfToday(): Date {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  return value;
}

export function startOfTomorrow(): Date {
  const value = startOfToday();
  value.setDate(value.getDate() + 1);
  return value;
}

export function toInputDateTime(value: Date): string {
  const offset = value.getTimezoneOffset();
  const local = new Date(value.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function toApiDateTime(value: string): string {
  return new Date(value).toISOString();
}
