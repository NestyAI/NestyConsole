type EmptyStateProps = {
  title: string;
  description?: string;
  className?: string;
};

export function EmptyState({ title, description, className = "" }: EmptyStateProps) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300 ${className}`}>
      <p className="font-medium text-slate-100">{title}</p>
      {description ? <p className="mt-1">{description}</p> : null}
    </div>
  );
}
