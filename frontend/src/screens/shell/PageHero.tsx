import React from 'react';
import { cn } from '@/lib/utils';

export function PageHero({
  title,
  subtitle,
  right,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="p-8">
      <div className="max-w-[1500px] mx-auto">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className={cn('text-3xl font-display font-bold')}>{title}</h1>
            {subtitle ? <p className="mt-1.5 text-muted-foreground">{subtitle}</p> : null}
            {actions ? <div className="mt-6 flex items-center gap-2">{actions}</div> : null}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      </div>
    </div>
  );
}
