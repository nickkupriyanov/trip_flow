import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";

import { useAuth } from "@/auth/AuthContext";
import {
  ApiError,
  deleteClient,
  fetchClient,
  fetchClientPreferences,
  updateClient,
  upsertClientPreferences,
  type Client,
  type ClientInput,
  type ClientPreference,
  type ClientPreferenceInput,
  type HotelLevel
} from "@/lib/api";
import { ClientForm } from "@/pages/components/ClientForm";

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
    return (
      <section className="rounded-lg border bg-card p-6 text-sm text-muted-foreground shadow-sm">
        Загружаем клиента...
      </section>
    );
  }

  if (clientQuery.isError) {
    return (
      <section className="space-y-4">
        <Link className="text-sm font-medium text-primary" to="/clients">
          Назад к клиентам
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
          {getErrorMessage(clientQuery.error)}
        </div>
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
          <button
            className="rounded-md border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            type="button"
            onClick={() => {
              setClientError(null);
              setIsEditingClient((value) => !value);
            }}
          >
            {isEditingClient ? "Закрыть форму" : "Редактировать"}
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

      {isEditingClient ? (
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <h3 className="mb-5 text-lg font-semibold">Данные клиента</h3>
          <ClientForm
            client={client}
            error={clientError}
            isSubmitting={updateMutation.isPending}
            submitLabel="Сохранить клиента"
            onCancel={() => setIsEditingClient(false)}
            onSubmit={handleClientUpdate}
          />
        </div>
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
    </section>
  );
}

function ClientSummary({ client }: { client: Client }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Контакты</h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Info label="Телефон" value={client.phone} />
          <Info label="Email" value={client.email} />
          <Info label="Telegram" value={client.telegram} />
          <Info label="WhatsApp" value={client.whatsapp} />
          <Info label="Город" value={client.city} />
          <Info label="Источник" value={client.source} />
        </dl>
      </div>

      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Заметки</h3>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
          {client.notes || "Заметок пока нет."}
        </p>
        <div className="mt-5 flex flex-wrap gap-1.5">
          {client.tags.length > 0 ? (
            client.tags.map((tag) => (
              <span
                className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                key={tag}
              >
                {tag}
              </span>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">Без тегов</span>
          )}
        </div>
      </div>
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
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-5">
        <h3 className="text-lg font-semibold">Предпочтения</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Рабочие подсказки для будущих заявок и подбора туров.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Загружаем предпочтения...</p>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!isLoading && !error ? (
        <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
          {formError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Любимые направления">
              <input
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                placeholder="Турция, Греция"
                {...form.register("preferredDestinationsText")}
              />
            </Field>
            <Field label="Не любит">
              <input
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                placeholder="шумные города, долгие перелёты"
                {...form.register("dislikedDestinationsText")}
              />
            </Field>
            <Field label="Уровень отеля">
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                {...form.register("preferredHotelLevel")}
              >
                <option value="">Не указан</option>
                <option value="3*">3*</option>
                <option value="4*">4*</option>
                <option value="5*">5*</option>
                <option value="luxury">luxury</option>
              </select>
            </Field>
            <Field label="Питание">
              <input
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                placeholder="AI, завтраки"
                {...form.register("mealPreferencesText")}
              />
            </Field>
            <Field label="Стиль поездки">
              <input
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                placeholder="семейный пляж, спокойный отдых"
                {...form.register("travelStyleText")}
              />
            </Field>
            <Field label="Важные факторы">
              <input
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                placeholder="детский клуб, короткий трансфер"
                {...form.register("importantFactorsText")}
              />
            </Field>
            <Field label="Избегать">
              <input
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                placeholder="лестницы, шумная анимация"
                {...form.register("avoidFactorsText")}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Бюджет от">
                <input
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                  min="0"
                  type="number"
                  {...form.register("averageBudgetMin")}
                />
              </Field>
              <Field label="Бюджет до">
                <input
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                  min="0"
                  type="number"
                  {...form.register("averageBudgetMax")}
                />
              </Field>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={mutation.isPending}
              type="submit"
            >
              {mutation.isPending ? "Сохраняем..." : "Сохранить предпочтения"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
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

function Field({
  children,
  label
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
