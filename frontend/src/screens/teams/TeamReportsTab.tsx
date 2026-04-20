import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTeamDetail } from './TeamDetailLayout';
import { WeeklyReportSection } from './TeamDialogs';
import { useWeeklyReports } from './weeklyReports';

export function TeamReportsTab() {
  const { detail, currentUserId, currentUserName } = useTeamDetail();
  const reports = useWeeklyReports(detail.id);
  const canEditReports = !detail.teacherView && !!currentUserId;

  return (
    <Card className="border-muted/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">周报</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <WeeklyReportSection
          items={reports.items}
          canEditReports={canEditReports}
          currentUserId={currentUserId}
          currentUserName={currentUserName || ''}
          onCreate={payload => reports.createReport(payload, currentUserId, currentUserName || '')}
          onUpdate={(reportId, payload) => reports.updateReport(reportId, payload)}
        />
      </CardContent>
    </Card>
  );
}