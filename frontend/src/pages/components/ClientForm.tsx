import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Client, ClientInput } from "@/lib/api";
import { FormField } from "@/pages/components/FormField";

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
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <FormField
        error={form.formState.errors.fullName?.message}
        label="Имя клиента"
      >
        <Input {...form.register("fullName")} />
      </FormField>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Телефон">
          <Input {...form.register("phone")} />
        </FormField>
        <FormField label="Email">
          <Input type="email" {...form.register("email")} />
        </FormField>
        <FormField label="Telegram">
          <Input {...form.register("telegram")} />
        </FormField>
        <FormField label="WhatsApp">
          <Input {...form.register("whatsapp")} />
        </FormField>
        <FormField label="Город">
          <Input {...form.register("city")} />
        </FormField>
        <FormField label="Источник">
          <Input {...form.register("source")} />
        </FormField>
      </div>

      <FormField label="Теги">
        <Input
          placeholder="семья, VIP, повторный клиент"
          {...form.register("tagsText")}
        />
      </FormField>

      <FormField label="Заметки">
        <Textarea {...form.register("notes")} />
      </FormField>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button
            variant="outline"
            type="button"
            onClick={onCancel}
          >
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
