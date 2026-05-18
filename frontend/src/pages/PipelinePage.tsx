import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";

import { useAuth } from "@/auth/AuthContext";
import {
  ApiError,
  fetchPipeline,
  updateTravelRequestStatus,
  type PipelineTravelRequest,
  type TravelRequestStatus
} from "@/lib/api";
import { EmptyState } from "@/pages/components/EmptyState";
import { PageHeader } from "@/pages/components/PageHeader";

const statuses: Array<{ value: TravelRequestStatus; label: string; tone: string }> = [
  { value: "new", label: "Новая", tone: "border-sky-200 bg-sky-50 text-sky-800" },
  {
    value: "clarifying",
    label: "Уточнение",
    tone: "border-amber-200 bg-amber-50 text-amber-800"
  },
  {
    value: "searching",
    label: "Подбор",
    tone: "border-teal-200 bg-teal-50 text-teal-800"
  },
  {
    value: "sent",
    label: "Отправлено",
    tone: "border-indigo-200 bg-indigo-50 text-indigo-800"
  },
  {
    value: "thinking",
    label: "Клиент думает",
    tone: "border-violet-200 bg-violet-50 text-violet-800"
  },
  {
    value: "booked",
    label: "Бронь",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800"
  },
  {
    value: "rejected",
    label: "Отказ",
    tone: "border-rose-200 bg-rose-50 text-rose-800"
  }
];

const statusLabels = Object.fromEntries(
  statuses.map((status) => [status.value, status.label]),
) as Record<TravelRequestStatus, string>;

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
      : statuses.reduce((total, status) => total + pipeline[status.value].length, 0);

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
        <div className="rounded-lg border bg-card px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            Активных заявок
          </p>
          <p className="mt-1 text-2xl font-semibold">{totalRequests}</p>
        </div>
      </div>

      {mutationError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {mutationError}
        </div>
      ) : null}

      {pipelineQuery.isLoading ? (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground shadow-sm">
          Загружаем pipeline...
        </div>
      ) : null}

      {pipelineQuery.isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
          {getErrorMessage(pipelineQuery.error)}
        </div>
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
              key={status.value}
              isUpdating={statusMutation.isPending}
              requests={pipeline[status.value]}
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
  status: { value: TravelRequestStatus; label: string; tone: string };
  onStatusChange: (
    request: PipelineTravelRequest,
    status: TravelRequestStatus,
  ) => void;
}) {
  return (
    <section className="min-h-52 rounded-lg border bg-card p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${status.tone}`}
        >
          {status.label}
        </h2>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
          {requests.length}
        </span>
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
    </section>
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
    <article className="rounded-lg border bg-background p-3 transition hover:border-primary/40 hover:bg-muted/30">
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
        <select
          className="w-full rounded-md border bg-card px-2.5 py-2 text-xs outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isUpdating}
          value={request.status}
          onChange={(event) =>
            onStatusChange(request, event.target.value as TravelRequestStatus)
          }
        >
          {statuses.map((status) => (
            <option key={status.value} value={status.value}>
              {statusLabels[status.value]}
            </option>
          ))}
        </select>
      </label>
    </article>
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
