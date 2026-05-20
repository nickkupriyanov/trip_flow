import { Card, CardContent } from "@/components/ui/card";
import type { TravelRequest } from "@/lib/api";
import { formatBudget, formatRange, formatTourists } from "@/lib/formatters";

export function TravelRequestSummary({ request }: { request: TravelRequest }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <Card>
        <CardContent className="p-5">
          <h3 className="text-lg font-semibold">Параметры поездки</h3>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Info label="Направление" value={request.destination} />
            <Info label="Город вылета" value={request.departureCity} />
            <Info label="Даты" value={formatRange(request.dateFrom, request.dateTo)} />
            <Info label="Ночи" value={formatRange(request.nightsFrom, request.nightsTo)} />
            <Info label="Туристов" value={formatTourists(request)} />
            <Info label="Бюджет" value={formatBudget(request.budgetMin, request.budgetMax)} />
            <Info label="Тип поездки" value={request.travelType} />
            <Info label="Возраст детей" value={request.childrenAges.join(", ")} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="text-lg font-semibold">Контекст подбора</h3>
          <TextBlock label="Пожелания" value={request.wishes} />
          <TextBlock label="Ограничения" value={request.restrictions} />
          <TextBlock label="Внутренний комментарий" value={request.internalComment} />
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: number | string | null }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-foreground">
        {value === null || value === "" ? "Не указано" : value}
      </dd>
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="mt-4 first:mt-0">
      <h4 className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
        {label}
      </h4>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground">
        {value || "Не указано"}
      </p>
    </div>
  );
}
