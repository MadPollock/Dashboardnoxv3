import React from 'react';
import { LucideIcon, Info } from 'lucide-react';
import { cn } from './utils';

export type BannerVariant = 'info' | 'alert' | 'warning';

interface BannerProps {
  variant?: BannerVariant;
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  badge?: {
    text: string;
    variant?: 'default' | 'success' | 'warning' | 'destructive';
  };
  action?: React.ReactNode;
  className?: string;
}

/**
 * Banner - Elegant notification banner component with three variants
 * 
 * Variants:
 * - info: Clean Info icon, matches KYC verified banner styling (default)
 * - alert: Yellow icon for warnings that need attention
 * - warning: Red icon and title for critical/destructive actions
 */
export function Banner({
  variant = 'info',
  icon,
  title,
  description,
  badge,
  action,
  className,
}: BannerProps) {
  // Default icons for each variant
  const defaultIcons = {
    info: Info,
    alert: undefined,
    warning: undefined,
  };

  const Icon = icon ?? defaultIcons[variant];

  // Variant styles
  const variantStyles = {
    info: {
      container: 'bg-muted/30 border-border/40',
      iconColor: 'text-foreground',
      titleColor: 'text-foreground',
      titleBg: '',
      descriptionColor: 'text-muted-foreground',
    },
    alert: {
      container: 'bg-muted/30 border-border/40',
      iconColor: 'text-destructive',
      titleColor: 'text-destructive',
      titleBg: 'bg-destructive/10 px-2 py-0.5 rounded',
      descriptionColor: 'text-muted-foreground',
    },
    warning: {
      container: 'bg-muted/30 border-border/40',
      iconColor: 'text-yellow-600 dark:text-yellow-500',
      titleColor: 'text-yellow-600 dark:text-yellow-500',
      titleBg: '',
      descriptionColor: 'text-muted-foreground',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        'rounded-md border p-4',
        styles.container,
        className
      )}
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        {Icon && (
          <Icon className={cn('size-5 flex-shrink-0 mt-0.5', styles.iconColor)} />
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
            <div className="flex-1 min-w-0 space-y-1">
              {/* Title and Badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={cn('font-medium', styles.titleColor, styles.titleBg)}>
                  {title}
                </h3>
                {badge && (
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      badge.variant === 'success' && 'bg-success text-success-foreground',
                      badge.variant === 'warning' && 'bg-secondary text-secondary-foreground',
                      badge.variant === 'destructive' && 'bg-destructive text-destructive-foreground'
                    )}
                  >
                    {badge.text}
                  </span>
                )}
              </div>

              {/* Description */}
              {description && (
                <p className={cn('text-sm', styles.descriptionColor)}>
                  {description}
                </p>
              )}
            </div>

            {/* Action */}
            {action && (
              <div className="flex-shrink-0 w-full sm:w-auto">
                {action}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}