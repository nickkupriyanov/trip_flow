import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical } from "lucide-react";
import type { CSSProperties } from "react";
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
  fetchPipeline,
  updateTravelRequestStatus,
  type Pipeline,
  type PipelineTravelRequest,
  type TravelRequestStatus
} from "@/lib/api";
import { travelRequestStatuses } from "@/lib/domain";
import { getApiErrorMessage } from "@/lib/errors";
import { formatRequestMeta } from "@/lib/formatters";
import { moveRequestInPipeline } from "@/lib/pipeline";
import { queryKeys } from "@/lib/queryKeys";
import { EmptyState } from "@/pages/components/EmptyState";
import { ErrorState, LoadingState } from "@/pages/components/Feedback";
import { PageHeader } from "@/pages/components/PageHeader";
import {
  TravelRequestStatusBadge,
  travelRequestStatusLabels
} from "@/pages/components/StatusBadge";

export function PipelinePage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);

  const pipelineQuery = useQuery({
    queryKey: queryKeys.pipeline(),
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
    onMutate: async ({ requestId, status }) => {
      setMutationError(null);
      await queryClient.cancelQueries({ queryKey: queryKeys.pipeline() });
      const previousPipeline = queryClient.getQueryData<Pipeline>(
        queryKeys.pipeline(),
      );
      queryClient.setQueryData<Pipeline | undefined>(
        queryKeys.pipeline(),
        (current) => moveRequestInPipeline(current, requestId, status),
      );
      return { previousPipeline };
    },
    onSuccess: async (request) => {
      setMutationError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.pipeline() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.travelRequests() });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.travelRequest(request.id)
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.clientRequests(request.clientId)
      });
    },
    onError: (error, _variables, context) => {
      if (context?.previousPipeline) {
        queryClient.setQueryData(queryKeys.pipeline(), context.previousPipeline);
      }
      setMutationError(getApiErrorMessage(error));
    }
  });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const pipeline = pipelineQuery.data;
  const totalRequests =
    pipeline === undefined
      ? 0
      : travelRequestStatuses.reduce(
          (total, status) => total + pipeline[status].length,
          0,
        );

  function handleStatusChange(
    request: PipelineTravelRequest,
    status: TravelRequestStatus,
  ) {
    if (status === request.status) {
      return;
    }
    statusMutation.mutate({ requestId: request.id, status });
  }

  function handleDragEnd(event: DragEndEvent) {
    const request = event.active.data.current?.request as
      | PipelineTravelRequest
      | undefined;
    const status = event.over?.data.current?.status as
      | TravelRequestStatus
      | undefined;

    if (!request || !status || status === request.status) {
      return;
    }
    handleStatusChange(request, status);
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
        <ErrorState message={getApiErrorMessage(pipelineQuery.error)} />
      ) : null}

      {!pipelineQuery.isLoading && !pipelineQuery.isError && totalRequests === 0 ? (
        <EmptyState
          title="В pipeline пока нет заявок"
          description="Создайте заявку в карточке клиента, и она появится в колонке «Новая»."
        />
      ) : null}

      {pipeline ? (
        <DndContext
          collisionDetection={closestCenter}
          sensors={sensors}
          onDragEnd={handleDragEnd}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
            {travelRequestStatuses.map((status) => (
              <PipelineColumn
                key={status}
                isUpdating={statusMutation.isPending}
                requests={pipeline[status]}
                status={status}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </DndContext>
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
  const { isOver, setNodeRef } = useDroppable({
    id: `pipeline-status-${status}`,
    data: { type: "travel-request-status", status }
  });

  return (
    <Card
      ref={setNodeRef}
      className={`min-h-52 p-3 transition ${
        isOver ? "border-primary bg-primary/5" : ""
      }`}
    >
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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging
  } = useDraggable({
    id: request.id,
    data: { type: "travel-request", request },
    disabled: isUpdating
  });
  const style: CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined
  };

  return (
    <Card
      ref={setNodeRef}
      className={`bg-background transition-colors hover:border-primary/40 hover:bg-muted/30 ${
        isDragging ? "relative z-20 opacity-80 shadow-md" : ""
      }`}
      style={style}
    >
      <CardContent className="p-3">
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          aria-label="Перетащить заявку"
          className="mt-0.5 inline-flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-md border bg-card text-muted-foreground transition hover:border-primary/40 hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isUpdating}
          type="button"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Link className="min-w-0 flex-1" to={`/requests/${request.id}`}>
          <p className="text-xs font-medium text-muted-foreground">
            {request.clientFullName}
          </p>
          <h3 className="mt-1 text-sm font-semibold leading-5 text-foreground">
            {request.destination || "Заявка без направления"}
          </h3>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {formatRequestMeta(request)}
          </p>
        </Link>
      </div>

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
            {travelRequestStatuses.map((status) => (
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
