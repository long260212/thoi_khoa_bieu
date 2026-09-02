import React from 'react';
import clsx from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  className,
  pulse = false,
}) => {
  const variantStyles = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    success: 'bg-emerald-950/70 text-emerald-300 border-emerald-700/50',
    warning: 'bg-amber-950/70 text-amber-300 border-amber-700/50',
    danger: 'bg-rose-950/80 text-rose-300 border-rose-700/60 shadow-rose-950/50',
    info: 'bg-sky-950/70 text-sky-300 border-sky-700/50',
    purple: 'bg-purple-950/70 text-purple-300 border-purple-700/50',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 font-medium',
    md: 'text-sm px-2.5 py-1 font-semibold',
    lg: 'text-base px-3 py-1.5 font-bold',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border shadow-sm transition-all',
        variantStyles[variant],
        sizeStyles[size],
        pulse && variant === 'danger' && 'animate-pulse ring-2 ring-rose-500/50',
        className
      )}
    >
      {pulse && (
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
      )}
      {children}
    </span>
  );
};
