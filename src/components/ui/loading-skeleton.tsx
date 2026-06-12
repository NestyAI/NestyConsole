import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type LoadingSkeletonProps = {
  variant?: "page" | "cards" | "table";
  className?: string;
};

export function LoadingSkeleton({ variant = "page", className }: LoadingSkeletonProps) {
  if (variant === "table") {
    return <Skeleton variant="table" className={className} />;
  }

  if (variant === "cards") {
    return (
      <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)} aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} variant="stat" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)} aria-hidden="true">
      <div className="glass-accent rounded-3xl p-6 sm:p-8">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-5 h-10 max-w-xl" />
        <Skeleton className="mt-4 h-4 max-w-2xl" />
      </div>
      <LoadingSkeleton variant="cards" />
      <Skeleton variant="table" />
    </div>
  );
}
