import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { BookOpen, Lock, Mail, User, GraduationCap, UserCog, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { setTitle } from '@/app/title';
import { useApi } from '@/app/api';
import { useAuth } from '@/app/auth';

type Mode = 'login' | 'register';

export function LoginPage() {
  const api = useApi();
  const { setToken, setSession } = useAuth();
  const [mode, setMode] = React.useState<Mode>('login');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [role, setRole] = React.useState<'STUDENT' | 'TEACHER'>('STUDENT');

  const navigate = useNavigate();
  const location = useLocation() as any;

  React.useEffect(() => {
    setTitle([mode === 'login' ? '登录' : '注册']);
  }, [mode]);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = mode === 'login'
        ? await api.login(email.trim(), password)
        : await api.register({ name: name.trim(), email: email.trim(), password, role });
      setToken(res.token);
      setSession(res);
      const to = location?.state?.from || (res.profile.role === 'TEACHER' ? '/app/teacher/dashboard' : '/app/dashboard');
      navigate(to, { replace: true });
    } catch (e: any) {
      setError(e?.message || (mode === 'login' ? '登录失败，请检查账号和密码。' : '注册失败，请稍后重试。'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_circle_at_20%_0%,rgba(13,148,136,0.18),transparent_40%),radial-gradient(1200px_circle_at_90%_60%,rgba(14,165,233,0.14),transparent_45%),linear-gradient(180deg,#F7F9FC,#F3F6FB)] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="hidden lg:block border-none bg-white/70 backdrop-blur shadow-[0_24px_80px_rgba(18,36,76,0.12)] rounded-[20px] overflow-hidden">
          <div className="p-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30">
                <BookOpen size={24} />
              </div>
              <div>
                <div className="text-2xl font-display font-bold tracking-tight">EduCollab</div>
          <div className="text-sm text-muted-foreground mt-1">课程协作、组队任务、文档协同、项目工作区一体化</div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
              {[
              ['课程协作', '教师可管理多门课程，学生可加入多门课程。'],
                ['组队任务', '教师发组队任务，学生自由创建、加入或退出队伍。'],
                ['协同文档', '支持在线协作文档与版本管理。'],
                ['队伍项目', '组队完成后以队伍为单位创建项目和仓库。'],
              ].map(([title, desc]) => (
                <div key={title} className="p-4 rounded-2xl bg-white border border-border shadow-sm">
                  <div className="text-sm font-bold">{title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{desc}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 rounded-2xl bg-primary/5 border border-primary/15">
              <div className="text-xs font-semibold text-primary tracking-wide">演示账号</div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">学生</span>
                  <span className="font-mono text-xs bg-white/80 px-2 py-1 rounded-lg border">alex@educollab.local / Password123!</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">教师</span>
                  <span className="font-mono text-xs bg-white/80 px-2 py-1 rounded-lg border">teacher@educollab.local / Password123!</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-none bg-white shadow-[0_24px_80px_rgba(18,36,76,0.12)] rounded-[20px] overflow-hidden">
          <CardHeader className="border-b bg-primary/5">
            <CardTitle className="text-xl font-display font-bold">{mode === 'login' ? '登录' : '注册'}</CardTitle>
            <CardDescription>{mode === 'login' ? '使用你的账号进入工作区。' : '创建账号后将自动进入对应工作区。'}</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {mode === 'register' && (
              <Field label="姓名" icon={<User size={16} />}>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：张三" />
              </Field>
            )}

            <Field label="邮箱" icon={<Mail size={16} />}>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" />
            </Field>

            <Field label="密码" icon={<Lock size={16} />}>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submit();
                }}
              />
            </Field>

            {mode === 'register' && (
              <div className="space-y-2">
                <Label>身份</Label>
                <Select value={role} onValueChange={(v: any) => setRole(v)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="请选择身份" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STUDENT">
                      <div className="flex items-center gap-2">
                        <GraduationCap size={16} /> 学生
                      </div>
                    </SelectItem>
                    <SelectItem value="TEACHER">
                      <div className="flex items-center gap-2">
                        <UserCog size={16} /> 教师
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {error && <div className="p-3 rounded-xl border bg-destructive/5 border-destructive/20 text-destructive text-sm">{error}</div>}
          </CardContent>
          <CardFooter className="p-6 pt-0 flex flex-col gap-3">
            <Button className="w-full rounded-xl h-11 shadow-lg shadow-primary/20" onClick={submit} disabled={loading}>
              {loading ? '处理中...' : mode === 'login' ? '登录' : '注册并进入'}
              <ArrowRight size={16} className="ml-2" />
            </Button>
            <div className="flex items-center justify-between w-full">
              <Button variant="ghost" className="px-0 text-muted-foreground hover:text-foreground" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} disabled={loading}>
                {mode === 'login' ? '没有账号？去注册' : '已有账号？去登录'}
              </Button>
              <Button variant="ghost" className="px-0 text-muted-foreground hover:text-foreground" onClick={() => setError('暂不支持找回密码，请联系教师或管理员。')} disabled={loading}>
                忘记密码
              </Button>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <div className={cn('absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground')}>{icon}</div>
        <div className="*:pl-10">{children}</div>
      </div>
    </div>
  );
}
