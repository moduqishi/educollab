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
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card className="border-muted/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">课程成员</CardTitle>
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

      <Card className="border-muted/70">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">邀请管理</CardTitle>
            {isTeacher ? <InviteDialog onSubmit={onInvite} /> : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!detail.invitations.length ? (
            <div className="text-sm text-muted-foreground">暂无邀请记录。</div>
          ) : (
            detail.invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-2xl border p-4">
                <div>
                  <div className="font-medium">{inv.invitedUserName}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {inv.invitedUserEmail} · 邀请人：{inv.invitedByName}
                  </div>
                </div>
                <Badge variant={inv.status === 'PENDING' ? 'outline' : 'default'}>
                  {inv.status === 'PENDING'
                    ? '待处理'
                    : inv.status === 'ACCEPTED'
                      ? '已接受'
                      : '已拒绝'}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
