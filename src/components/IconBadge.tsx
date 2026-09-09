import type { LucideIcon } from 'lucide-react';
import AppIcon from './AppIcon';

interface IconBadgeProps {
  icon: LucideIcon | string;
  selected?: boolean;
  variant?: 'tile' | 'inline' | 'compact' | 'prominent';
  className?: string;
}

const sizes = {
  tile: { frame: 'size-10 rounded-xl', icon: 23 },
  inline: { frame: 'size-8 rounded-lg', icon: 21 },
  compact: { frame: 'size-5', icon: 18 },
  prominent: { frame: 'size-12 rounded-2xl', icon: 27 },
} as const;

export default function IconBadge({ icon: Icon, selected = false, variant = 'tile', className = '' }: IconBadgeProps) {
  const { frame, icon } = sizes[variant];
  return (
    <span
      aria-hidden="true"
      className={`app-icon-badge inline-flex shrink-0 items-center justify-center ${frame} ${className}
        ${selected ? 'text-accent-700' : 'text-sage-700'}
        ${variant === 'compact' ? '' : selected
          ? 'border border-accent/25 bg-accent/10'
          : 'border border-sage/15 bg-sage/[0.06]'}`}
    >
      {typeof Icon === 'string'
        ? <AppIcon name={Icon} size={icon} />
        : <Icon size={icon} strokeWidth={1.65} className="inline-block shrink-0 align-middle" />}
    </span>
  );
}
