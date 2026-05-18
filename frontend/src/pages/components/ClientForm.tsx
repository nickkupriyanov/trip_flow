import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { Client, ClientInput } from "@/lib/api";

const clientFormSchema = z.object({
  fullName: z.string().trim().min(1, "Введите имя клиента").max(160),
  phone: z.string().optional(),
  email: z.string().optional(),
  telegram: z.string().optional(),
  whatsapp: z.string().optional(),
  city: z.string().optional(),
  source: z.string().optional(),
  tagsText: z.string().optional(),
  notes: z.string().optional()
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

type ClientFormProps = {
  client?: Client;
  error?: string | null;
  isSubmitting: boolean;
  onCancel?: () => void;
  onSubmit: (payload: ClientInput) => Promise<void> | void;
  submitLabel: string;
};

function emptyToNull(value?: string): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function tagsToText(tags: string[] | undefined): string {
  return tags?.join(", ") ?? "";
}

function parseTags(value?: string): string[] {
  return (
    value
      ?.split(",")
      .map((tag) => tag.trim())
      .filter(Boolean) ?? []
  );
}

export function ClientForm({
  client,
  error,
  isSubmitting,
  onCancel,
  onSubmit,
  submitLabel
}: ClientFormProps) {
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      fullName: client?.fullName ?? "",
      phone: client?.phone ?? "",
      email: client?.email ?? "",
      telegram: client?.telegram ?? "",
      whatsapp: client?.whatsapp ?? "",
      city: client?.city ?? "",
      source: client?.source ?? "",
      tagsText: tagsToText(client?.tags),
      notes: client?.notes ?? ""
    }
  });

  useEffect(() => {
    form.reset({
      fullName: client?.fullName ?? "",
      phone: client?.phone ?? "",
      email: client?.email ?? "",
      telegram: client?.telegram ?? "",
      whatsapp: client?.whatsapp ?? "",
      city: client?.city ?? "",
      source: client?.source ?? "",
      tagsText: tagsToText(client?.tags),
      notes: client?.notes ?? ""
    });
  }, [client, form]);

  function handleSubmit(values: ClientFormValues) {
    return onSubmit({
      fullName: values.fullName.trim(),
      phone: emptyToNull(values.phone),
      email: emptyToNull(values.email),
      telegram: emptyToNull(values.telegram),
      whatsapp: emptyToNull(values.whatsapp),
      city: emptyToNull(values.city),
      source: emptyToNull(values.source),
      tags: parseTags(values.tagsText),
      notes: emptyToNull(values.notes)
    });
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <Field
        error={form.formState.errors.fullName?.message}
        label="Имя клиента"
      >
        <input
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
          {...form.register("fullName")}
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Телефон">
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
            {...form.register("phone")}
          />
        </Field>
        <Field label="Email">
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
            type="email"
            {...form.register("email")}
          />
        </Field>
        <Field label="Telegram">
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
            {...form.register("telegram")}
          />
        </Field>
        <Field label="WhatsApp">
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
            {...form.register("whatsapp")}
          />
        </Field>
        <Field label="Город">
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
            {...form.register("city")}
          />
        </Field>
        <Field label="Источник">
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
            {...form.register("source")}
          />
        </Field>
      </div>

      <Field label="Теги">
        <input
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
          placeholder="семья, VIP, повторный клиент"
          {...form.register("tagsText")}
        />
      </Field>

      <Field label="Заметки">
        <textarea
          className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
          {...form.register("notes")}
        />
      </Field>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
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
      {error ? <span className="block text-sm text-red-700">{error}</span> : null}
    </label>
  );
}
