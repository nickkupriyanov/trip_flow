import { useMutation } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  generateNextQuestionsDraft,
  type GenerateNextQuestionsOutput,
  type ProposalFormat,
  type ProposalTone
} from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import { FormField } from "@/pages/components/FormField";
import {
  proposalFormats,
  proposalTones
} from "@/pages/travel-request-detail/proposalMeta";

export function NextQuestionsPanel({
  requestId,
  token
}: {
  requestId: string;
  token: string;
}) {
  const [tone, setTone] = useState<ProposalTone>("friendly");
  const [format, setFormat] = useState<ProposalFormat>("telegram");
  const [draft, setDraft] = useState<GenerateNextQuestionsOutput | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const generateMutation = useMutation({
    mutationFn: () =>
      generateNextQuestionsDraft(token, {
        requestId,
        tone,
        format
      }),
    onSuccess: (generated) => {
      setDraft(generated);
      setCopyMessage(null);
    }
  });

  async function handleCopy() {
    if (!draft) {
      return;
    }

    try {
      await navigator.clipboard.writeText(draft.message);
      setCopyMessage("Текст вопросов скопирован.");
      window.setTimeout(() => setCopyMessage(null), 2500);
    } catch {
      setCopyMessage("Не удалось скопировать текст. Выделите его вручную.");
    }
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold">AI-вопросы для уточнения</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Сформируйте черновик следующего сообщения клиенту по данным заявки.
            </p>
          </div>
          <Button
            disabled={generateMutation.isPending}
            type="button"
            onClick={() => generateMutation.mutate()}
          >
            {generateMutation.isPending ? "Генерируем..." : "Сгенерировать вопросы"}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Тон">
            <Select
              value={tone}
              onValueChange={(value) => setTone(value as ProposalTone)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {proposalTones.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Формат">
            <Select
              value={format}
              onValueChange={(value) => setFormat(value as ProposalFormat)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {proposalFormats.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        {generateMutation.isError ? (
          <Alert className="mt-4" variant="destructive">
            <AlertDescription>
              {getApiErrorMessage(generateMutation.error)}
            </AlertDescription>
          </Alert>
        ) : null}

        {!draft && !generateMutation.isPending && !generateMutation.isError ? (
          <p className="mt-4 rounded-md border border-dashed bg-background px-3 py-4 text-sm leading-6 text-muted-foreground">
            Черновика пока нет. AI предложит только вопросы, которые помогают
            уточнить заявку перед подбором или предложением.
          </p>
        ) : null}

        {draft ? (
          <div className="mt-5 space-y-4">
            <Alert className="border-sky-200 bg-sky-50 text-sky-800">
              <AlertDescription>{draft.shortSummary}</AlertDescription>
            </Alert>

            <div>
              <h4 className="text-sm font-semibold">Что уточнить</h4>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-foreground">
                {draft.questions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ol>
            </div>

            <FormField label="Текст для клиента">
              <Textarea
                className="min-h-32"
                readOnly
                value={draft.message}
              />
            </FormField>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {copyMessage ? (
                <p className="text-sm text-muted-foreground">{copyMessage}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Проверьте текст перед отправкой клиенту.
                </p>
              )}
              <Button
                className="gap-2"
                type="button"
                variant="outline"
                onClick={handleCopy}
              >
                <Copy className="h-4 w-4" />
                Скопировать
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
