import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Proposal } from "@/lib/api";
import { formatDateTime } from "@/lib/formatters";
import { proposalFormatLabels } from "@/pages/travel-request-detail/proposalMeta";

export function ProposalCard({
  isCopied,
  isDeleting,
  proposal,
  onCopy,
  onDelete,
  onEdit
}: {
  isCopied: boolean;
  isDeleting: boolean;
  proposal: Proposal;
  onCopy: (proposal: Proposal) => void;
  onDelete: (proposal: Proposal) => void;
  onEdit: (proposal: Proposal) => void;
}) {
  return (
    <Card className="bg-background transition [contain-intrinsic-size:260px] [content-visibility:auto] hover:border-primary/40 hover:bg-muted/30">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-semibold">{proposal.title}</h4>
              <Badge variant="sky">
                {proposalFormatLabels[proposal.format]}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Обновлено {formatDateTime(proposal.updatedAt)}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant={isCopied ? "secondary" : "outline"}
              type="button"
              onClick={() => onCopy(proposal)}
            >
              {isCopied ? "Скопировано" : "Скопировать"}
            </Button>
            <Button variant="outline" type="button" onClick={() => onEdit(proposal)}>
              Редактировать
            </Button>
            <Button
              disabled={isDeleting}
              variant="destructive"
              type="button"
              onClick={() => onDelete(proposal)}
            >
              {isDeleting ? "Удаляем..." : "Удалить"}
            </Button>
          </div>
        </div>

        <div className="mt-4 rounded-md border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            Превью для ручной отправки
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
            {proposal.content}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
