import type {
  Pipeline,
  PipelineTravelRequest,
  TravelRequestStatus
} from "@/lib/api";
import { travelRequestStatuses } from "@/lib/domain";

export function moveRequestInPipeline(
  pipeline: Pipeline | undefined,
  requestId: string,
  nextStatus: TravelRequestStatus,
): Pipeline | undefined {
  if (!pipeline) {
    return pipeline;
  }

  let movedRequest: PipelineTravelRequest | undefined;
  const nextPipeline = travelRequestStatuses.reduce((grouped, status) => {
    grouped[status] = pipeline[status].filter((request) => {
      if (request.id !== requestId) {
        return true;
      }
      movedRequest = { ...request, status: nextStatus };
      return false;
    });
    return grouped;
  }, {} as Pipeline);

  if (!movedRequest) {
    return pipeline;
  }

  nextPipeline[nextStatus] = [movedRequest, ...nextPipeline[nextStatus]];
  return nextPipeline;
}
