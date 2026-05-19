import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useAuth } from "@/auth/AuthContext";
import {
  ApiError,
  createReminder,
  deleteReminder,
  fetchClientRequests,
  fetchClients,
  fetchReminders,
  markReminderDone,
  updateReminder,
  type Client,
  type Reminder,
  type ReminderFilters,
  type ReminderInput,
  type ReminderStatus
} from "@/lib/api";
import { EmptyState } from "@/pages/components/EmptyState";
import { PageHeader } from "@/pages/components/PageHeader";

const statusLabels: Record<ReminderStatus, string> = {
  active: "Активно",
  done: "Готово"
};

const filterOptions: Array<{
  value: "today" | "overdue" | "active" | "done" | "all";
  label: string;
}> = [
  { value: "today", label: "Сегодня" },
  { value: "overdue", label: "Просрочено" },
  { value: "active", label: "Активные" },
  { value: "done", label: "Готовые" },
  { value: "all", label: "Все" }
];

const reminderFormSchema = z.object({
  title: z.string().trim().min(1, "Укажите название напоминания").max(180),
  description: z.string().optional(),
  dueAt: z.string().min(1, "Укажите дату и время"),
  clientId: z.string().optional(),
  requestId: z.string().optional()
});

type ReminderFormValues = z.infer<typeof reminderFormSchema>;

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return "Не удалось выполнить действие. Попробуйте ещё раз.";
}

function emptyToNull(value?: string): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function toInputDateTime(value: Date): string {
  const offset = value.getTimezoneOffset();
  const local = new Date(value.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function toApiDateTime(value: string): string {
  return new Date(value).toISOString();
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

function defaultDueAt(): string {
  const value = new Date();
  value.setHours(value.getHours() + 2, 0, 0, 0);
  return toInputDateTime(value);
}

function dueAtForInput(value: string): string {
  return toInputDateTime(new Date(value));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function buildFilters(filter: string): ReminderFilters {
  if (filter === "today") {
    return {
      status: "active",
      dueFrom: startOfToday().toISOString(),
      dueTo: startOfTomorrow().toISOString()
    };
  }
  if (filter === "overdue") {
    return {
      status: "active",
      dueTo: startOfToday().toISOString()
    };
  }
  if (filter === "active" || filter === "done") {
    return { status: filter };
  }
  return {};
}

function isOverdue(reminder: Reminder): boolean {
  return reminder.status === "active" && new Date(reminder.dueAt) < new Date();
}

export function RemindersPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"today" | "overdue" | "active" | "done" | "all">(
    "today",
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const filters = useMemo(() => buildFilters(filter), [filter]);

  const remindersQuery = useQuery({
    queryKey: ["reminders", filters],
    queryFn: () => fetchReminders(token!, filters),
    enabled: Boolean(token)
  });

  const clientsQuery = useQuery({
    queryKey: ["clients", "reminder-form"],
    queryFn: () => fetchClients(token!),
    enabled: Boolean(token)
  });

  const createMutation = useMutation({
    mutationFn: (payload: ReminderInput) => createReminder(token!, payload),
    onSuccess: async () => {
      setFormError(null);
      setMutationError(null);
      setIsCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
    onError: (error) => setFormError(getErrorMessage(error))
  });

  const updateMutation = useMutation({
    mutationFn: ({
      reminderId,
      payload
    }: {
      reminderId: string;
      payload: ReminderInput;
    }) => updateReminder(token!, reminderId, payload),
    onSuccess: async () => {
      setFormError(null);
      setMutationError(null);
      setEditingReminder(null);
      await queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
    onError: (error) => setFormError(getErrorMessage(error))
  });

  const doneMutation = useMutation({
    mutationFn: (reminderId: string) => markReminderDone(token!, reminderId),
    onSuccess: async () => {
      setMutationError(null);
      await queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
    onError: (error) => setMutationError(getErrorMessage(error))
  });

  const deleteMutation = useMutation({
    mutationFn: (reminderId: string) => deleteReminder(token!, reminderId),
    onSuccess: async () => {
      setMutationError(null);
      await queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
    onError: (error) => setMutationError(getErrorMessage(error))
  });

  const reminders = remindersQuery.data ?? [];
  const clients = clientsQuery.data ?? [];

  async function handleCreate(payload: ReminderInput) {
    await createMutation.mutateAsync(payload);
  }

  async function handleUpdate(payload: ReminderInput) {
    if (!editingReminder) {
      return;
    }
    await updateMutation.mutateAsync({
      reminderId: editingReminder.id,
      payload
    });
  }

  async function handleDelete(reminder: Reminder) {
    if (!window.confirm("Удалить напоминание? Это действие нельзя отменить.")) {
      return;
    }
    await deleteMutation.mutateAsync(reminder.id);
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader
          title="Напоминания"
          description="Follow-up, звонки и короткие действия, которые помогают довести заявку до решения."
        />
        <button
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 sm:w-auto"
          type="button"
          onClick={() => {
            setFormError(null);
            setEditingReminder(null);
            setIsCreateOpen((value) => !value);
          }}
        >
          {isCreateOpen ? "Скрыть форму" : "Создать напоминание"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {filterOptions.map((option) => (
          <button
            className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
              filter === option.value
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {isCreateOpen ? (
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="mb-5">
            <h3 className="text-lg font-semibold">Новое напоминание</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Свяжите его с клиентом или заявкой, если это помогает быстро вернуться в контекст.
            </p>
          </div>
          <ReminderForm
            clients={clients}
            error={formError}
            isSubmitting={createMutation.isPending}
            submitLabel="Создать напоминание"
            token={token!}
            onCancel={() => setIsCreateOpen(false)}
            onSubmit={handleCreate}
          />
        </div>
      ) : null}

      {editingReminder ? (
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="mb-5">
            <h3 className="text-lg font-semibold">Редактирование</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Обновите текст, срок или привязку к клиенту и заявке.
            </p>
          </div>
          <ReminderForm
            clients={clients}
            error={formError}
            isSubmitting={updateMutation.isPending}
            key={editingReminder.id}
            reminder={editingReminder}
            submitLabel="Сохранить изменения"
            token={token!}
            onCancel={() => {
              setFormError(null);
              setEditingReminder(null);
            }}
            onSubmit={handleUpdate}
          />
        </div>
      ) : null}

      {mutationError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {mutationError}
        </div>
      ) : null}

      {remindersQuery.isLoading ? (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground shadow-sm">
          Загружаем напоминания...
        </div>
      ) : null}

      {remindersQuery.isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
          {getErrorMessage(remindersQuery.error)}
        </div>
      ) : null}

      {!remindersQuery.isLoading && !remindersQuery.isError && reminders.length === 0 ? (
        <EmptyState
          title="Напоминаний здесь пока нет"
          description="Создайте follow-up по заявке или переключите фильтр, чтобы увидеть выполненные и будущие действия."
        />
      ) : null}

      {reminders.length > 0 ? (
        <div className="grid gap-3">
          {reminders.map((reminder) => (
            <ReminderCard
              clients={clients}
              isDeleting={deleteMutation.isPending}
              isMarkingDone={doneMutation.isPending}
              key={reminder.id}
              reminder={reminder}
              onDelete={handleDelete}
              onEdit={(selected) => {
                setFormError(null);
                setIsCreateOpen(false);
                setEditingReminder(selected);
              }}
              onMarkDone={(selected) => doneMutation.mutate(selected.id)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ReminderForm({
  clients,
  error,
  isSubmitting,
  reminder,
  submitLabel,
  token,
  onCancel,
  onSubmit
}: {
  clients: Client[];
  error: string | null;
  isSubmitting: boolean;
  reminder?: Reminder;
  submitLabel: string;
  token: string;
  onCancel: () => void;
  onSubmit: (payload: ReminderInput) => Promise<void>;
}) {
  const [selectedClientId, setSelectedClientId] = useState(reminder?.clientId ?? "");
  const requestsQuery = useQuery({
    queryKey: ["client-requests", selectedClientId, "reminder-form"],
    queryFn: () => fetchClientRequests(token, selectedClientId),
    enabled: Boolean(token && selectedClientId)
  });
  const requests = requestsQuery.data ?? [];

  const form = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderFormSchema),
    defaultValues: {
      title: reminder?.title ?? "",
      description: reminder?.description ?? "",
      dueAt: reminder ? dueAtForInput(reminder.dueAt) : defaultDueAt(),
      clientId: reminder?.clientId ?? "",
      requestId: reminder?.requestId ?? ""
    }
  });

  useEffect(() => {
    form.setValue("clientId", selectedClientId);
    if (!selectedClientId) {
      form.setValue("requestId", "");
    }
  }, [form, selectedClientId]);

  async function handleSubmit(values: ReminderFormValues) {
    await onSubmit({
      title: values.title.trim(),
      description: emptyToNull(values.description),
      dueAt: toApiDateTime(values.dueAt),
      clientId: emptyToNull(values.clientId),
      requestId: emptyToNull(values.requestId)
    });
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field error={form.formState.errors.title?.message} label="Название">
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
            placeholder="Написать клиенту по Турции"
            {...form.register("title")}
          />
        </Field>
        <Field error={form.formState.errors.dueAt?.message} label="Дата и время">
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
            type="datetime-local"
            {...form.register("dueAt")}
          />
        </Field>
        <Field label="Клиент">
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
            {...form.register("clientId")}
            value={selectedClientId}
            onChange={(event) => {
              setSelectedClientId(event.target.value);
              form.setValue("requestId", "");
            }}
          >
            <option value="">Без клиента</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.fullName}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Заявка">
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!selectedClientId || requestsQuery.isLoading}
            {...form.register("requestId")}
          >
            <option value="">
              {selectedClientId ? "Без заявки" : "Сначала выберите клиента"}
            </option>
            {requests.map((request) => (
              <option key={request.id} value={request.id}>
                {request.destination || "Заявка без направления"}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Описание">
        <textarea
          className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
          placeholder="Что именно нужно сделать перед следующим контактом"
          {...form.register("description")}
        />
      </Field>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          className="rounded-md border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          type="button"
          onClick={onCancel}
        >
          Отмена
        </button>
        <button
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Сохраняем..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

function ReminderCard({
  clients,
  isDeleting,
  isMarkingDone,
  reminder,
  onDelete,
  onEdit,
  onMarkDone
}: {
  clients: Client[];
  isDeleting: boolean;
  isMarkingDone: boolean;
  reminder: Reminder;
  onDelete: (reminder: Reminder) => void;
  onEdit: (reminder: Reminder) => void;
  onMarkDone: (reminder: Reminder) => void;
}) {
  const client = clients.find((item) => item.id === reminder.clientId);
  const overdue = isOverdue(reminder);

  return (
    <article className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                reminder.status === "done"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : overdue
                    ? "border-rose-200 bg-rose-50 text-rose-800"
                    : "border-sky-200 bg-sky-50 text-sky-800"
              }`}
            >
              {overdue ? "Просрочено" : statusLabels[reminder.status]}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {formatDateTime(reminder.dueAt)}
            </span>
          </div>
          <h3 className="mt-3 text-base font-semibold">{reminder.title}</h3>
          {reminder.description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {reminder.description}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
            {client ? (
              <Link
                className="font-medium text-foreground hover:text-primary"
                to={`/clients/${client.id}`}
              >
                {client.fullName}
              </Link>
            ) : (
              <span>Без клиента</span>
            )}
            {reminder.requestId ? (
              <Link
                className="font-medium text-foreground hover:text-primary"
                to={`/requests/${reminder.requestId}`}
              >
                Заявка
              </Link>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {reminder.status === "active" ? (
            <button
              className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isMarkingDone}
              type="button"
              onClick={() => onMarkDone(reminder)}
            >
              Готово
            </button>
          ) : null}
          <button
            className="rounded-md border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            type="button"
            onClick={() => onEdit(reminder)}
          >
            Изменить
          </button>
          <button
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDeleting}
            type="button"
            onClick={() => onDelete(reminder)}
          >
            Удалить
          </button>
        </div>
      </div>
    </article>
  );
}

function Field({
  children,
  error,
  label
}: {
  children: ReactNode;
  error?: string;
  label: string;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium">
      <span>{label}</span>
      {children}
      {error ? <span className="block text-sm text-red-600">{error}</span> : null}
    </label>
  );
}
