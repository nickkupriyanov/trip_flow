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
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "@/auth/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchClients,
  fetchDashboardPreferences,
  fetchPipeline,
  fetchReminders,
  markReminderDone,
  updateDashboardPreferences,
  updateTravelRequestStatus,
  type Client,
  type DashboardPreferences,
  type DashboardWidgetId,
  type Pipeline,
  type PipelineTravelRequest,
  type Reminder,
  type ReminderFilters,
  type TravelRequestStatus
} from "@/lib/api";
import { inProgressTravelRequestStatuses } from "@/lib/domain";
import { getApiErrorMessage } from "@/lib/errors";
import {
  formatRequestMeta,
  formatShortDate,
  formatTime,
  startOfToday,
  startOfTomorrow
} from "@/lib/formatters";
import { moveRequestInPipeline } from "@/lib/pipeline";
import { queryKeys } from "@/lib/queryKeys";
import { PageHeader } from "@/pages/components/PageHeader";
import { ErrorState } from "@/pages/components/Feedback";
import { travelRequestStatusLabels } from "@/pages/components/StatusBadge";

function todayReminderFilters(): ReminderFilters {
  return {
    status: "active",
    dueFrom: startOfToday().toISOString(),
    dueTo: startOfTomorrow().toISOString()
  };
}

function flattenRequests(
  pipeline: Pipeline | undefined,
  statuses: TravelRequestStatus[],
): PipelineTravelRequest[] {
  if (!pipeline) {
    return [];
  }
  return statuses.flatMap((status) => pipeline[status]);
}

function countRequests(
  pipeline: Pipeline | undefined,
  statuses: TravelRequestStatus[],
): number {
  return flattenRequests(pipeline, statuses).length;
}

const activeDashboardStatuses: TravelRequestStatus[] = [
  "new",
  "clarifying",
  "searching",
  "sent",
  "thinking"
];

const defaultDashboardWidgetOrder: DashboardWidgetId[] = [
  "overview",
  "todayReminders",
  "recentClients",
  "miniPipeline"
];

const dashboardWidgetIds = new Set<DashboardWidgetId>(defaultDashboardWidgetOrder);

function getDashboardWidgetOrder(
  savedOrder: DashboardWidgetId[] | undefined,
): DashboardWidgetId[] {
  if (
    savedOrder &&
    savedOrder.length === defaultDashboardWidgetOrder.length &&
    savedOrder.every((widgetId) => dashboardWidgetIds.has(widgetId)) &&
    new Set(savedOrder).size === defaultDashboardWidgetOrder.length
  ) {
    return savedOrder;
  }
  return defaultDashboardWidgetOrder;
}

export function DashboardPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const filters = todayReminderFilters();
  const remindersQuery = useQuery({
    queryKey: queryKeys.reminders(filters),
    queryFn: () => fetchReminders(token!, filters),
    enabled: Boolean(token)
  });

  const pipelineQuery = useQuery({
    queryKey: queryKeys.pipeline(),
    queryFn: () => fetchPipeline(token!),
    enabled: Boolean(token)
  });

  const clientsQuery = useQuery({
    queryKey: queryKeys.clients("dashboard"),
    queryFn: () => fetchClients(token!),
    enabled: Boolean(token)
  });

  const preferencesQuery = useQuery({
    queryKey: queryKeys.dashboardPreferences(),
    queryFn: () => fetchDashboardPreferences(token!),
    enabled: Boolean(token)
  });

  const preferencesMutation = useMutation({
    mutationFn: (dashboardWidgetOrder: DashboardWidgetId[]) =>
      updateDashboardPreferences(token!, { dashboardWidgetOrder }),
    onSuccess: (preferences) => {
      queryClient.setQueryData(
        queryKeys.dashboardPreferences(),
        preferences,
      );
    },
    onError: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.dashboardPreferences()
      });
    }
  });

  const doneMutation = useMutation({
    mutationFn: (reminderId: string) => markReminderDone(token!, reminderId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.reminders() });
    }
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.pipeline() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.travelRequests() });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.travelRequest(request.id)
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.clientRequests(request.clientId)
      });
    },
    onError: async (_error, _variables, context) => {
      if (context?.previousPipeline) {
        queryClient.setQueryData(queryKeys.pipeline(), context.previousPipeline);
      }
    }
  });

  const widgetSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    }),
  );
  const widgetOrder = getDashboardWidgetOrder(
    preferencesQuery.data?.dashboardWidgetOrder,
  );
  const reminders = remindersQuery.data ?? [];
  const pipeline = pipelineQuery.data;
  const recentClients = (clientsQuery.data ?? []).slice(0, 5);
  const hasLoadError =
    remindersQuery.isError ||
    pipelineQuery.isError ||
    clientsQuery.isError ||
    preferencesQuery.isError ||
    preferencesMutation.isError ||
    statusMutation.isError ||
    doneMutation.isError;

  function handleWidgetDragEnd(event: DragEndEvent) {
    const activeWidgetId = event.active.id as DashboardWidgetId;
    const overWidgetId = event.over?.id as DashboardWidgetId | undefined;

    if (
      !overWidgetId ||
      activeWidgetId === overWidgetId ||
      !dashboardWidgetIds.has(activeWidgetId) ||
      !dashboardWidgetIds.has(overWidgetId)
    ) {
      return;
    }

    const oldIndex = widgetOrder.indexOf(activeWidgetId);
    const newIndex = widgetOrder.indexOf(overWidgetId);
    const dashboardWidgetOrder = arrayMove(widgetOrder, oldIndex, newIndex);

    queryClient.setQueryData<DashboardPreferences>(
      queryKeys.dashboardPreferences(),
      { dashboardWidgetOrder },
    );
    preferencesMutation.mutate(dashboardWidgetOrder);
  }

  function handleRequestStatusChange(
    request: PipelineTravelRequest,
    status: TravelRequestStatus,
  ) {
    if (status === request.status) {
      return;
    }
    statusMutation.mutate({ requestId: request.id, status });
  }

  function renderWidget(widgetId: DashboardWidgetId) {
    switch (widgetId) {
      case "overview":
        return (
          <OverviewWidget
            isPipelineLoading={pipelineQuery.isLoading}
            isRemindersLoading={remindersQuery.isLoading}
            pipeline={pipeline}
            remindersCount={reminders.length}
          />
        );
      case "todayReminders":
        return (
          <DashboardPanel
            action={<Link className="text-sm font-medium text-primary" to="/reminders">Открыть список</Link>}
            description="Что нужно сделать сегодня, чтобы заявки не зависали без контакта."
            title="Сегодня"
          >
            {remindersQuery.isLoading ? (
              <LoadingLine text="Загружаем напоминания..." />
            ) : remindersQuery.isError ? (
              <LoadingLine text="Не удалось загрузить напоминания." />
            ) : reminders.length === 0 ? (
              <PanelEmpty
                title="На сегодня ничего не запланировано"
                description="Создайте follow-up в разделе напоминаний, и он появится здесь в день выполнения."
              />
            ) : (
              <div className="space-y-3">
                {reminders.map((reminder) => (
                  <ReminderRow
                    clients={clientsQuery.data ?? []}
                    isMarkingDone={doneMutation.isPending}
                    key={reminder.id}
                    reminder={reminder}
                    onMarkDone={(selected) => doneMutation.mutate(selected.id)}
                  />
                ))}
              </div>
            )}
          </DashboardPanel>
        );
      case "recentClients":
        return (
          <DashboardPanel
            action={<Link className="text-sm font-medium text-primary" to="/clients">Все клиенты</Link>}
            description="Последние созданные клиенты для быстрого возврата в карточку."
            title="Недавние клиенты"
          >
            {clientsQuery.isLoading ? (
              <LoadingLine text="Загружаем клиентов..." />
            ) : clientsQuery.isError ? (
              <LoadingLine text="Не удалось загрузить клиентов." />
            ) : recentClients.length === 0 ? (
              <PanelEmpty
                title="Клиентов пока нет"
                description="Создайте первого клиента, чтобы начать путь от заявки к предложению."
              />
            ) : (
              <div className="space-y-3">
                {recentClients.map((client) => (
                  <ClientRow client={client} key={client.id} />
                ))}
              </div>
            )}
          </DashboardPanel>
        );
      case "miniPipeline":
        return (
          <MiniPipelineWidget
            isLoading={pipelineQuery.isLoading}
            isError={pipelineQuery.isError}
            isUpdating={statusMutation.isPending}
            pipeline={pipeline}
            onStatusChange={handleRequestStatusChange}
          />
        );
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader
          title="Дашборд"
          description="Короткая сводка на день: follow-up, новые заявки и клиенты, к которым удобно вернуться."
        />
        <Button asChild className="w-full sm:w-auto">
          <Link to="/reminders">Все напоминания</Link>
        </Button>
      </div>

      {hasLoadError ? (
        <ErrorState
          message={getApiErrorMessage(
            remindersQuery.error ??
              pipelineQuery.error ??
              clientsQuery.error ??
              preferencesQuery.error ??
              preferencesMutation.error ??
              statusMutation.error ??
              doneMutation.error,
            "Не удалось загрузить данные. Попробуйте обновить страницу.",
          )}
        />
      ) : null}

      <DndContext
        collisionDetection={closestCenter}
        sensors={widgetSensors}
        onDragEnd={handleWidgetDragEnd}
      >
        <SortableContext
          items={widgetOrder}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-6">
            {widgetOrder.map((widgetId) => (
              <SortableDashboardWidget key={widgetId} id={widgetId}>
                {renderWidget(widgetId)}
              </SortableDashboardWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}

function SortableDashboardWidget({
  children,
  id
}: {
  children: ReactNode;
  id: DashboardWidgetId;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id,
    data: { type: "dashboard-widget" }
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      className={isDragging ? "relative z-20 opacity-80" : "relative"}
      style={style}
    >
      <div className="mb-2 flex justify-end">
        <button
          {...attributes}
          {...listeners}
          aria-label="Перетащить блок дашборда"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-2 text-xs font-medium text-muted-foreground shadow-sm transition hover:border-primary/40 hover:text-foreground active:cursor-grabbing"
          type="button"
        >
          <GripVertical className="h-4 w-4" />
          Блок
        </button>
      </div>
      {children}
    </div>
  );
}

function OverviewWidget({
  isPipelineLoading,
  isRemindersLoading,
  pipeline,
  remindersCount
}: {
  isPipelineLoading: boolean;
  isRemindersLoading: boolean;
  pipeline: Pipeline | undefined;
  remindersCount: number;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <OverviewCard
        isLoading={isRemindersLoading}
        label="Напоминания сегодня"
        note="Активные действия до конца дня"
        value={remindersCount}
      />
      <OverviewCard
        isLoading={isPipelineLoading}
        label="Новые заявки"
        note="Нужно уточнить вводные"
        value={countRequests(pipeline, ["new"])}
      />
      <OverviewCard
        isLoading={isPipelineLoading}
        label="В работе"
        note="Уточнение, подбор, отправлено, думает"
        value={countRequests(pipeline, inProgressTravelRequestStatuses)}
      />
    </div>
  );
}

function OverviewCard({
  isLoading,
  label,
  note,
  value
}: {
  isLoading: boolean;
  label: string;
  note: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="p-5">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {isLoading ? (
        <Skeleton className="mt-4 h-8 w-16" />
      ) : (
        <p className="mt-3 text-3xl font-semibold">{value}</p>
      )}
      <p className="mt-2 text-sm text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}

function MiniPipelineWidget({
  isError,
  isLoading,
  isUpdating,
  pipeline,
  onStatusChange
}: {
  isError: boolean;
  isLoading: boolean;
  isUpdating: boolean;
  pipeline: Pipeline | undefined;
  onStatusChange: (
    request: PipelineTravelRequest,
    status: TravelRequestStatus,
  ) => void;
}) {
  const requestSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const activeRequests = flattenRequests(pipeline, activeDashboardStatuses);

  function handleRequestDragEnd(event: DragEndEvent) {
    const request = event.active.data.current?.request as
      | PipelineTravelRequest
      | undefined;
    const status = event.over?.data.current?.status as
      | TravelRequestStatus
      | undefined;

    if (!request || !status || request.status === status) {
      return;
    }
    onStatusChange(request, status);
  }

  return (
    <DashboardPanel
      action={<Link className="text-sm font-medium text-primary" to="/pipeline">Открыть доску</Link>}
      description="Компактная доска активных заявок: перетащите карточку в другой статус, чтобы обновить работу."
      title="Активные заявки"
    >
      {isLoading ? (
        <LoadingLine text="Загружаем доску заявок..." />
      ) : isError ? (
        <LoadingLine text="Не удалось загрузить доску заявок." />
      ) : activeRequests.length === 0 ? (
        <PanelEmpty
          title="Активных заявок пока нет"
          description="Создайте заявку или верните ее в активный статус, чтобы вести ее с дашборда."
        />
      ) : (
        <DndContext
          collisionDetection={closestCenter}
          sensors={requestSensors}
          onDragEnd={handleRequestDragEnd}
        >
          <div className="grid gap-3 lg:grid-cols-5">
            {activeDashboardStatuses.map((status) => (
              <MiniPipelineColumn
                key={status}
                isUpdating={isUpdating}
                requests={pipeline?.[status] ?? []}
                status={status}
              />
            ))}
          </div>
        </DndContext>
      )}
    </DashboardPanel>
  );
}

function MiniPipelineColumn({
  isUpdating,
  requests,
  status
}: {
  isUpdating: boolean;
  requests: PipelineTravelRequest[];
  status: TravelRequestStatus;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `dashboard-status-${status}`,
    data: { type: "travel-request-status", status }
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-44 rounded-md border bg-muted/20 p-3 transition ${
        isOver ? "border-primary bg-primary/5" : "border-border"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">
          {travelRequestStatusLabels[status]}
        </span>
        <Badge variant="secondary">{requests.length}</Badge>
      </div>

      {requests.length === 0 ? (
        <p className="rounded-md border border-dashed bg-background px-3 py-4 text-xs leading-5 text-muted-foreground">
          Перетащите заявку сюда.
        </p>
      ) : (
        <div className="space-y-2">
          {requests.map((request) => (
            <MiniPipelineRequestCard
              key={request.id}
              isUpdating={isUpdating}
              request={request}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MiniPipelineRequestCard({
  isUpdating,
  request
}: {
  isUpdating: boolean;
  request: PipelineTravelRequest;
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
    transform: CSS.Translate.toString(transform)
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
            <p className="truncate text-xs font-medium text-muted-foreground">
              {request.clientFullName}
            </p>
            <h4 className="mt-1 text-sm font-semibold leading-5">
              {request.destination || "Заявка без направления"}
            </h4>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
              {formatRequestMeta(request)}
            </p>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardPanel({
  action,
  children,
  description,
  title
}: {
  action?: ReactNode;
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        {action}
      </div>
      {children}
      </CardContent>
    </Card>
  );
}

function ReminderRow({
  clients,
  isMarkingDone,
  reminder,
  onMarkDone
}: {
  clients: Client[];
  isMarkingDone: boolean;
  reminder: Reminder;
  onMarkDone: (reminder: Reminder) => void;
}) {
  const client = clients.find((item) => item.id === reminder.clientId);

  return (
    <Card className="bg-background">
      <CardContent className="p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="sky">{formatTime(reminder.dueAt)}</Badge>
            {reminder.clientId ? (
              <Link
                className="text-sm font-medium text-muted-foreground hover:text-primary"
                to={`/clients/${reminder.clientId}`}
              >
                {client?.fullName ?? "Клиент"}
              </Link>
            ) : (
              <span className="text-sm text-muted-foreground">Без клиента</span>
            )}
            {reminder.requestId ? (
              <Link
                className="text-sm font-medium text-muted-foreground hover:text-primary"
                to={`/requests/${reminder.requestId}`}
              >
                Заявка
              </Link>
            ) : null}
          </div>
          <h4 className="mt-3 text-sm font-semibold">{reminder.title}</h4>
          {reminder.description ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
              {reminder.description}
            </p>
          ) : null}
        </div>
        <Button
          disabled={isMarkingDone}
          variant="secondary"
          type="button"
          onClick={() => onMarkDone(reminder)}
        >
          Готово
        </Button>
      </div>
      </CardContent>
    </Card>
  );
}

function ClientRow({ client }: { client: Client }) {
  return (
    <Card className="bg-background transition hover:border-primary/40 hover:bg-muted/30">
      <Link className="block p-4" to={`/clients/${client.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold">{client.fullName}</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            {client.telegram ?? client.whatsapp ?? client.phone ?? client.email ?? "Контакты не указаны"}
          </p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatShortDate(client.createdAt)}
        </span>
      </div>
      </Link>
    </Card>
  );
}

function LoadingLine({ text }: { text: string }) {
  return (
    <div className="rounded-md border bg-background p-4">
      <Skeleton className="h-4 w-44" />
      <p className="mt-3 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function PanelEmpty({
  description,
  title
}: {
  description: string;
  title: string;
}) {
  return (
    <Card className="border-dashed bg-background px-4 py-6 text-center">
      <h4 className="text-sm font-semibold">{title}</h4>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </Card>
  );
}
