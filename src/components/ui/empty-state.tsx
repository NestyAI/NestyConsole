type EmptyStateProps = {
  title: string;
  description?: string;
  className?: string;
};

export function EmptyState({ title, description, className = "" }: EmptyStateProps) {
  return (
    <div className={`neural-panel rounded-2xl p-4 text-sm text-neural-text-secondary ${className}`}>
      <p className="font-display text-[11px] uppercase tracking-[0.12em] text-neural-text-primary">{title}</p>
      {description ? <p className="mt-2 text-sm leading-relaxed text-neural-text-secondary">{description}</p> : null}
    </div>
  );
}
