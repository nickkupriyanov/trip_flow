import type { ReminderStatus, TravelRequestStatus } from "@/lib/api";

export const travelRequestStatuses: TravelRequestStatus[] = [
  "new",
  "clarifying",
  "searching",
  "sent",
  "thinking",
  "booked",
  "rejected"
];

export const inProgressTravelRequestStatuses: TravelRequestStatus[] = [
  "clarifying",
  "searching",
  "sent",
  "thinking"
];

export const reminderStatusLabels: Record<ReminderStatus, string> = {
  active: "Активно",
  done: "Готово"
};

export const travelRequestStatusLabels: Record<TravelRequestStatus, string> = {
  new: "Новая",
  clarifying: "Уточнение",
  searching: "Подбор",
  sent: "Отправлено",
  thinking: "Клиент думает",
  booked: "Бронь",
  rejected: "Отказ"
};
