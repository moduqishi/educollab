import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useClassDetail } from './ClassDetailLayout';

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <Card className="border-muted/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-bold">{value}</CardContent>
    </Card>
  );
}

export function ClassOverviewTab() {
  const { detail } = useClassDetail();
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <StatCard title="成员数" value={detail.members.length} />
      <StatCard title="普通作业" value={detail.assignments.length} />
      <StatCard title="组队任务" value={detail.groupTasks.length} />
    </div>
  );
}
