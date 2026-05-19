import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "@/auth/AuthContext";
import {
  ApiError,
  fetchClients,
  fetchPipeline,
  fetchReminders,
  markReminderDone,
  type Client,
  type Pipeline,
  type PipelineTravelRequest,
  type Reminder,
  type ReminderFilters,
  type TravelRequestStatus
} from "@/lib/api";
import { PageHeader } from "@/pages/components/PageHeader";

const inProgressStatuses: TravelRequestStatus[] = [
  "clarifying",
  "searching",
  "sent",
  "thinking"
];

const statusLabels: Record<TravelRequestStatus, string> = {
  new: "Новая",
  clarifying: "Уточнение",
  searching: "Подбор",
  sent: "Отправлено",
  thinking: "Клиент думает",
  booked: "Бронь",
  rejected: "Отказ"
};

const statusTones: Record<TravelRequestStatus, string> = {
  new: "border-sky-200 bg-sky-50 text-sky-800",
  clarifying: "border-amber-200 bg-amber-50 text-amber-800",
  searching: "border-teal-200 bg-teal-50 text-teal-800",
  sent: "border-indigo-200 bg-indigo-50 text-indigo-800",
  thinking: "border-violet-200 bg-violet-50 text-violet-800",
  booked: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rejected: "border-rose-200 bg-rose-50 text-rose-800"
};

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return "Не удалось загрузить данные. Попробуйте обновить страницу.";
}

function startOfToday(): Date {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  return value;
}

function startOfTomorrow(): Date {
  const value = startOfToday();
  value.setDate(value.getDate() + 1);
  return value;
}

function todayReminderFilters(): ReminderFilters {
  return {
    status: "active",
    dueFrom: startOfToday().toISOString(),
    dueTo: startOfTomorrow().toISOString()
  };
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short"
  }).format(new Date(value));
}

function formatRequestMeta(request: PipelineTravelRequest): string {
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

export function DashboardPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const filters = todayReminderFilters();
  const remindersQuery = useQuery({
    queryKey: ["reminders", filters],
    queryFn: () => fetchReminders(token!, filters),
    enabled: Boolean(token)
  });

  const pipelineQuery = useQuery({
    queryKey: ["pipeline"],
    queryFn: () => fetchPipeline(token!),
    enabled: Boolean(token)
  });

  const clientsQuery = useQuery({
    queryKey: ["clients", "dashboard"],
    queryFn: () => fetchClients(token!),
    enabled: Boolean(token)
  });

  const doneMutation = useMutation({
    mutationFn: (reminderId: string) => markReminderDone(token!, reminderId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reminders"] });
    }
  });

  const reminders = remindersQuery.data ?? [];
  const pipeline = pipelineQuery.data;
  const newRequests = flattenRequests(pipeline, ["new"]);
  const inProgressRequests = flattenRequests(pipeline, inProgressStatuses);
  const recentClients = (clientsQuery.data ?? []).slice(0, 5);
  const hasLoadError =
    remindersQuery.isError ||
    pipelineQuery.isError ||
    clientsQuery.isError ||
    doneMutation.isError;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader
          title="Дашборд"
          description="Короткая сводка на день: follow-up, новые заявки и клиенты, к которым удобно вернуться."
        />
        <Link
          className="w-full rounded-md bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 sm:w-auto"
          to="/reminders"
        >
          Все напоминания
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <OverviewCard
          isLoading={remindersQuery.isLoading}
          label="Напоминания сегодня"
          note="Активные действия до конца дня"
          value={reminders.length}
        />
        <OverviewCard
          isLoading={pipelineQuery.isLoading}
          label="Новые заявки"
          note="Нужно уточнить вводные"
          value={countRequests(pipeline, ["new"])}
        />
        <OverviewCard
          isLoading={pipelineQuery.isLoading}
          label="В работе"
          note="Уточнение, подбор, отправлено, думает"
          value={countRequests(pipeline, inProgressStatuses)}
        />
      </div>

      {hasLoadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {getErrorMessage(
            remindersQuery.error ??
              pipelineQuery.error ??
              clientsQuery.error ??
              doneMutation.error,
          )}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
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
                  isMarkingDone={doneMutation.isPending}
                  key={reminder.id}
                  reminder={reminder}
                  onMarkDone={(selected) => doneMutation.mutate(selected.id)}
                />
              ))}
            </div>
          )}
        </DashboardPanel>

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
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <RequestsPanel
          emptyDescription="Новые заявки появятся здесь сразу после создания в карточке клиента."
          emptyTitle="Новых заявок нет"
          isError={pipelineQuery.isError}
          isLoading={pipelineQuery.isLoading}
          requests={newRequests}
          title="Новые заявки"
        />
        <RequestsPanel
          emptyDescription="Когда заявка перейдет в уточнение, подбор или follow-up, она будет видна в этом списке."
          emptyTitle="В работе пока пусто"
          isError={pipelineQuery.isError}
          isLoading={pipelineQuery.isLoading}
          requests={inProgressRequests}
          title="Заявки в работе"
        />
      </div>
    </section>
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
    <article className="rounded-lg border bg-card p-5 shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{isLoading ? "..." : value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{note}</p>
    </article>
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
    <section className="rounded-lg border bg-card p-5 shadow-sm">
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
    </section>
  );
}

function ReminderRow({
  isMarkingDone,
  reminder,
  onMarkDone
}: {
  isMarkingDone: boolean;
  reminder: Reminder;
  onMarkDone: (reminder: Reminder) => void;
}) {
  return (
    <article className="rounded-lg border bg-background p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800">
              {formatTime(reminder.dueAt)}
            </span>
            {reminder.clientId ? (
              <Link
                className="text-sm font-medium text-muted-foreground hover:text-primary"
                to={`/clients/${reminder.clientId}`}
              >
                Клиент
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
        <button
          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isMarkingDone}
          type="button"
          onClick={() => onMarkDone(reminder)}
        >
          Готово
        </button>
      </div>
    </article>
  );
}

function ClientRow({ client }: { client: Client }) {
  return (
    <Link
      className="block rounded-lg border bg-background p-4 transition hover:border-primary/40 hover:bg-muted/30"
      to={`/clients/${client.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold">{client.fullName}</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            {client.telegram ?? client.whatsapp ?? client.phone ?? client.email ?? "Контакты не указаны"}
          </p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatDate(client.createdAt)}
        </span>
      </div>
    </Link>
  );
}

function RequestsPanel({
  emptyDescription,
  emptyTitle,
  isError,
  isLoading,
  requests,
  title
}: {
  emptyDescription: string;
  emptyTitle: string;
  isError: boolean;
  isLoading: boolean;
  requests: PipelineTravelRequest[];
  title: string;
}) {
  return (
    <DashboardPanel
      action={<Link className="text-sm font-medium text-primary" to="/pipeline">Pipeline</Link>}
      description="Короткий список заявок, которые требуют внимания в рабочем процессе."
      title={title}
    >
      {isLoading ? (
        <LoadingLine text="Загружаем заявки..." />
      ) : isError ? (
        <LoadingLine text="Не удалось загрузить заявки." />
      ) : requests.length === 0 ? (
        <PanelEmpty title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="space-y-3">
          {requests.slice(0, 5).map((request) => (
            <RequestRow key={request.id} request={request} />
          ))}
        </div>
      )}
    </DashboardPanel>
  );
}

function RequestRow({ request }: { request: PipelineTravelRequest }) {
  return (
    <Link
      className="block rounded-lg border bg-background p-4 transition hover:border-primary/40 hover:bg-muted/30"
      to={`/requests/${request.id}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">
            {request.clientFullName}
          </p>
          <h4 className="mt-1 text-sm font-semibold">
            {request.destination || "Заявка без направления"}
          </h4>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {formatRequestMeta(request)}
          </p>
        </div>
        <span
          className={`w-fit shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTones[request.status]}`}
        >
          {statusLabels[request.status]}
        </span>
      </div>
    </Link>
  );
}

function LoadingLine({ text }: { text: string }) {
  return (
    <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
      {text}
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
    <div className="rounded-md border border-dashed bg-background px-4 py-6 text-center">
      <h4 className="text-sm font-semibold">{title}</h4>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
