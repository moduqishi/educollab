import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function AdminPageIntro({
  eyebrow,
  title,
  description,
  actions,
  badges,
}: {
  eyebrow?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  badges?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-2 text-sm text-muted-foreground">{eyebrow}</div> : null}
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description ? <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {badges}
        {actions}
      </div>
    </div>
  );
}

export function AdminBreadcrumbs({ items }: { items: { label: string; onClick?: () => void; active?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      {items.map((item, index) => (
        <React.Fragment key={`${item.label}-${index}`}>
          {index > 0 ? <span>/</span> : null}
          {item.onClick && !item.active ? (
            <button type="button" className="transition-colors hover:text-foreground" onClick={item.onClick}>
              {item.label}
            </button>
          ) : (
            <span className={item.active ? 'font-medium text-foreground' : undefined}>{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export function AdminPanel({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn('border-muted/70', className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {description ? <div className="mt-1 text-sm text-muted-foreground">{description}</div> : null}
          </div>
          {actions}
        </div>
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}

export function AdminStatGrid({ items, columns = 'xl:grid-cols-4' }: { items: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: 'default' | 'danger' | 'success' }[]; columns?: string }) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-2', columns)}>
      {items.map((item) => (
        <Card key={item.label} className={cn('border-muted/70', item.tone === 'danger' && 'border-red-200 bg-red-50/50', item.tone === 'success' && 'border-emerald-200 bg-emerald-50/40')}>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground">{item.label}</div>
            <div className="mt-3 text-3xl font-semibold tracking-tight">{item.value}</div>
            {item.hint ? <div className="mt-2 text-xs text-muted-foreground">{item.hint}</div> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AdminSidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-muted/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

export function AdminInfoRow({ label, value, tone = 'default' }: { label: string; value: React.ReactNode; tone?: 'default' | 'danger' | 'success' }) {
  return (
    <div className={cn('rounded-2xl border px-4 py-3', tone === 'danger' && 'border-red-200 bg-red-50/60', tone === 'success' && 'border-emerald-200 bg-emerald-50/60')}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

export function AdminTabBadge({ children, variant = 'outline' }: { children: React.ReactNode; variant?: 'default' | 'secondary' | 'outline' | 'destructive' }) {
  return <Badge variant={variant}>{children}</Badge>;
}

export function AdminOpenButton({ onClick, label = '打开' }: { onClick: () => void; label?: string }) {
  return (
    <Button size="sm" variant="outline" onClick={onClick}>
      {label}
    </Button>
  );
}
