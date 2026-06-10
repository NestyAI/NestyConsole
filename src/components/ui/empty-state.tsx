type EmptyStateProps = {
  title: string;
  description?: string;
  className?: string;
};

export function EmptyState({ title, description, className = "" }: EmptyStateProps) {
  return (
    <div className={`neural-panel rounded-xl p-4 text-sm text-neural-text-secondary ${className}`}>
      <p className="font-medium text-neural-text-primary">{title}</p>
      {description ? <p className="mt-2 text-sm leading-relaxed text-neural-text-secondary">{description}</p> : null}
    </div>
  );
}
