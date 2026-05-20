import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Currency, TourOption, TourOptionInput } from "@/lib/api";
import { FormField } from "@/pages/components/FormField";

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
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <FormField error={form.formState.errors.title?.message} label="Название">
          <Input
            placeholder="Семейный вариант в Белеке"
            {...form.register("title")}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Страна">
            <Input
              placeholder="Турция"
              {...form.register("country")}
            />
          </FormField>
          <FormField label="Курорт">
            <Input
              placeholder="Белек"
              {...form.register("resort")}
            />
          </FormField>
        </div>
        <FormField label="Отель">
          <Input
            placeholder="Pine Beach"
            {...form.register("hotelName")}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Звёзд">
            <Input
              max="5"
              min="1"
              type="number"
              {...form.register("hotelStars")}
            />
          </FormField>
          <FormField label="Ночей">
            <Input
              min="0"
              type="number"
              {...form.register("nights")}
            />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Дата от">
            <Input
              type="date"
              {...form.register("dateFrom")}
            />
          </FormField>
          <FormField label="Дата до">
            <Input
              type="date"
              {...form.register("dateTo")}
            />
          </FormField>
        </div>
        <FormField label="Тип номера">
          <Input
            placeholder="Family room"
            {...form.register("roomType")}
          />
        </FormField>
        <FormField label="Питание">
          <Input
            placeholder="All inclusive"
            {...form.register("mealType")}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
          <FormField label="Цена">
            <Input
              min="0"
              type="number"
              {...form.register("price")}
            />
          </FormField>
          <FormField label="Валюта">
            <Select
              value={form.watch("currency")}
              onValueChange={(value) =>
                form.setValue("currency", value as Currency, {
                  shouldDirty: true,
                  shouldValidate: true
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RUB">RUB</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>
        <FormField label="Ссылка">
          <Input
            placeholder="https://..."
            {...form.register("link")}
          />
        </FormField>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Плюсы">
          <Textarea
            placeholder="детский клуб, короткий трансфер"
            {...form.register("prosText")}
          />
        </FormField>
        <FormField label="Минусы">
          <Textarea
            placeholder="дороже бюджета, мало номеров"
            {...form.register("consText")}
          />
        </FormField>
      </div>

      <FormField label="Комментарий агента">
        <Textarea
          placeholder="Почему вариант подходит или что проверить перед отправкой"
          {...form.register("agentComment")}
        />
      </FormField>

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
          <Button variant="outline" type="button" onClick={onCancel}>
            Отмена
          </Button>
        ) : null}
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Сохраняем..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
