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
import type {
  TravelRequest,
  TravelRequestInput,
  TravelRequestStatus
} from "@/lib/api";
import { FormField } from "@/pages/components/FormField";

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
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <FormField error={form.formState.errors.status?.message} label="Статус">
          <Select
            value={form.watch("status")}
            onValueChange={(value) =>
              form.setValue("status", value as TravelRequestStatus, {
                shouldDirty: true,
                shouldValidate: true
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Направление">
          <Input
            placeholder="Турция, Белек"
            {...form.register("destination")}
          />
        </FormField>
        <FormField label="Город вылета">
          <Input
            placeholder="Москва"
            {...form.register("departureCity")}
          />
        </FormField>
        <FormField label="Тип поездки">
          <Input
            placeholder="семейный пляж, honeymoon"
            {...form.register("travelType")}
          />
        </FormField>
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
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Ночей от">
            <Input
              min="0"
              type="number"
              {...form.register("nightsFrom")}
            />
          </FormField>
          <FormField label="Ночей до">
            <Input
              min="0"
              type="number"
              {...form.register("nightsTo")}
            />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField error={form.formState.errors.adults?.message} label="Взрослых">
            <Input
              min="1"
              type="number"
              {...form.register("adults")}
            />
          </FormField>
          <FormField error={form.formState.errors.children?.message} label="Детей">
            <Input
              min="0"
              type="number"
              {...form.register("children")}
            />
          </FormField>
        </div>
        <FormField label="Возраст детей">
          <Input
            placeholder="7, 11"
            {...form.register("childrenAgesText")}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Бюджет от">
            <Input
              min="0"
              type="number"
              {...form.register("budgetMin")}
            />
          </FormField>
          <FormField label="Бюджет до">
            <Input
              min="0"
              type="number"
              {...form.register("budgetMax")}
            />
          </FormField>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Пожелания">
          <Textarea
            className="min-h-28"
            placeholder="Что важно клиенту в поездке"
            {...form.register("wishes")}
          />
        </FormField>
        <FormField label="Ограничения">
          <Textarea
            className="min-h-28"
            placeholder="Что нужно исключить"
            {...form.register("restrictions")}
          />
        </FormField>
      </div>

      <FormField label="Внутренний комментарий">
        <Textarea
          placeholder="Заметка только для агента"
          {...form.register("internalComment")}
        />
      </FormField>

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
