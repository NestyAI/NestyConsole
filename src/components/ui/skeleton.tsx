import { cn } from "@/lib/utils";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-gradient-to-r from-neural-overlay/75 via-neural-panel/80 to-neural-overlay/75 bg-[length:220%_100%] animate-shimmer",
        className
      )}
      aria-hidden
    />
  );
}
