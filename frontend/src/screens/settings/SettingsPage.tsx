import React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bell, LayoutGrid, LockKeyhole, LogOut, MonitorCog, Settings as SettingsIcon } from 'lucide-react';
import { useApi } from '@/app/api';
import { useAuth } from '@/app/auth';
import { setTitle } from '@/app/title';
import { PageHero } from '@/screens/shell/PageHero';
import { PageError, PageLoading } from '@/screens/common/States';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { API_BASE, COLLAB_BASE } from '@/lib/mappers';
import type { UserSettingsRecord } from '@/lib/types';

const SETTINGS_KEY = 'educollab.user-settings';
const defaultSettings: UserSettingsRecord = {
  notifyInApp: true,
  notifyTask: true,
  notifyAssignment: true,
  notifyGroupTask: true,
  density: 'comfortable',
  defaultHome: '/app/dashboard',
  timeFormat: 'relative',
};

function readSettings(role?: 'STUDENT' | 'TEACHER'): UserSettingsRecord {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<UserSettingsRecord>) : {};
    return { ...defaultSettings, defaultHome: role === 'TEACHER' ? '/app/teacher/dashboard' : '/app/dashboard', ...parsed };
  } catch {
    return { ...defaultSettings, defaultHome: role === 'TEACHER' ? '/app/teacher/dashboard' : '/app/dashboard' };
  }
}

export function SettingsPage() {
  const api = useApi();
  const { session, logout, setSession, token } = useAuth();
  const [settings, setSettings] = React.useState<UserSettingsRecord>(() => readSettings(session?.profile.role));
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => setTitle(['\u8bbe\u7f6e\u4e2d\u5fc3']), []);
  React.useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const profileQuery = useQuery({
    queryKey: ['user-settings-profile', token],
    enabled: !!token,
    queryFn: () => api.userMe(),
  });

  React.useEffect(() => {
    if (profileQuery.data && session) setSession({ ...session, profile: profileQuery.data });
  }, [profileQuery.data, session, setSession]);

  const profile = profileQuery.data || session?.profile || null;

  const passwordMutation = useMutation({
    mutationFn: () => api.changeMyPassword({ currentPassword, newPassword }),
    onSuccess: () => {
      setMessage('\u5bc6\u7801\u5df2\u66f4\u65b0');
      setError(null);
      setCurrentPassword('');
      setNewPassword('');
    },
    onError: (err: Error) => {
      setError(err.message || '\u5bc6\u7801\u4fee\u6539\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5');
      setMessage(null);
    },
  });

  if (profileQuery.isLoading && !profile) return <PageLoading label={'\u6b63\u5728\u52a0\u8f7d\u8bbe\u7f6e...'} />;
  if (!profile) return <PageError title={'\u8bbe\u7f6e\u52a0\u8f7d\u5931\u8d25'} onRetry={() => profileQuery.refetch()} />;
  const roleLabel = profile.role === 'TEACHER' ? '\u6559\u5e08' : '\u5b66\u751f';

  return (
    <div>
      <PageHero title={'\u8bbe\u7f6e\u4e2d\u5fc3'} subtitle={'\u96c6\u4e2d\u7ba1\u7406\u8d26\u6237\u3001\u5b89\u5168\u3001\u901a\u77e5\u548c\u754c\u9762\u504f\u597d\u3002'} />
      <div className="px-8 pb-10">
        <div className="mx-auto max-w-[1200px]">
          <Tabs defaultValue="account" className="gap-6">
            <TabsList variant="line" className="rounded-2xl border border-muted bg-white p-1">
              <TabsTrigger value="account" className="rounded-xl px-4">{'\u8d26\u6237\u8bbe\u7f6e'}</TabsTrigger>
              <TabsTrigger value="notifications" className="rounded-xl px-4">{'\u901a\u77e5\u8bbe\u7f6e'}</TabsTrigger>
              <TabsTrigger value="preferences" className="rounded-xl px-4">{'\u754c\u9762\u504f\u597d'}</TabsTrigger>
              <TabsTrigger value="security" className="rounded-xl px-4">{'\u5b89\u5168'}</TabsTrigger>
              <TabsTrigger value="system" className="rounded-xl px-4">{'\u7cfb\u7edf\u4fe1\u606f'}</TabsTrigger>
            </TabsList>

            <TabsContent value="account">
              <Card className="border-muted/70">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base"><SettingsIcon size={16} />{'\u8d26\u6237\u8bbe\u7f6e'}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="rounded-3xl bg-muted/30 p-6 text-center">
                    <Avatar className="mx-auto h-24 w-24 border-4 border-primary/10">
                      <AvatarImage src={profile.avatar} />
                      <AvatarFallback className="text-2xl">{profile.name?.slice(0, 1) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="mt-4 text-lg font-semibold">{profile.name}</div>
                    <div className="text-sm text-muted-foreground">{profile.email}</div>
                    <Badge variant="outline" className="mt-3 border-primary/20 bg-primary/5 text-primary">{roleLabel}</Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoField label={'\u59d3\u540d'} value={profile.name} />
                    <InfoField label={'\u90ae\u7bb1'} value={profile.email} />
                    <InfoField label={'\u8eab\u4efd'} value={roleLabel} />
                    <InfoField label={'\u5934\u50cf\u7ba1\u7406'} value={'\u8bf7\u524d\u5f80\u4e2a\u4eba\u4e2d\u5fc3\u4e0a\u4f20\u6216\u66f4\u6362\u5934\u50cf'} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications">
              <Card className="border-muted/70">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base"><Bell size={16} />{'\u901a\u77e5\u8bbe\u7f6e'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SettingCheckbox label={'\u7ad9\u5185\u901a\u77e5'} description={'\u63a5\u6536\u7cfb\u7edf\u6d88\u606f\u548c\u72b6\u6001\u66f4\u65b0\u3002'} checked={settings.notifyInApp} onCheckedChange={(checked) => setSettings((current) => ({ ...current, notifyInApp: checked }))} />
                  <SettingCheckbox label={'\u4efb\u52a1\u63d0\u9192'} description={'\u961f\u5185\u4efb\u52a1\u5206\u914d\u548c\u622a\u6b62\u53d8\u66f4\u65f6\u63d0\u9192\u6211\u3002'} checked={settings.notifyTask} onCheckedChange={(checked) => setSettings((current) => ({ ...current, notifyTask: checked }))} />
                  <SettingCheckbox label={'\u4f5c\u4e1a\u63d0\u9192'} description={'\u73ed\u7ea7\u4f5c\u4e1a\u65b0\u589e\u6216\u5373\u5c06\u622a\u6b62\u65f6\u63d0\u9192\u6211\u3002'} checked={settings.notifyAssignment} onCheckedChange={(checked) => setSettings((current) => ({ ...current, notifyAssignment: checked }))} />
                  <SettingCheckbox label={'\u7ec4\u961f\u63d0\u9192'} description={'\u7ec4\u961f\u4efb\u52a1\u53d1\u5e03\u3001\u961f\u4f0d\u53d8\u5316\u548c\u9080\u8bf7\u786e\u8ba4\u65f6\u63d0\u9192\u6211\u3002'} checked={settings.notifyGroupTask} onCheckedChange={(checked) => setSettings((current) => ({ ...current, notifyGroupTask: checked }))} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preferences">
              <Card className="border-muted/70">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base"><LayoutGrid size={16} />{'\u754c\u9762\u504f\u597d'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <PreferenceGroup title={'\u5217\u8868\u5bc6\u5ea6'} options={[{ label: '\u8212\u9002', value: 'comfortable' }, { label: '\u7d27\u51d1', value: 'compact' }]} value={settings.density} onChange={(value) => setSettings((current) => ({ ...current, density: value as UserSettingsRecord['density'] }))} />
                  <PreferenceGroup title={'\u9ed8\u8ba4\u9996\u9875'} options={[{ label: session?.profile.role === 'TEACHER' ? '\u6559\u5e08\u5de5\u4f5c\u53f0' : '\u4eea\u8868\u76d8', value: session?.profile.role === 'TEACHER' ? '/app/teacher/dashboard' : '/app/dashboard' }, { label: '\u8bfe\u7a0b\u4e2d\u5fc3', value: '/app/classes' }, { label: '\u56e2\u961f\u5de5\u4f5c\u53f0', value: '/app/teams' }]} value={settings.defaultHome} onChange={(value) => setSettings((current) => ({ ...current, defaultHome: value as UserSettingsRecord['defaultHome'] }))} />
                  <PreferenceGroup title={'\u65f6\u95f4\u663e\u793a'} options={[{ label: '\u76f8\u5bf9\u65f6\u95f4', value: 'relative' }, { label: '\u7edd\u5bf9\u65f6\u95f4', value: 'absolute' }]} value={settings.timeFormat} onChange={(value) => setSettings((current) => ({ ...current, timeFormat: value as UserSettingsRecord['timeFormat'] }))} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card className="border-muted/70">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base"><LockKeyhole size={16} />{'\u5b89\u5168'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">{'\u5f53\u524d\u5bc6\u7801'}</Label>
                      <Input id="current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">{'\u65b0\u5bc6\u7801'}</Label>
                      <Input id="new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
                    </div>
                  </div>
                  {message ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
                  {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
                  <div className="flex flex-wrap items-center gap-3">
                    <Button className="rounded-full px-6" disabled={!currentPassword || !newPassword || passwordMutation.isPending} onClick={() => passwordMutation.mutate()}>
                      {passwordMutation.isPending ? '\u4fdd\u5b58\u4e2d...' : '\u4fee\u6539\u5bc6\u7801'}
                    </Button>
                    <Button variant="outline" className="gap-2 rounded-full" onClick={logout}><LogOut size={16} />{'\u9000\u51fa\u767b\u5f55'}</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="system">
              <Card className="border-muted/70">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base"><MonitorCog size={16} />{'\u7cfb\u7edf\u4fe1\u606f'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <InfoField label="API Base" value={API_BASE} mono />
                  <InfoField label="Collab Base" value={COLLAB_BASE} mono />
                  <InfoField label={'\u524d\u7aef\u73af\u5883'} value={(globalThis as typeof globalThis & { __APP_MODE__?: string }).__APP_MODE__ || 'development'} />
                  <div className="rounded-2xl bg-muted/40 px-4 py-3 text-xs text-muted-foreground">{'\u901a\u77e5\u8bbe\u7f6e\u548c\u754c\u9762\u504f\u597d\u5f53\u524d\u4fdd\u5b58\u5728\u6d4f\u89c8\u5668\u672c\u5730\uff0c\u8d26\u6237\u4fe1\u606f\u4e0e\u5bc6\u7801\u4fee\u6539\u8d70\u771f\u5b9e\u540e\u7aef\u63a5\u53e3\u3002'}</div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-muted bg-white px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={mono ? 'mt-1 break-all rounded-lg bg-muted px-2 py-1 font-mono text-xs' : 'mt-1 text-sm font-medium'}>{value}</div>
    </div>
  );
}

function SettingCheckbox({ label, description, checked, onCheckedChange }: { label: string; description: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-muted bg-white px-4 py-4">
      <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(Boolean(value))} />
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="mt-1 text-sm text-muted-foreground">{description}</div>
      </div>
    </label>
  );
}

function PreferenceGroup({ title, options, value, onChange }: { title: string; options: Array<{ label: string; value: string }>; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">{title}</div>
      <div className="flex flex-wrap gap-3">
        {options.map((option) => (
          <Button key={option.value} variant={value === option.value ? 'default' : 'outline'} className="rounded-full" onClick={() => onChange(option.value)}>
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
