import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type {
  TravelRequest,
  TravelRequestInput,
  TravelRequestStatus
} from "@/lib/api";

const statuses: Array<{ value: TravelRequestStatus; label: string }> = [
  { value: "new", label: "Новая" },
  { value: "clarifying", label: "Уточнение" },
  { value: "searching", label: "Подбор" },
  { value: "sent", label: "Отправлено" },
  { value: "thinking", label: "Клиент думает" },
  { value: "booked", label: "Бронь" },
  { value: "rejected", label: "Отказ" }
];

const formSchema = z.object({
  status: z.enum([
    "new",
    "clarifying",
    "searching",
    "sent",
    "thinking",
    "booked",
    "rejected"
  ]),
  destination: z.string().optional(),
  departureCity: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  nightsFrom: z.string().optional(),
  nightsTo: z.string().optional(),
  adults: z.string().refine((value) => Number(value) >= 1, {
    message: "Укажите минимум одного взрослого"
  }),
  children: z.string().refine((value) => Number(value) >= 0, {
    message: "Количество детей не может быть отрицательным"
  }),
  childrenAgesText: z.string().optional(),
  budgetMin: z.string().optional(),
  budgetMax: z.string().optional(),
  travelType: z.string().optional(),
  wishes: z.string().optional(),
  restrictions: z.string().optional(),
  internalComment: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  error?: string | null;
  isSubmitting: boolean;
  request?: TravelRequest;
  submitLabel: string;
  onCancel?: () => void;
  onSubmit: (payload: TravelRequestInput) => Promise<void>;
};

function optionalText(value?: string): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function optionalNumber(value?: string): number | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? Number(trimmed) : null;
}

function parseAges(value?: string): number[] {
  return (
    value
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map(Number)
      .filter((item) => Number.isFinite(item) && item >= 0) ?? []
  );
}

function toValues(request?: TravelRequest): FormValues {
  return {
    status: request?.status ?? "new",
    destination: request?.destination ?? "",
    departureCity: request?.departureCity ?? "",
    dateFrom: request?.dateFrom ?? "",
    dateTo: request?.dateTo ?? "",
    nightsFrom: request?.nightsFrom?.toString() ?? "",
    nightsTo: request?.nightsTo?.toString() ?? "",
    adults: request?.adults?.toString() ?? "2",
    children: request?.children?.toString() ?? "0",
    childrenAgesText: request?.childrenAges.join(", ") ?? "",
    budgetMin: request?.budgetMin?.toString() ?? "",
    budgetMax: request?.budgetMax?.toString() ?? "",
    travelType: request?.travelType ?? "",
    wishes: request?.wishes ?? "",
    restrictions: request?.restrictions ?? "",
    internalComment: request?.internalComment ?? ""
  };
}

export function TravelRequestForm({
  error,
  isSubmitting,
  request,
  submitLabel,
  onCancel,
  onSubmit
}: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toValues(request)
  });

  async function handleSubmit(values: FormValues) {
    await onSubmit({
      status: values.status,
      destination: optionalText(values.destination),
      departureCity: optionalText(values.departureCity),
      dateFrom: optionalText(values.dateFrom),
      dateTo: optionalText(values.dateTo),
      nightsFrom: optionalNumber(values.nightsFrom),
      nightsTo: optionalNumber(values.nightsTo),
      adults: Number(values.adults),
      children: Number(values.children),
      childrenAges: parseAges(values.childrenAgesText),
      budgetMin: optionalNumber(values.budgetMin),
      budgetMax: optionalNumber(values.budgetMax),
      travelType: optionalText(values.travelType),
      wishes: optionalText(values.wishes),
      restrictions: optionalText(values.restrictions),
      internalComment: optionalText(values.internalComment)
    });
  }

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field error={form.formState.errors.status?.message} label="Статус">
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
            {...form.register("status")}
          >
            {statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Направление">
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
            placeholder="Турция, Белек"
            {...form.register("destination")}
          />
        </Field>
        <Field label="Город вылета">
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
            placeholder="Москва"
            {...form.register("departureCity")}
          />
        </Field>
        <Field label="Тип поездки">
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
            placeholder="семейный пляж, honeymoon"
            {...form.register("travelType")}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Дата от">
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
              type="date"
              {...form.register("dateFrom")}
            />
          </Field>
          <Field label="Дата до">
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
              type="date"
              {...form.register("dateTo")}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ночей от">
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
              min="0"
              type="number"
              {...form.register("nightsFrom")}
            />
          </Field>
          <Field label="Ночей до">
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
              min="0"
              type="number"
              {...form.register("nightsTo")}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field error={form.formState.errors.adults?.message} label="Взрослых">
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
              min="1"
              type="number"
              {...form.register("adults")}
            />
          </Field>
          <Field error={form.formState.errors.children?.message} label="Детей">
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
              min="0"
              type="number"
              {...form.register("children")}
            />
          </Field>
        </div>
        <Field label="Возраст детей">
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
            placeholder="7, 11"
            {...form.register("childrenAgesText")}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Бюджет от">
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
              min="0"
              type="number"
              {...form.register("budgetMin")}
            />
          </Field>
          <Field label="Бюджет до">
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
              min="0"
              type="number"
              {...form.register("budgetMax")}
            />
          </Field>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Пожелания">
          <textarea
            className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
            placeholder="Что важно клиенту в поездке"
            {...form.register("wishes")}
          />
        </Field>
        <Field label="Ограничения">
          <textarea
            className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
            placeholder="Что нужно исключить"
            {...form.register("restrictions")}
          />
        </Field>
      </div>

      <Field label="Внутренний комментарий">
        <textarea
          className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
          placeholder="Заметка только для агента"
          {...form.register("internalComment")}
        />
      </Field>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <button
            className="rounded-md border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            type="button"
            onClick={onCancel}
          >
            Отмена
          </button>
        ) : null}
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

function Field({
  children,
  error,
  label
}: {
  children: React.ReactNode;
  error?: string;
  label: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error ? <span className="block text-xs text-red-700">{error}</span> : null}
    </label>
  );
}
