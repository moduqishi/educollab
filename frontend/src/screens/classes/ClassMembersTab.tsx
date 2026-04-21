import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InviteDialog } from '@/screens/classes/ClassDialogs';
import type { ClassDetail } from '@/lib/types';

export function MembersTab({
  detail,
  isTeacher,
  onInvite,
}: {
  detail: ClassDetail;
  isTeacher: boolean;
  onInvite: (email: string) => Promise<unknown>;
}) {
  return (
    <Card className="border-muted/70">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">课程成员</CardTitle>
            <div className="mt-1 text-sm text-muted-foreground">这里只保留成员列表；邀请入口仅教师可见，不再单独展示邀请管理大面板。</div>
          </div>
          {isTeacher ? <InviteDialog onSubmit={onInvite} /> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {detail.members.map((member) => (
          <div key={member.id} className="flex items-center justify-between rounded-2xl border p-4">
            <div>
              <div className="font-medium">{member.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">{member.email}</div>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">
                {member.userRole === 'TEACHER' ? '教师账号' : '学生账号'}
              </Badge>
              <Badge>{member.classRole === 'TEACHER' ? '课程教师' : '课程学生'}</Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
