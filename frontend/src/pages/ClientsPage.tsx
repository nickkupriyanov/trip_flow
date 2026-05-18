import { EmptyState } from "@/pages/components/EmptyState";
import { PageHeader } from "@/pages/components/PageHeader";

export function ClientsPage() {
  return (
    <section className="space-y-6">
      <PageHeader
        title="Клиенты"
        description="Записи клиентов появятся здесь после добавления авторизации и управления клиентами."
      />

      <EmptyState
        title="Рабочая область клиентов готова"
        description="Scaffold резервирует эту страницу для списка клиентов, поиска и перехода в карточку клиента на следующих шагах roadmap."
      />
    </section>
  );
}
