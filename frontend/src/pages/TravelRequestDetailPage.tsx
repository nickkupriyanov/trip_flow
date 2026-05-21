import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";

import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  deleteTravelRequest,
  fetchClient,
  fetchTravelRequest,
  updateTravelRequest,
  type TravelRequestInput
} from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import { queryKeys } from "@/lib/queryKeys";
import { CommunicationNotesPanel } from "@/pages/components/CommunicationNotesPanel";
import { ErrorState, LoadingState } from "@/pages/components/Feedback";
import { TravelRequestStatusBadge } from "@/pages/components/StatusBadge";
import { TravelRequestForm } from "@/pages/components/TravelRequestForm";
import { NextQuestionsPanel } from "@/pages/travel-request-detail/NextQuestionsPanel";
import { ProposalsPanel } from "@/pages/travel-request-detail/ProposalsPanel";
import { TourOptionsPanel } from "@/pages/travel-request-detail/TourOptionsPanel";
import { TravelRequestSummary } from "@/pages/travel-request-detail/TravelRequestSummary";

export function TravelRequestDetailPage() {
  const { requestId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const requestQuery = useQuery({
    queryKey: queryKeys.travelRequest(requestId),
    queryFn: () => fetchTravelRequest(token!, requestId!),
    enabled: Boolean(token && requestId)
  });

  const clientId = requestQuery.data?.clientId;
  const clientQuery = useQuery({
    queryKey: queryKeys.client(clientId),
    queryFn: () => fetchClient(token!, clientId!),
    enabled: Boolean(token && clientId)
  });

  const updateMutation = useMutation({
    mutationFn: (payload: TravelRequestInput) =>
      updateTravelRequest(token!, requestId!, payload),
    onSuccess: async (updated) => {
      setFormError(null);
      setIsEditing(false);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.travelRequest(requestId)
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.clientRequests(updated.clientId)
      });
    },
    onError: (error) => setFormError(getApiErrorMessage(error))
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTravelRequest(token!, requestId!),
    onSuccess: async () => {
      if (clientId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.clientRequests(clientId)
        });
        navigate(`/clients/${clientId}`, { replace: true });
      } else {
        navigate("/clients", { replace: true });
      }
    }
  });

  if (!requestId) {
    return <Navigate to="/clients" replace />;
  }

  async function handleUpdate(payload: TravelRequestInput) {
    await updateMutation.mutateAsync(payload);
  }

  async function handleDelete() {
    if (!window.confirm("Удалить заявку? Это действие нельзя отменить.")) {
      return;
    }
    await deleteMutation.mutateAsync();
  }

  if (requestQuery.isLoading) {
    return <LoadingState text="Загружаем заявку..." />;
  }

  if (requestQuery.isError) {
    return (
      <section className="space-y-4">
        <Link className="text-sm font-medium text-primary" to="/clients">
          Назад к клиентам
        </Link>
        <ErrorState message={getApiErrorMessage(requestQuery.error)} />
      </section>
    );
  }

  const request = requestQuery.data;
  if (!request) {
    return null;
  }

  const clientName = clientQuery.data?.fullName ?? "клиенту";

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            className="text-sm font-medium text-primary"
            to={`/clients/${request.clientId}`}
          >
            Назад к клиенту
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-semibold tracking-normal">
              {request.destination || "Заявка без направления"}
            </h2>
            <TravelRequestStatusBadge status={request.status} />
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Параметры поездки по {clientName}. Здесь агент уточняет вводные перед
            подбором вариантов тура.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              setFormError(null);
              setIsEditing((value) => !value);
            }}
          >
            {isEditing ? "Закрыть форму" : "Редактировать"}
          </Button>
          <Button
            disabled={deleteMutation.isPending}
            variant="destructive"
            type="button"
            onClick={handleDelete}
          >
            {deleteMutation.isPending ? "Удаляем..." : "Удалить"}
          </Button>
        </div>
      </div>

      {deleteMutation.isError ? (
        <ErrorState message={getApiErrorMessage(deleteMutation.error)} />
      ) : null}

      {isEditing ? (
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-5 text-lg font-semibold">Данные заявки</h3>
            <TravelRequestForm
              error={formError}
              isSubmitting={updateMutation.isPending}
              request={request}
              submitLabel="Сохранить заявку"
              onCancel={() => setIsEditing(false)}
              onSubmit={handleUpdate}
            />
          </CardContent>
        </Card>
      ) : (
        <TravelRequestSummary request={request} />
      )}

      <NextQuestionsPanel requestId={request.id} token={token!} />
      <TourOptionsPanel requestId={request.id} token={token!} />
      <CommunicationNotesPanel
        scope={{ kind: "request", clientId: request.clientId, requestId: request.id }}
        token={token!}
      />
      <ProposalsPanel requestId={request.id} token={token!} />
    </section>
  );
}
