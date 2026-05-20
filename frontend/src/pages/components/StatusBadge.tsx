import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { ReminderStatus, TravelRequestStatus } from "@/lib/api";

export const travelRequestStatusLabels: Record<TravelRequestStatus, string> = {
  new: "Новая",
  clarifying: "Уточнение",
  searching: "Подбор",
  sent: "Отправлено",
  thinking: "Клиент думает",
  booked: "Бронь",
  rejected: "Отказ"
};

const travelRequestStatusVariants: Record<
  TravelRequestStatus,
  BadgeProps["variant"]
> = {
  new: "sky",
  clarifying: "amber",
  searching: "teal",
  sent: "indigo",
  thinking: "violet",
  booked: "emerald",
  rejected: "rose"
};

export const reminderStatusLabels: Record<ReminderStatus, string> = {
  active: "Активно",
  done: "Готово"
};

export function TravelRequestStatusBadge({
  status
}: {
  status: TravelRequestStatus;
}) {
  return (
    <Badge variant={travelRequestStatusVariants[status]}>
      {travelRequestStatusLabels[status]}
    </Badge>
  );
}

export function ReminderStatusBadge({ status }: { status: ReminderStatus }) {
  return (
    <Badge variant={status === "done" ? "emerald" : "sky"}>
      {reminderStatusLabels[status]}
    </Badge>
  );
}
