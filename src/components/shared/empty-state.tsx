import Link from "next/link";
import { Inbox } from "lucide-react";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  const buttonClass =
    "mt-6 inline-flex h-10 items-center justify-center bg-editorial-red px-6 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90";

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon size={48} className="mb-4 text-ink-muted" />
      <h3 className="font-serif text-xl font-bold text-ink">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-ink-secondary">{description}</p>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className={buttonClass}>
          {actionLabel}
        </button>
      )}
      {actionLabel && actionHref && !onAction && (
        <Link href={actionHref} className={buttonClass}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
