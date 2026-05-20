import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ErrorState({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function LoadingState({ text }: { text: string }) {
  return (
    <Card className="p-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-44" />
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </Card>
  );
}
