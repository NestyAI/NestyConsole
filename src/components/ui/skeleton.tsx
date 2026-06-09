import { cn } from "@/lib/utils";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-lg bg-gradient-to-r from-neural-overlay/80 via-neural-panel/85 to-neural-overlay/80 bg-[length:220%_100%] animate-shimmer",
        className
      )}
      aria-hidden
    />
  );
}
