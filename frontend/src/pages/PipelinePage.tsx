import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";

import { useAuth } from "@/auth/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  ApiError,
  fetchPipeline,
  updateTravelRequestStatus,
  type PipelineTravelRequest,
  type TravelRequestStatus
} from "@/lib/api";
import { EmptyState } from "@/pages/components/EmptyState";
import { ErrorState, LoadingState } from "@/pages/components/Feedback";
import { PageHeader } from "@/pages/components/PageHeader";
import {
  TravelRequestStatusBadge,
  travelRequestStatusLabels
} from "@/pages/components/StatusBadge";

const statuses: TravelRequestStatus[] = [
  "new",
  "clarifying",
  "searching",
  "sent",
  "thinking",
  "booked",
  "rejected"
];

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return "Не удалось выполнить действие. Попробуйте ещё раз.";
}

export function PipelinePage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);

  const pipelineQuery = useQuery({
    queryKey: ["pipeline"],
    queryFn: () => fetchPipeline(token!),
    enabled: Boolean(token)
  });

  const statusMutation = useMutation({
    mutationFn: ({
      requestId,
      status
    }: {
      requestId: string;
      status: TravelRequestStatus;
    }) => updateTravelRequestStatus(token!, requestId, { status }),
    onSuccess: async (request) => {
      setMutationError(null);
      await queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      await queryClient.invalidateQueries({ queryKey: ["travel-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["travel-request", request.id] });
      await queryClient.invalidateQueries({ queryKey: ["client-requests"] });
    },
    onError: (error) => setMutationError(getErrorMessage(error))
  });

  const pipeline = pipelineQuery.data;
  const totalRequests =
    pipeline === undefined
      ? 0
      : statuses.reduce((total, status) => total + pipeline[status].length, 0);

  function handleStatusChange(
    request: PipelineTravelRequest,
    status: TravelRequestStatus,
  ) {
    if (status === request.status) {
      return;
    }
    statusMutation.mutate({ requestId: request.id, status });
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader
          title="Pipeline"
          description="Ежедневная доска заявок: от первого уточнения до брони или отказа."
        />
        <Card className="px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            Активных заявок
          </p>
          <p className="mt-1 text-2xl font-semibold">{totalRequests}</p>
        </Card>
      </div>

      {mutationError ? (
        <ErrorState message={mutationError} />
      ) : null}

      {pipelineQuery.isLoading ? (
        <LoadingState text="Загружаем pipeline..." />
      ) : null}

      {pipelineQuery.isError ? (
        <ErrorState message={getErrorMessage(pipelineQuery.error)} />
      ) : null}

      {!pipelineQuery.isLoading && !pipelineQuery.isError && totalRequests === 0 ? (
        <EmptyState
          title="В pipeline пока нет заявок"
          description="Создайте заявку в карточке клиента, и она появится в колонке «Новая»."
        />
      ) : null}

      {pipeline ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          {statuses.map((status) => (
            <PipelineColumn
              key={status}
              isUpdating={statusMutation.isPending}
              requests={pipeline[status]}
              status={status}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function PipelineColumn({
  isUpdating,
  requests,
  status,
  onStatusChange
}: {
  isUpdating: boolean;
  requests: PipelineTravelRequest[];
  status: TravelRequestStatus;
  onStatusChange: (
    request: PipelineTravelRequest,
    status: TravelRequestStatus,
  ) => void;
}) {
  return (
    <Card className="min-h-52 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <TravelRequestStatusBadge status={status} />
        <Badge variant="secondary">{requests.length}</Badge>
      </div>

      {requests.length === 0 ? (
        <p className="rounded-md border border-dashed bg-background px-3 py-4 text-sm leading-6 text-muted-foreground">
          Нет заявок в этом статусе.
        </p>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <PipelineCard
              key={request.id}
              isUpdating={isUpdating}
              request={request}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function PipelineCard({
  isUpdating,
  request,
  onStatusChange
}: {
  isUpdating: boolean;
  request: PipelineTravelRequest;
  onStatusChange: (
    request: PipelineTravelRequest,
    status: TravelRequestStatus,
  ) => void;
}) {
  return (
    <Card className="bg-background transition hover:border-primary/40 hover:bg-muted/30">
      <CardContent className="p-3">
      <Link className="block" to={`/requests/${request.id}`}>
        <p className="text-xs font-medium text-muted-foreground">
          {request.clientFullName}
        </p>
        <h3 className="mt-1 text-sm font-semibold leading-5 text-foreground">
          {request.destination || "Заявка без направления"}
        </h3>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {formatMeta(request)}
        </p>
      </Link>

      {request.wishes ? (
        <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted-foreground">
          {request.wishes}
        </p>
      ) : null}

      <label className="mt-3 block space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Статус</span>
        <Select
          disabled={isUpdating}
          value={request.status}
          onValueChange={(value) =>
            onStatusChange(request, value as TravelRequestStatus)
          }
        >
          <SelectTrigger className="h-9 bg-card text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((status) => (
              <SelectItem key={status} value={status}>
                {travelRequestStatusLabels[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      </CardContent>
    </Card>
  );
}

function formatMeta(request: PipelineTravelRequest): string {
  const parts = [
    request.departureCity,
    formatRange(request.dateFrom, request.dateTo),
    formatBudget(request.budgetMin, request.budgetMax)
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Параметры ещё не заполнены";
}

function formatRange(from: string | null, to: string | null): string | null {
  if (from && to) {
    return `${from} - ${to}`;
  }
  return from ?? to;
}

function formatBudget(min: number | null, max: number | null): string | null {
  if (min && max) {
    return `${min} - ${max}`;
  }
  return min?.toString() ?? max?.toString() ?? null;
}
