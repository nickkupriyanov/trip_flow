import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";

import { useAuth } from "@/auth/AuthContext";
import {
  ApiError,
  createProposal,
  createTourOption,
  deleteProposal,
  deleteTravelRequest,
  deleteTourOption,
  fetchClient,
  fetchProposals,
  fetchTourOptions,
  fetchTravelRequest,
  updateProposal,
  updateTourOption,
  updateTravelRequest,
  type Proposal,
  type ProposalFormat,
  type ProposalInput,
  type TourOption,
  type TourOptionInput,
  type TravelRequest,
  type TravelRequestInput,
  type TravelRequestStatus
} from "@/lib/api";
import { EmptyState } from "@/pages/components/EmptyState";
import { TourOptionForm } from "@/pages/components/TourOptionForm";
import { TravelRequestForm } from "@/pages/components/TravelRequestForm";

const statusLabels: Record<TravelRequestStatus, string> = {
  new: "Новая",
  clarifying: "Уточнение",
  searching: "Подбор",
  sent: "Отправлено",
  thinking: "Клиент думает",
  booked: "Бронь",
  rejected: "Отказ"
};

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return "Не удалось выполнить действие. Попробуйте ещё раз.";
}

export function TravelRequestDetailPage() {
  const { requestId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const requestQuery = useQuery({
    queryKey: ["travel-request", requestId],
    queryFn: () => fetchTravelRequest(token!, requestId!),
    enabled: Boolean(token && requestId)
  });

  const clientId = requestQuery.data?.clientId;
  const clientQuery = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => fetchClient(token!, clientId!),
    enabled: Boolean(token && clientId)
  });

  const updateMutation = useMutation({
    mutationFn: (payload: TravelRequestInput) =>
      updateTravelRequest(token!, requestId!, payload),
    onSuccess: async (updated) => {
      setFormError(null);
      setIsEditing(false);
      await queryClient.invalidateQueries({ queryKey: ["travel-request", requestId] });
      await queryClient.invalidateQueries({ queryKey: ["client-requests", updated.clientId] });
    },
    onError: (error) => setFormError(getErrorMessage(error))
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTravelRequest(token!, requestId!),
    onSuccess: async () => {
      if (clientId) {
        await queryClient.invalidateQueries({ queryKey: ["client-requests", clientId] });
        navigate(`/clients/${clientId}`, { replace: true });
      } else {
        navigate("/clients", { replace: true });
      }
    }
  });

  if (!requestId) {
    return <Navigate to="/clients" replace />;
  }

  async function handleUpdate(payload: TravelRequestInput) {
    await updateMutation.mutateAsync(payload);
  }

  async function handleDelete() {
    if (!window.confirm("Удалить заявку? Это действие нельзя отменить.")) {
      return;
    }
    await deleteMutation.mutateAsync();
  }

  if (requestQuery.isLoading) {
    return (
      <section className="rounded-lg border bg-card p-6 text-sm text-muted-foreground shadow-sm">
        Загружаем заявку...
      </section>
    );
  }

  if (requestQuery.isError) {
    return (
      <section className="space-y-4">
        <Link className="text-sm font-medium text-primary" to="/clients">
          Назад к клиентам
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
          {getErrorMessage(requestQuery.error)}
        </div>
      </section>
    );
  }

  const request = requestQuery.data;
  if (!request) {
    return null;
  }

  const clientName = clientQuery.data?.fullName ?? "клиенту";

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            className="text-sm font-medium text-primary"
            to={`/clients/${request.clientId}`}
          >
            Назад к клиенту
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-semibold tracking-normal">
              {request.destination || "Заявка без направления"}
            </h2>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
              {statusLabels[request.status]}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Параметры поездки по {clientName}. Здесь агент уточняет вводные перед
            подбором вариантов тура.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            className="rounded-md border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            type="button"
            onClick={() => {
              setFormError(null);
              setIsEditing((value) => !value);
            }}
          >
            {isEditing ? "Закрыть форму" : "Редактировать"}
          </button>
          <button
            className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={deleteMutation.isPending}
            type="button"
            onClick={handleDelete}
          >
            {deleteMutation.isPending ? "Удаляем..." : "Удалить"}
          </button>
        </div>
      </div>

      {deleteMutation.isError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {getErrorMessage(deleteMutation.error)}
        </div>
      ) : null}

      {isEditing ? (
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <h3 className="mb-5 text-lg font-semibold">Данные заявки</h3>
          <TravelRequestForm
            error={formError}
            isSubmitting={updateMutation.isPending}
            request={request}
            submitLabel="Сохранить заявку"
            onCancel={() => setIsEditing(false)}
            onSubmit={handleUpdate}
          />
        </div>
      ) : (
        <TravelRequestSummary request={request} />
      )}

      <TourOptionsPanel requestId={request.id} token={token!} />
      <ProposalsPanel requestId={request.id} token={token!} />
    </section>
  );
}

function TravelRequestSummary({ request }: { request: TravelRequest }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Параметры поездки</h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Info label="Направление" value={request.destination} />
          <Info label="Город вылета" value={request.departureCity} />
          <Info label="Даты" value={formatRange(request.dateFrom, request.dateTo)} />
          <Info label="Ночи" value={formatRange(request.nightsFrom, request.nightsTo)} />
          <Info label="Туристов" value={formatTourists(request)} />
          <Info label="Бюджет" value={formatRange(request.budgetMin, request.budgetMax)} />
          <Info label="Тип поездки" value={request.travelType} />
          <Info label="Возраст детей" value={request.childrenAges.join(", ")} />
        </dl>
      </div>

      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Контекст подбора</h3>
        <TextBlock label="Пожелания" value={request.wishes} />
        <TextBlock label="Ограничения" value={request.restrictions} />
        <TextBlock label="Внутренний комментарий" value={request.internalComment} />
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: number | string | null }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-foreground">
        {value === null || value === "" ? "Не указано" : value}
      </dd>
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="mt-4 first:mt-0">
      <h4 className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
        {label}
      </h4>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground">
        {value || "Не указано"}
      </p>
    </div>
  );
}

function formatRange(
  from: number | string | null,
  to: number | string | null,
): string | null {
  if (from && to) {
    return `${from} - ${to}`;
  }
  return from?.toString() ?? to?.toString() ?? null;
}

function formatTourists(request: TravelRequest): string {
  return `${request.adults} взрослых, ${request.children} детей`;
}

function TourOptionsPanel({
  requestId,
  token
}: {
  requestId: string;
  token: string;
}) {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const optionsQuery = useQuery({
    queryKey: ["tour-options", requestId],
    queryFn: () => fetchTourOptions(token, requestId)
  });

  const createMutation = useMutation({
    mutationFn: (payload: TourOptionInput) =>
      createTourOption(token, requestId, payload),
    onSuccess: async () => {
      setFormError(null);
      setIsCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["tour-options", requestId] });
    },
    onError: (error) => setFormError(getErrorMessage(error))
  });

  const updateMutation = useMutation({
    mutationFn: ({
      optionId,
      payload
    }: {
      optionId: string;
      payload: TourOptionInput;
    }) => updateTourOption(token, optionId, payload),
    onSuccess: async () => {
      setFormError(null);
      setEditingOptionId(null);
      await queryClient.invalidateQueries({ queryKey: ["tour-options", requestId] });
    },
    onError: (error) => setFormError(getErrorMessage(error))
  });

  const deleteMutation = useMutation({
    mutationFn: (optionId: string) => deleteTourOption(token, optionId),
    onSuccess: async () => {
      setMutationError(null);
      await queryClient.invalidateQueries({ queryKey: ["tour-options", requestId] });
    },
    onError: (error) => setMutationError(getErrorMessage(error))
  });

  async function handleCreate(payload: TourOptionInput) {
    await createMutation.mutateAsync(payload);
  }

  async function handleUpdate(optionId: string, payload: TourOptionInput) {
    await updateMutation.mutateAsync({ optionId, payload });
  }

  async function handleDelete(option: TourOption) {
    if (!window.confirm("Удалить вариант тура? Это действие нельзя отменить.")) {
      return;
    }
    await deleteMutation.mutateAsync(option.id);
  }

  const options = optionsQuery.data ?? [];

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Варианты тура</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Подборки для этой заявки: отели, питание, цена и рабочие плюсы/минусы.
          </p>
        </div>
        <button
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          type="button"
          onClick={() => {
            setFormError(null);
            setEditingOptionId(null);
            setIsCreateOpen((value) => !value);
          }}
        >
          {isCreateOpen ? "Скрыть форму" : "Добавить вариант"}
        </button>
      </div>

      {isCreateOpen ? (
        <div className="mb-5 rounded-lg border bg-background p-4">
          <TourOptionForm
            error={formError}
            isSubmitting={createMutation.isPending}
            submitLabel="Добавить вариант"
            onCancel={() => setIsCreateOpen(false)}
            onSubmit={handleCreate}
          />
        </div>
      ) : null}

      {mutationError ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {mutationError}
        </div>
      ) : null}

      {optionsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Загружаем варианты...</p>
      ) : null}

      {optionsQuery.isError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {getErrorMessage(optionsQuery.error)}
        </div>
      ) : null}

      {!optionsQuery.isLoading && !optionsQuery.isError && options.length === 0 ? (
        <EmptyState
          title="Вариантов тура пока нет"
          description="Добавьте 2-5 рабочих вариантов, чтобы затем собрать предложение для клиента."
        />
      ) : null}

      {options.length > 0 ? (
        <div className="grid gap-4">
          {options.map((option) =>
            editingOptionId === option.id ? (
              <div className="rounded-lg border bg-background p-4" key={option.id}>
                <TourOptionForm
                  error={formError}
                  isSubmitting={updateMutation.isPending}
                  option={option}
                  submitLabel="Сохранить вариант"
                  onCancel={() => {
                    setFormError(null);
                    setEditingOptionId(null);
                  }}
                  onSubmit={(payload) => handleUpdate(option.id, payload)}
                />
              </div>
            ) : (
              <TourOptionCard
                isDeleting={deleteMutation.isPending}
                key={option.id}
                option={option}
                onDelete={handleDelete}
                onEdit={(selectedOption) => {
                  setFormError(null);
                  setIsCreateOpen(false);
                  setEditingOptionId(selectedOption.id);
                }}
              />
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

function TourOptionCard({
  isDeleting,
  option,
  onDelete,
  onEdit
}: {
  isDeleting: boolean;
  option: TourOption;
  onDelete: (option: TourOption) => void;
  onEdit: (option: TourOption) => void;
}) {
  return (
    <article className="rounded-lg border bg-background p-4 transition hover:border-primary/40 hover:bg-muted/30">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold">{option.title}</h4>
            {option.isRecommended ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                Рекомендованный
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatTourOptionMeta(option)}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            className="rounded-md border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            type="button"
            onClick={() => onEdit(option)}
          >
            Редактировать
          </button>
          <button
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDeleting}
            type="button"
            onClick={() => onDelete(option)}
          >
            {isDeleting ? "Удаляем..." : "Удалить"}
          </button>
        </div>
      </div>

      <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="Отель" value={formatHotel(option)} />
        <Info label="Даты" value={formatRange(option.dateFrom, option.dateTo)} />
        <Info label="Ночи" value={option.nights} />
        <Info label="Цена" value={formatPrice(option)} />
        <Info label="Номер" value={option.roomType} />
        <Info label="Питание" value={option.mealType} />
        <Info label="Курорт" value={formatPlace(option)} />
        <Info label="Ссылка" value={option.link} />
      </dl>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <ListBlock label="Плюсы" values={option.pros} />
        <ListBlock label="Минусы" values={option.cons} />
      </div>

      {option.agentComment ? (
        <div className="mt-4 rounded-md border bg-card px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            Комментарий агента
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground">
            {option.agentComment}
          </p>
        </div>
      ) : null}
    </article>
  );
}

function ListBlock({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <h5 className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
        {label}
      </h5>
      {values.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {values.map((value) => (
            <span
              className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
              key={value}
            >
              {value}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">Не указано</p>
      )}
    </div>
  );
}

function formatTourOptionMeta(option: TourOption): string {
  const parts = [
    formatPlace(option),
    formatHotel(option),
    option.mealType,
    formatPrice(option)
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Детали варианта ещё не заполнены";
}

function formatHotel(option: TourOption): string | null {
  if (!option.hotelName && !option.hotelStars) {
    return null;
  }
  return [option.hotelName, option.hotelStars ? `${option.hotelStars}*` : null]
    .filter(Boolean)
    .join(" ");
}

function formatPlace(option: TourOption): string | null {
  const parts = [option.country, option.resort].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

function formatPrice(option: TourOption): string | null {
  return option.price === null ? null : `${option.price} ${option.currency}`;
}

const proposalFormats: Array<{ value: ProposalFormat; label: string }> = [
  { value: "telegram", label: "Telegram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" }
];

const proposalFormatLabels: Record<ProposalFormat, string> = {
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  email: "Email"
};

type ProposalFormState = {
  title: string;
  content: string;
  format: ProposalFormat;
};

function ProposalsPanel({
  requestId,
  token
}: {
  requestId: string;
  token: string;
}) {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const proposalsQuery = useQuery({
    queryKey: ["proposals", requestId],
    queryFn: () => fetchProposals(token, requestId)
  });

  const createMutation = useMutation({
    mutationFn: (payload: ProposalInput) => createProposal(token, requestId, payload),
    onSuccess: async () => {
      setFormError(null);
      setCopyMessage(null);
      setIsCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["proposals", requestId] });
    },
    onError: (error) => setFormError(getErrorMessage(error))
  });

  const updateMutation = useMutation({
    mutationFn: ({
      proposalId,
      payload
    }: {
      proposalId: string;
      payload: ProposalInput;
    }) => updateProposal(token, proposalId, payload),
    onSuccess: async () => {
      setFormError(null);
      setCopyMessage(null);
      setEditingProposalId(null);
      await queryClient.invalidateQueries({ queryKey: ["proposals", requestId] });
    },
    onError: (error) => setFormError(getErrorMessage(error))
  });

  const deleteMutation = useMutation({
    mutationFn: (proposalId: string) => deleteProposal(token, proposalId),
    onSuccess: async () => {
      setMutationError(null);
      setCopyMessage(null);
      await queryClient.invalidateQueries({ queryKey: ["proposals", requestId] });
    },
    onError: (error) => setMutationError(getErrorMessage(error))
  });

  async function handleCreate(payload: ProposalInput) {
    await createMutation.mutateAsync(payload);
  }

  async function handleUpdate(proposalId: string, payload: ProposalInput) {
    await updateMutation.mutateAsync({ proposalId, payload });
  }

  async function handleDelete(proposal: Proposal) {
    if (!window.confirm("Удалить предложение? Это действие нельзя отменить.")) {
      return;
    }
    await deleteMutation.mutateAsync(proposal.id);
  }

  async function handleCopy(proposal: Proposal) {
    try {
      await navigator.clipboard.writeText(proposal.content);
      setCopyMessage(`Текст "${proposal.title}" скопирован.`);
    } catch {
      setCopyMessage("Не удалось скопировать текст. Выделите его в превью вручную.");
    }
  }

  const proposals = proposalsQuery.data ?? [];

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Предложения</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Редактируемые тексты для отправки клиенту в Telegram или WhatsApp.
          </p>
        </div>
        <button
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          type="button"
          onClick={() => {
            setFormError(null);
            setCopyMessage(null);
            setEditingProposalId(null);
            setIsCreateOpen((value) => !value);
          }}
        >
          {isCreateOpen ? "Скрыть форму" : "Создать предложение"}
        </button>
      </div>

      {isCreateOpen ? (
        <div className="mb-5 rounded-lg border bg-background p-4">
          <ProposalForm
            error={formError}
            isSubmitting={createMutation.isPending}
            submitLabel="Сохранить предложение"
            onCancel={() => setIsCreateOpen(false)}
            onSubmit={handleCreate}
          />
        </div>
      ) : null}

      {mutationError ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {mutationError}
        </div>
      ) : null}

      {copyMessage ? (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {copyMessage}
        </div>
      ) : null}

      {proposalsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Загружаем предложения...</p>
      ) : null}

      {proposalsQuery.isError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {getErrorMessage(proposalsQuery.error)}
        </div>
      ) : null}

      {!proposalsQuery.isLoading && !proposalsQuery.isError && proposals.length === 0 ? (
        <EmptyState
          title="Предложений пока нет"
          description="Соберите короткий редактируемый текст, сохраните его и скопируйте для отправки клиенту."
        />
      ) : null}

      {proposals.length > 0 ? (
        <div className="grid gap-4">
          {proposals.map((proposal) =>
            editingProposalId === proposal.id ? (
              <div className="rounded-lg border bg-background p-4" key={proposal.id}>
                <ProposalForm
                  error={formError}
                  isSubmitting={updateMutation.isPending}
                  proposal={proposal}
                  submitLabel="Сохранить изменения"
                  onCancel={() => {
                    setFormError(null);
                    setEditingProposalId(null);
                  }}
                  onSubmit={(payload) => handleUpdate(proposal.id, payload)}
                />
              </div>
            ) : (
              <ProposalCard
                isDeleting={deleteMutation.isPending}
                key={proposal.id}
                proposal={proposal}
                onCopy={handleCopy}
                onDelete={handleDelete}
                onEdit={(selectedProposal) => {
                  setFormError(null);
                  setCopyMessage(null);
                  setIsCreateOpen(false);
                  setEditingProposalId(selectedProposal.id);
                }}
              />
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

function ProposalForm({
  error,
  isSubmitting,
  proposal,
  submitLabel,
  onCancel,
  onSubmit
}: {
  error: string | null;
  isSubmitting: boolean;
  proposal?: Proposal;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (payload: ProposalInput) => Promise<void>;
}) {
  const [values, setValues] = useState<ProposalFormState>({
    title: proposal?.title ?? "",
    content: proposal?.content ?? "",
    format: proposal?.format ?? "telegram"
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = values.title.trim();
    const content = values.content.trim();

    if (!title || !content) {
      setValidationError("Укажите название и текст предложения.");
      return;
    }

    setValidationError(null);
    await onSubmit({ title, content, format: values.format });
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {(error || validationError) ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {validationError ?? error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_180px]">
        <label className="grid gap-2 text-sm font-medium">
          Название
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            maxLength={180}
            placeholder="Например, Турция для семьи"
            value={values.title}
            onChange={(event) =>
              setValues((current) => ({ ...current, title: event.target.value }))
            }
          />
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Формат
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            value={values.format}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                format: event.target.value as ProposalFormat
              }))
            }
          >
            {proposalFormats.map((format) => (
              <option key={format.value} value={format.value}>
                {format.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="grid gap-2 text-sm font-medium">
        Текст предложения
        <textarea
          className="min-h-56 rounded-md border bg-background px-3 py-2 text-sm leading-6 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="Напишите текст, который агент затем скопирует и отправит клиенту вручную."
          value={values.content}
          onChange={(event) =>
            setValues((current) => ({ ...current, content: event.target.value }))
          }
        />
      </label>

      <div className="rounded-md border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          Превью
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
          {values.content.trim() || "Текст предложения появится здесь."}
        </p>
      </div>

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

function ProposalCard({
  isDeleting,
  proposal,
  onCopy,
  onDelete,
  onEdit
}: {
  isDeleting: boolean;
  proposal: Proposal;
  onCopy: (proposal: Proposal) => void;
  onDelete: (proposal: Proposal) => void;
  onEdit: (proposal: Proposal) => void;
}) {
  return (
    <article className="rounded-lg border bg-background p-4 transition hover:border-primary/40 hover:bg-muted/30">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold">{proposal.title}</h4>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800">
              {proposalFormatLabels[proposal.format]}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Обновлено {formatDateTime(proposal.updatedAt)}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            className="rounded-md border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            type="button"
            onClick={() => onCopy(proposal)}
          >
            Скопировать
          </button>
          <button
            className="rounded-md border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            type="button"
            onClick={() => onEdit(proposal)}
          >
            Редактировать
          </button>
          <button
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDeleting}
            type="button"
            onClick={() => onDelete(proposal)}
          >
            {isDeleting ? "Удаляем..." : "Удалить"}
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-md border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          Превью для ручной отправки
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
          {proposal.content}
        </p>
      </div>
    </article>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
