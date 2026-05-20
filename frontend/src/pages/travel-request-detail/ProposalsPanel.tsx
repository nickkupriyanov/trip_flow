import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

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
import {
  createProposal,
  deleteProposal,
  fetchProposals,
  fetchTourOptions,
  generateProposalDraft,
  updateProposal,
  type GenerateProposalOutput,
  type Proposal,
  type ProposalFormat,
  type ProposalInput,
  type ProposalTone
} from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import { queryKeys } from "@/lib/queryKeys";
import { EmptyState } from "@/pages/components/EmptyState";
import { FormField } from "@/pages/components/FormField";
import { ProposalCard } from "@/pages/travel-request-detail/ProposalCard";
import { ProposalForm } from "@/pages/travel-request-detail/ProposalForm";
import {
  proposalFormats,
  proposalTones,
  type ProposalFormState
} from "@/pages/travel-request-detail/proposalMeta";

export function ProposalsPanel({
  requestId,
  token
}: {
  requestId: string;
  token: string;
}) {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationSummary, setGenerationSummary] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProposalFormState | null>(null);
  const [generationTone, setGenerationTone] = useState<ProposalTone>("friendly");
  const [generationFormat, setGenerationFormat] =
    useState<ProposalFormat>("telegram");
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [copiedProposalId, setCopiedProposalId] = useState<string | null>(null);
  const selectedOptionIdSet = useMemo(
    () => new Set(selectedOptionIds),
    [selectedOptionIds],
  );

  const proposalsQuery = useQuery({
    queryKey: queryKeys.proposals(requestId),
    queryFn: () => fetchProposals(token, requestId)
  });

  const optionsQuery = useQuery({
    queryKey: queryKeys.tourOptions(requestId),
    queryFn: () => fetchTourOptions(token, requestId)
  });

  const createMutation = useMutation({
    mutationFn: (payload: ProposalInput) => createProposal(token, requestId, payload),
    onSuccess: async () => {
      setFormError(null);
      setCopyMessage(null);
      setDraft(null);
      setGenerationSummary(null);
      setIsCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.proposals(requestId) });
    },
    onError: (error) => setFormError(getApiErrorMessage(error))
  });

  const updateMutation = useMutation({
    mutationFn: ({
      proposalId,
      payload
    }: {
      proposalId: string;
      payload: ProposalInput;
    }) => updateProposal(token, proposalId, payload),
    onSuccess: async () => {
      setFormError(null);
      setCopyMessage(null);
      setEditingProposalId(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.proposals(requestId) });
    },
    onError: (error) => setFormError(getApiErrorMessage(error))
  });

  const deleteMutation = useMutation({
    mutationFn: (proposalId: string) => deleteProposal(token, proposalId),
    onSuccess: async () => {
      setMutationError(null);
      setCopyMessage(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.proposals(requestId) });
    },
    onError: (error) => setMutationError(getApiErrorMessage(error))
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      generateProposalDraft(token, {
        requestId,
        selectedOptionIds,
        tone: generationTone,
        format: generationFormat
      }),
    onSuccess: (generated: GenerateProposalOutput) => {
      setGenerationError(null);
      setCopyMessage(null);
      setFormError(null);
      setEditingProposalId(null);
      setDraft({
        title: generated.title,
        content: generated.message,
        format: generationFormat
      });
      setGenerationSummary(generated.shortSummary);
      setIsCreateOpen(true);
    },
    onError: (error) => setGenerationError(getApiErrorMessage(error))
  });

  async function handleCreate(payload: ProposalInput) {
    await createMutation.mutateAsync(payload);
  }

  async function handleUpdate(proposalId: string, payload: ProposalInput) {
    await updateMutation.mutateAsync({ proposalId, payload });
  }

  async function handleDelete(proposal: Proposal) {
    if (!window.confirm("Удалить предложение? Это действие нельзя отменить.")) {
      return;
    }
    await deleteMutation.mutateAsync(proposal.id);
  }

  async function handleCopy(proposal: Proposal) {
    try {
      await navigator.clipboard.writeText(proposal.content);
      setCopyMessage(`Текст "${proposal.title}" скопирован.`);
      setCopiedProposalId(proposal.id);
      window.setTimeout(() => setCopiedProposalId(null), 2500);
    } catch {
      setCopiedProposalId(null);
      setCopyMessage("Не удалось скопировать текст. Выделите его в превью вручную.");
    }
  }

  function toggleSelectedOption(optionId: string) {
    setSelectedOptionIds((current) =>
      selectedOptionIdSet.has(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId],
    );
  }

  const proposals = proposalsQuery.data ?? [];
  const options = optionsQuery.data ?? [];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Предложения</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Редактируемые тексты для отправки клиенту в Telegram или WhatsApp.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setGenerationError(null);
                setIsGenerateOpen((value) => !value);
              }}
            >
              {isGenerateOpen ? "Скрыть AI" : "Сгенерировать черновик"}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setFormError(null);
                setCopyMessage(null);
                setDraft(null);
                setGenerationSummary(null);
                setEditingProposalId(null);
                setIsCreateOpen((value) => !value);
              }}
            >
              {isCreateOpen ? "Скрыть форму" : "Создать предложение"}
            </Button>
          </div>
        </div>

        {isGenerateOpen ? (
          <div className="mb-5 rounded-lg border bg-background p-4">
            <div className="grid gap-4 lg:grid-cols-[180px_180px_1fr]">
              <FormField label="Тон">
                <Select
                  value={generationTone}
                  onValueChange={(value) => setGenerationTone(value as ProposalTone)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {proposalTones.map((tone) => (
                      <SelectItem key={tone.value} value={tone.value}>
                        {tone.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Формат">
                <Select
                  value={generationFormat}
                  onValueChange={(value) =>
                    setGenerationFormat(value as ProposalFormat)
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

              <div className="grid gap-2 text-sm font-medium">
                Варианты тура
                {optionsQuery.isLoading ? (
                  <p className="rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
                    Загружаем варианты...
                  </p>
                ) : null}
                {optionsQuery.isError ? (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {getApiErrorMessage(optionsQuery.error)}
                    </AlertDescription>
                  </Alert>
                ) : null}
                {!optionsQuery.isLoading && !optionsQuery.isError ? (
                  <div className="flex flex-wrap gap-2">
                    {options.length > 0 ? (
                      options.map((option) => (
                        <label
                          className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm font-medium text-muted-foreground"
                          key={option.id}
                        >
                          <input
                            checked={selectedOptionIdSet.has(option.id)}
                            type="checkbox"
                            onChange={() => toggleSelectedOption(option.id)}
                          />
                          {option.title}
                        </label>
                      ))
                    ) : (
                      <p className="rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
                        Вариантов пока нет.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            {generationError ? (
              <Alert className="mt-4" variant="destructive">
                <AlertDescription>{generationError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="mt-4 flex justify-end">
              <Button
                disabled={generateMutation.isPending}
                type="button"
                onClick={() => generateMutation.mutate()}
              >
                {generateMutation.isPending ? "Генерируем..." : "Создать AI-черновик"}
              </Button>
            </div>
          </div>
        ) : null}

        {generationSummary ? (
          <Alert className="mb-4 border-sky-200 bg-sky-50 text-sky-800">
            <AlertDescription>{generationSummary}</AlertDescription>
          </Alert>
        ) : null}

        {isCreateOpen ? (
          <div className="mb-5 rounded-lg border bg-background p-4">
            <ProposalForm
              error={formError}
              initialValues={draft}
              isSubmitting={createMutation.isPending}
              key={draft ? `${draft.title}-${draft.content}` : "blank-proposal"}
              submitLabel="Сохранить предложение"
              onCancel={() => setIsCreateOpen(false)}
              onSubmit={handleCreate}
            />
          </div>
        ) : null}

        {mutationError ? (
          <Alert className="mb-4" variant="destructive">
            <AlertDescription>{mutationError}</AlertDescription>
          </Alert>
        ) : null}

        {copyMessage ? (
          <Alert
            aria-live="polite"
            className="mb-4 border-emerald-200 bg-emerald-50 text-emerald-800"
          >
            <AlertDescription>{copyMessage}</AlertDescription>
          </Alert>
        ) : null}

        {proposalsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Загружаем предложения...</p>
        ) : null}

        {proposalsQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>{getApiErrorMessage(proposalsQuery.error)}</AlertDescription>
          </Alert>
        ) : null}

        {!proposalsQuery.isLoading && !proposalsQuery.isError && proposals.length === 0 ? (
          <EmptyState
            title="Предложений пока нет"
            description="Соберите короткий редактируемый текст, сохраните его и скопируйте для отправки клиенту."
          />
        ) : null}

        {proposals.length > 0 ? (
          <div className="grid gap-4">
            {proposals.map((proposal) =>
              editingProposalId === proposal.id ? (
                <div className="rounded-lg border bg-background p-4" key={proposal.id}>
                  <ProposalForm
                    error={formError}
                    isSubmitting={updateMutation.isPending}
                    proposal={proposal}
                    submitLabel="Сохранить изменения"
                    onCancel={() => {
                      setFormError(null);
                      setEditingProposalId(null);
                    }}
                    onSubmit={(payload) => handleUpdate(proposal.id, payload)}
                  />
                </div>
              ) : (
                <ProposalCard
                  isDeleting={deleteMutation.isPending}
                  isCopied={copiedProposalId === proposal.id}
                  key={proposal.id}
                  proposal={proposal}
                  onCopy={handleCopy}
                  onDelete={handleDelete}
                  onEdit={(selectedProposal) => {
                    setFormError(null);
                    setCopyMessage(null);
                    setIsCreateOpen(false);
                    setEditingProposalId(selectedProposal.id);
                  }}
                />
              ),
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
