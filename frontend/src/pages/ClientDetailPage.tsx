import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";

import { useAuth } from "@/auth/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  ApiError,
  createTravelRequest,
  deleteClient,
  fetchClient,
  fetchClientPreferences,
  fetchClientRequests,
  updateClient,
  upsertClientPreferences,
  type Client,
  type ClientInput,
  type ClientPreference,
  type ClientPreferenceInput,
  type HotelLevel,
  type TravelRequest,
  type TravelRequestInput
} from "@/lib/api";
import { formatRequestMeta } from "@/lib/formatters";
import { ClientForm } from "@/pages/components/ClientForm";
import { CommunicationNotesPanel } from "@/pages/components/CommunicationNotesPanel";
import { EmptyState } from "@/pages/components/EmptyState";
import { ErrorState, LoadingState } from "@/pages/components/Feedback";
import { FormField } from "@/pages/components/FormField";
import { TravelRequestStatusBadge } from "@/pages/components/StatusBadge";
import { TravelRequestForm } from "@/pages/components/TravelRequestForm";

const preferenceSchema = z.object({
  preferredDestinationsText: z.string().optional(),
  dislikedDestinationsText: z.string().optional(),
  preferredHotelLevel: z.enum(["", "3*", "4*", "5*", "luxury"]),
  mealPreferencesText: z.string().optional(),
  travelStyleText: z.string().optional(),
  importantFactorsText: z.string().optional(),
  avoidFactorsText: z.string().optional(),
  averageBudgetMin: z.string().optional(),
  averageBudgetMax: z.string().optional()
});

type PreferenceFormValues = z.infer<typeof preferenceSchema>;

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return "Не удалось выполнить действие. Попробуйте ещё раз.";
}

function listToText(values: string[] | undefined): string {
  return values?.join(", ") ?? "";
}

function textToList(value?: string): string[] {
  return (
    value
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean) ?? []
  );
}

function numberOrNull(value?: string): number | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? Number(trimmed) : null;
}

export function ClientDetailPage() {
  const { clientId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const clientQuery = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => fetchClient(token!, clientId!),
    enabled: Boolean(token && clientId)
  });

  const preferencesQuery = useQuery({
    queryKey: ["client-preferences", clientId],
    queryFn: () => fetchClientPreferences(token!, clientId!),
    enabled: Boolean(token && clientId)
  });

  const updateMutation = useMutation({
    mutationFn: (payload: ClientInput) => updateClient(token!, clientId!, payload),
    onSuccess: async () => {
      setClientError(null);
      setIsEditingClient(false);
      await queryClient.invalidateQueries({ queryKey: ["client", clientId] });
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (error) => setClientError(getErrorMessage(error))
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteClient(token!, clientId!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      navigate("/clients", { replace: true });
    }
  });

  if (!clientId) {
    return <Navigate to="/clients" replace />;
  }

  async function handleClientUpdate(payload: ClientInput) {
    await updateMutation.mutateAsync(payload);
  }

  async function handleDelete() {
    if (!window.confirm("Удалить клиента? Это действие нельзя отменить.")) {
      return;
    }
    await deleteMutation.mutateAsync();
  }

  if (clientQuery.isLoading) {
    return <LoadingState text="Загружаем клиента..." />;
  }

  if (clientQuery.isError) {
    return (
      <section className="space-y-4">
        <Link className="text-sm font-medium text-primary" to="/clients">
          Назад к клиентам
        </Link>
        <ErrorState message={getErrorMessage(clientQuery.error)} />
      </section>
    );
  }

  const client = clientQuery.data;
  if (!client) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link className="text-sm font-medium text-primary" to="/clients">
            Назад к клиентам
          </Link>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal">
            {client.fullName}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Карточка клиента перед заявками: контакты, заметки и устойчивые предпочтения.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              setClientError(null);
              setIsEditingClient((value) => !value);
            }}
          >
            {isEditingClient ? "Закрыть форму" : "Редактировать"}
          </Button>
          <Button
            disabled={deleteMutation.isPending}
            variant="destructive"
            type="button"
            onClick={handleDelete}
          >
            {deleteMutation.isPending ? "Удаляем..." : "Удалить"}
          </Button>
        </div>
      </div>

      {deleteMutation.isError ? (
        <ErrorState message={getErrorMessage(deleteMutation.error)} />
      ) : null}

      {isEditingClient ? (
        <Card>
          <CardHeader>
            <CardTitle>Данные клиента</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientForm
              client={client}
              error={clientError}
              isSubmitting={updateMutation.isPending}
              submitLabel="Сохранить клиента"
              onCancel={() => setIsEditingClient(false)}
              onSubmit={handleClientUpdate}
            />
          </CardContent>
        </Card>
      ) : (
        <ClientSummary client={client} />
      )}

      <PreferencePanel
        clientId={client.id}
        error={preferencesQuery.isError ? getErrorMessage(preferencesQuery.error) : null}
        isLoading={preferencesQuery.isLoading}
        preferences={preferencesQuery.data ?? null}
        token={token!}
      />

      <CommunicationNotesPanel
        scope={{ kind: "client", clientId: client.id }}
        token={token!}
      />

      <RequestsPanel clientId={client.id} token={token!} />
    </section>
  );
}

function ClientSummary({ client }: { client: Client }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>Контакты</CardTitle>
        </CardHeader>
        <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Info label="Телефон" value={client.phone} />
          <Info label="Email" value={client.email} />
          <Info label="Telegram" value={client.telegram} />
          <Info label="WhatsApp" value={client.whatsapp} />
          <Info label="Город" value={client.city} />
          <Info label="Источник" value={client.source} />
        </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Заметки</CardTitle>
        </CardHeader>
        <CardContent>
        <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
          {client.notes || "Заметок пока нет."}
        </p>
        <div className="mt-5 flex flex-wrap gap-1.5">
          {client.tags.length > 0 ? (
            client.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">Без тегов</span>
          )}
        </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-foreground">{value || "Не указано"}</dd>
    </div>
  );
}

function PreferencePanel({
  clientId,
  error,
  isLoading,
  preferences,
  token
}: {
  clientId: string;
  error: string | null;
  isLoading: boolean;
  preferences: ClientPreference | null;
  token: string;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<PreferenceFormValues>({
    resolver: zodResolver(preferenceSchema),
    defaultValues: toPreferenceValues(preferences)
  });

  useEffect(() => {
    form.reset(toPreferenceValues(preferences));
  }, [form, preferences]);

  const mutation = useMutation({
    mutationFn: (payload: ClientPreferenceInput) =>
      upsertClientPreferences(token, clientId, payload),
    onSuccess: async () => {
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ["client-preferences", clientId] });
    },
    onError: (mutationError) => setFormError(getErrorMessage(mutationError))
  });

  function handleSubmit(values: PreferenceFormValues) {
    const hotelLevel =
      values.preferredHotelLevel === ""
        ? null
        : (values.preferredHotelLevel as HotelLevel);

    return mutation.mutateAsync({
      preferredDestinations: textToList(values.preferredDestinationsText),
      dislikedDestinations: textToList(values.dislikedDestinationsText),
      preferredHotelLevel: hotelLevel,
      mealPreferences: textToList(values.mealPreferencesText),
      travelStyle: textToList(values.travelStyleText),
      importantFactors: textToList(values.importantFactorsText),
      avoidFactors: textToList(values.avoidFactorsText),
      averageBudgetMin: numberOrNull(values.averageBudgetMin),
      averageBudgetMax: numberOrNull(values.averageBudgetMax)
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Предпочтения</CardTitle>
        <CardDescription>
          Рабочие подсказки для будущих заявок и подбора туров.
        </CardDescription>
      </CardHeader>
      <CardContent>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Загружаем предпочтения...</p>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!isLoading && !error ? (
        <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Любимые направления">
              <Input
                placeholder="Турция, Греция"
                {...form.register("preferredDestinationsText")}
              />
            </FormField>
            <FormField label="Не любит">
              <Input
                placeholder="шумные города, долгие перелёты"
                {...form.register("dislikedDestinationsText")}
              />
            </FormField>
            <FormField label="Уровень отеля">
              <Select
                value={form.watch("preferredHotelLevel") || "none"}
                onValueChange={(value) =>
                  form.setValue("preferredHotelLevel", value === "none" ? "" : value as HotelLevel, {
                    shouldDirty: true,
                    shouldValidate: true
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не указан</SelectItem>
                  <SelectItem value="3*">3*</SelectItem>
                  <SelectItem value="4*">4*</SelectItem>
                  <SelectItem value="5*">5*</SelectItem>
                  <SelectItem value="luxury">luxury</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Питание">
              <Input
                placeholder="AI, завтраки"
                {...form.register("mealPreferencesText")}
              />
            </FormField>
            <FormField label="Стиль поездки">
              <Input
                placeholder="семейный пляж, спокойный отдых"
                {...form.register("travelStyleText")}
              />
            </FormField>
            <FormField label="Важные факторы">
              <Input
                placeholder="детский клуб, короткий трансфер"
                {...form.register("importantFactorsText")}
              />
            </FormField>
            <FormField label="Избегать">
              <Input
                placeholder="лестницы, шумная анимация"
                {...form.register("avoidFactorsText")}
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Бюджет от">
                <Input
                  min="0"
                  type="number"
                  {...form.register("averageBudgetMin")}
                />
              </FormField>
              <FormField label="Бюджет до">
                <Input
                  min="0"
                  type="number"
                  {...form.register("averageBudgetMax")}
                />
              </FormField>
            </div>
          </div>

          <div className="flex justify-end">
            <Button disabled={mutation.isPending} type="submit">
              {mutation.isPending ? "Сохраняем..." : "Сохранить предпочтения"}
            </Button>
          </div>
        </form>
      ) : null}
      </CardContent>
    </Card>
  );
}

function RequestsPanel({ clientId, token }: { clientId: string; token: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const requestsQuery = useQuery({
    queryKey: ["client-requests", clientId],
    queryFn: () => fetchClientRequests(token, clientId)
  });

  const createMutation = useMutation({
    mutationFn: (payload: TravelRequestInput) =>
      createTravelRequest(token, clientId, payload),
    onSuccess: async (request) => {
      setFormError(null);
      setIsCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["client-requests", clientId] });
      navigate(`/requests/${request.id}`);
    },
    onError: (error) => setFormError(getErrorMessage(error))
  });

  async function handleCreate(payload: TravelRequestInput) {
    await createMutation.mutateAsync(payload);
  }

  const requests = requestsQuery.data ?? [];

  return (
    <Card>
      <CardContent className="p-5">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Заявки на путешествия</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Конкретные поездки клиента: вводные, бюджет, даты и статус работы.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setFormError(null);
            setIsCreateOpen((value) => !value);
          }}
        >
          {isCreateOpen ? "Скрыть форму" : "Создать заявку"}
        </Button>
      </div>

      {isCreateOpen ? (
        <div className="mb-5 rounded-lg border bg-background p-4">
          <TravelRequestForm
            error={formError}
            isSubmitting={createMutation.isPending}
            submitLabel="Создать заявку"
            onCancel={() => setIsCreateOpen(false)}
            onSubmit={handleCreate}
          />
        </div>
      ) : null}

      {requestsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Загружаем заявки...</p>
      ) : null}

      {requestsQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{getErrorMessage(requestsQuery.error)}</AlertDescription>
        </Alert>
      ) : null}

      {!requestsQuery.isLoading && !requestsQuery.isError && requests.length === 0 ? (
        <EmptyState
          title="Заявок пока нет"
          description="Создайте первую заявку, когда клиент описал направление, даты или бюджет поездки."
        />
      ) : null}

      {requests.length > 0 ? (
        <div className="grid gap-3">
          {requests.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      ) : null}
      </CardContent>
    </Card>
  );
}

function RequestCard({ request }: { request: TravelRequest }) {
  return (
    <Card className="bg-background transition hover:border-primary/40 hover:bg-muted/30">
      <Link className="block p-4" to={`/requests/${request.id}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="font-semibold">
            {request.destination || "Заявка без направления"}
          </h4>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatRequestMeta(request, "Параметры поездки ещё не заполнены")}
          </p>
        </div>
        <TravelRequestStatusBadge status={request.status} />
      </div>
      {request.wishes ? (
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          {request.wishes}
        </p>
      ) : null}
      </Link>
    </Card>
  );
}

function toPreferenceValues(
  preferences: ClientPreference | null | undefined,
): PreferenceFormValues {
  return {
    preferredDestinationsText: listToText(preferences?.preferredDestinations),
    dislikedDestinationsText: listToText(preferences?.dislikedDestinations),
    preferredHotelLevel: preferences?.preferredHotelLevel ?? "",
    mealPreferencesText: listToText(preferences?.mealPreferences),
    travelStyleText: listToText(preferences?.travelStyle),
    importantFactorsText: listToText(preferences?.importantFactors),
    avoidFactorsText: listToText(preferences?.avoidFactors),
    averageBudgetMin: preferences?.averageBudgetMin?.toString() ?? "",
    averageBudgetMax: preferences?.averageBudgetMax?.toString() ?? ""
  };
}
