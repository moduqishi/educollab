import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, Lock, Mail, User, GraduationCap, UserCog } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type Mode = 'login' | 'register';

export function AuthScreen({
  mode,
  setMode,
  onLogin,
  onRegister,
  error,
  isLoading,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (payload: { name: string; email: string; password: string; role: 'STUDENT' | 'TEACHER' }) => Promise<void>;
  error?: string | null;
  isLoading?: boolean;
}) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [role, setRole] = React.useState<'STUDENT' | 'TEACHER'>('STUDENT');

  const submit = async () => {
    if (mode === 'login') return onLogin(email.trim(), password);
    return onRegister({ name: name.trim(), email: email.trim(), password, role });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-blue-500/10" />
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 relative"
      >
        {/* Left marketing panel */}
        <Card className="hidden lg:block border-none shadow-xl bg-white/70 backdrop-blur">
          <CardHeader>
            <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
              <BookOpen size={24} />
            </div>
            <CardTitle className="text-2xl font-display font-bold mt-4">EduCollab</CardTitle>
            <CardDescription className="text-sm">
              团队协作、项目管理、文档协同、Git 与 AI 一体化。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-2xl bg-muted/30 border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Demo accounts</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Student</span>
                  <span className="font-mono text-xs bg-white px-2 py-1 rounded">alex@educollab.local / Password123!</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Teacher</span>
                  <span className="font-mono text-xs bg-white px-2 py-1 rounded">teacher@educollab.local / Password123!</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border bg-white">
                <p className="text-sm font-bold">Real-time Docs</p>
                <p className="text-xs text-muted-foreground mt-1">多人协同编辑 + 版本管理</p>
              </div>
              <div className="p-4 rounded-2xl border bg-white">
                <p className="text-sm font-bold">Project Hub</p>
                <p className="text-xs text-muted-foreground mt-1">任务、讨论、仓库、发布</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right auth card */}
        <Card className="shadow-2xl border-none bg-white">
          <CardHeader className="border-b bg-primary/5">
            <CardTitle className="text-xl font-display font-bold">
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </CardTitle>
            <CardDescription>
              {mode === 'login' ? 'Use your EduCollab credentials to continue.' : 'Register a new account to get started.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-5">
            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input id="name" className="pl-10" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex Rivera" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input id="email" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input id="password" className="pl-10" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
            </div>

            {mode === 'register' && (
              <div className="space-y-2">
                <Label>角色</Label>
                <Select value={role} onValueChange={(v: any) => setRole(v)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="选择角色">
                      {role === 'TEACHER' ? '教师' : '学生'}
                    </SelectValue>
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

            {error && (
              <div className={cn("p-3 rounded-xl border text-sm", "bg-destructive/5 border-destructive/20 text-destructive")}>
                {error}
              </div>
            )}
          </CardContent>

          <CardFooter className="p-6 pt-0 flex flex-col gap-3">
            <Button
              className="w-full rounded-xl h-11 shadow-lg shadow-primary/20"
              onClick={submit}
              disabled={isLoading}
            >
              {isLoading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              disabled={isLoading}
            >
              {mode === 'login' ? 'No account? Register' : 'Already have an account? Sign in'}
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}

