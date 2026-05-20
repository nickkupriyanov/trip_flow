import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { ReminderStatus, TravelRequestStatus } from "@/lib/api";
import {
  reminderStatusLabels,
  travelRequestStatusLabels
} from "@/lib/domain";

export { reminderStatusLabels, travelRequestStatusLabels };

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
