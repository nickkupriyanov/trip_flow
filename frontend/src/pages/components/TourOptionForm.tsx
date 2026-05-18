import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { Currency, TourOption, TourOptionInput } from "@/lib/api";

const formSchema = z.object({
  title: z.string().trim().min(1, "Укажите название варианта"),
  country: z.string().optional(),
  resort: z.string().optional(),
  hotelName: z.string().optional(),
  hotelStars: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  nights: z.string().optional(),
  roomType: z.string().optional(),
  mealType: z.string().optional(),
  price: z.string().optional(),
  currency: z.enum(["RUB", "USD", "EUR"]),
  link: z.string().optional(),
  prosText: z.string().optional(),
  consText: z.string().optional(),
  agentComment: z.string().optional(),
  isRecommended: z.boolean()
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  error?: string | null;
  isSubmitting: boolean;
  option?: TourOption;
  submitLabel: string;
  onCancel?: () => void;
  onSubmit: (payload: TourOptionInput) => Promise<void>;
};

function optionalText(value?: string): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function optionalNumber(value?: string): number | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? Number(trimmed) : null;
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

function toValues(option?: TourOption): FormValues {
  return {
    title: option?.title ?? "",
    country: option?.country ?? "",
    resort: option?.resort ?? "",
    hotelName: option?.hotelName ?? "",
    hotelStars: option?.hotelStars?.toString() ?? "",
    dateFrom: option?.dateFrom ?? "",
    dateTo: option?.dateTo ?? "",
    nights: option?.nights?.toString() ?? "",
    roomType: option?.roomType ?? "",
    mealType: option?.mealType ?? "",
    price: option?.price?.toString() ?? "",
    currency: option?.currency ?? "RUB",
    link: option?.link ?? "",
    prosText: listToText(option?.pros),
    consText: listToText(option?.cons),
    agentComment: option?.agentComment ?? "",
    isRecommended: option?.isRecommended ?? false
  };
}

export function TourOptionForm({
  error,
  isSubmitting,
  option,
  submitLabel,
  onCancel,
  onSubmit
}: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toValues(option)
  });

  async function handleSubmit(values: FormValues) {
    await onSubmit({
      title: values.title.trim(),
      country: optionalText(values.country),
      resort: optionalText(values.resort),
      hotelName: optionalText(values.hotelName),
      hotelStars: optionalNumber(values.hotelStars),
      dateFrom: optionalText(values.dateFrom),
      dateTo: optionalText(values.dateTo),
      nights: optionalNumber(values.nights),
      roomType: optionalText(values.roomType),
      mealType: optionalText(values.mealType),
      price: optionalNumber(values.price),
      currency: values.currency as Currency,
      link: optionalText(values.link),
      pros: textToList(values.prosText),
      cons: textToList(values.consText),
      agentComment: optionalText(values.agentComment),
      isRecommended: values.isRecommended
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
        <Field error={form.formState.errors.title?.message} label="Название">
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
            placeholder="Семейный вариант в Белеке"
            {...form.register("title")}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Страна">
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
              placeholder="Турция"
              {...form.register("country")}
            />
          </Field>
          <Field label="Курорт">
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
              placeholder="Белек"
              {...form.register("resort")}
            />
          </Field>
        </div>
        <Field label="Отель">
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
            placeholder="Pine Beach"
            {...form.register("hotelName")}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Звёзд">
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
              max="5"
              min="1"
              type="number"
              {...form.register("hotelStars")}
            />
          </Field>
          <Field label="Ночей">
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
              min="0"
              type="number"
              {...form.register("nights")}
            />
          </Field>
        </div>
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
        <Field label="Тип номера">
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
            placeholder="Family room"
            {...form.register("roomType")}
          />
        </Field>
        <Field label="Питание">
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
            placeholder="All inclusive"
            {...form.register("mealType")}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
          <Field label="Цена">
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
              min="0"
              type="number"
              {...form.register("price")}
            />
          </Field>
          <Field label="Валюта">
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
              {...form.register("currency")}
            >
              <option value="RUB">RUB</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </Field>
        </div>
        <Field label="Ссылка">
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
            placeholder="https://..."
            {...form.register("link")}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Плюсы">
          <textarea
            className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
            placeholder="детский клуб, короткий трансфер"
            {...form.register("prosText")}
          />
        </Field>
        <Field label="Минусы">
          <textarea
            className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
            placeholder="дороже бюджета, мало номеров"
            {...form.register("consText")}
          />
        </Field>
      </div>

      <Field label="Комментарий агента">
        <textarea
          className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
          placeholder="Почему вариант подходит или что проверить перед отправкой"
          {...form.register("agentComment")}
        />
      </Field>

      <label className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
        <input
          className="h-4 w-4 rounded border"
          type="checkbox"
          {...form.register("isRecommended")}
        />
        Рекомендовать этот вариант
      </label>

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
