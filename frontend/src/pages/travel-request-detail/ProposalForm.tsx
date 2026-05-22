import { useState, type FormEvent } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Proposal, ProposalFormat, ProposalInput } from "@/lib/api";
import { FormField } from "@/pages/components/FormField";
import { proposalFormats, type ProposalFormState } from "@/pages/travel-request-detail/proposalMeta";

export function ProposalForm({
  error,
  initialValues,
  isSubmitting,
  proposal,
  submitLabel,
  onCancel,
  onSubmit
}: {
  error: string | null;
  initialValues?: ProposalFormState | null;
  isSubmitting: boolean;
  proposal?: Proposal;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (payload: ProposalInput) => Promise<void>;
}) {
  const [values, setValues] = useState<ProposalFormState>({
    title: initialValues?.title ?? proposal?.title ?? "",
    content: initialValues?.content ?? proposal?.content ?? "",
    format: initialValues?.format ?? proposal?.format ?? "telegram"
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
      {error || validationError ? (
        <Alert variant="destructive">
          <AlertDescription>{validationError ?? error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_180px]">
        <FormField label="Название">
          <Input
            maxLength={180}
            placeholder="Например, Турция для семьи"
            value={values.title}
            onChange={(event) =>
              setValues((current) => ({ ...current, title: event.target.value }))
            }
          />
        </FormField>

        <FormField label="Формат">
          <Select
            value={values.format}
            onValueChange={(value) =>
              setValues((current) => ({
                ...current,
                format: value as ProposalFormat
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {proposalFormats.map((format) => (
                <SelectItem key={format.value} value={format.value}>
                  {format.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <FormField label="Текст предложения">
        <Textarea
          className="min-h-56 leading-6"
          placeholder="Напишите текст, который агент затем скопирует и отправит клиенту вручную."
          value={values.content}
          onChange={(event) =>
            setValues((current) => ({ ...current, content: event.target.value }))
          }
        />
      </FormField>

      <Tabs defaultValue="edit">
        <TabsList>
          <TabsTrigger value="edit">Редактирование</TabsTrigger>
          <TabsTrigger value="preview">Превью</TabsTrigger>
        </TabsList>
        <TabsContent value="edit">
          <Card className="bg-background p-4 text-sm text-muted-foreground">
            Сгенерированный текст остается черновиком: сохраните только после ручной проверки.
          </Card>
        </TabsContent>
        <TabsContent value="preview">
          <Card className="bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Превью
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
              {values.content.trim() || "Текст предложения появится здесь."}
            </p>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" type="button" onClick={onCancel}>
          Отмена
        </Button>
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Сохраняем..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
