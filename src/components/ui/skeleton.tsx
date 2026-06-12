import { cn } from "@/lib/utils";

type SkeletonProps = {
  className?: string;
  variant?: "text" | "card" | "table" | "stat";
};

const VARIANT_CLASS: Record<NonNullable<SkeletonProps["variant"]>, string> = {
  text: "h-4 w-full",
  card: "h-36 w-full rounded-2xl",
  table: "h-72 w-full rounded-2xl",
  stat: "h-32 w-full rounded-2xl"
};

export function Skeleton({ className, variant = "text" }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-lg bg-gradient-to-r from-neural-overlay/55 via-white/[0.08] to-neural-overlay/55 bg-[length:220%_100%]",
        VARIANT_CLASS[variant],
        className
      )}
      aria-hidden="true"
    />
  );
}
