import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  BookOpen, Lock, Mail, User, GraduationCap, UserCog, ArrowRight, Eye, EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { setTitle } from '@/app/title';
import { useApi } from '@/app/api';
import { useAuth } from '@/app/auth';

type Mode = 'login' | 'register';

const features = [
  { title: '课程协作', desc: '多课程管理，灵活加入' },
  { title: '团队协作', desc: '实时同步，无缝沟通' },
  { title: '协同文档', desc: '多人编辑，版本追溯' },
  { title: '队伍项目', desc: '项目驱动，仓库管理' },
];

const demoAccounts = [
  { role: '学生', email: 'alex@educollab.local', password: 'Password123!' },
  { role: '教师', email: 'teacher@educollab.local', password: 'Password123!' },
];

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
  const [showPassword, setShowPassword] = React.useState(false);

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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 flex items-center justify-center p-4 md:p-6">

      {/* 背景装饰 blobs */}
      <div className="absolute top-[-15%] left-[-5%] w-[50%] h-[50%] bg-gradient-to-br from-teal-400/30 to-teal-300/20 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-gradient-to-tr from-sky-400/25 to-blue-300/15 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl shadow-slate-900/10"
      >

        {/* 左侧品牌区域 - 渐变深绿 */}
        <div className="relative bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 p-10 xl:p-12 flex flex-col min-h-[580px]">

          {/* 装饰圆形 */}
          <div className="absolute top-16 right-12 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
          <div className="absolute bottom-40 left-[-20px] w-24 h-24 bg-white/5 rounded-full blur-xl" />
          <div className="absolute top-1/2 right-[-10px] w-16 h-16 bg-white/10 rounded-full blur-lg" />

          {/* Logo */}
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-14">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg">
                <BookOpen size={32} className="text-teal-600" />
              </div>
              <div className="text-3xl font-bold text-white tracking-tight">EduCollab</div>
            </div>

            <p className="text-teal-200 text-base mb-10">让协作更简单，让学习更高效</p>

            {/* 特性列表 */}
            <div className="space-y-5">
              {features.map(({ title, desc }) => (
                <div key={title} className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                  <div>
                    <div className="text-white font-semibold">{title}</div>
                    <div className="text-teal-300/80 text-xs mt-0.5">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 演示账号 */}
          <div className="relative z-10 mt-auto p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
            <div className="text-xs font-semibold text-teal-200 tracking-wider mb-4">演示账号</div>
            <div className="space-y-2.5">
              {demoAccounts.map(({ role, email, password }) => (
                <div key={role} className="flex items-center justify-between gap-3">
                  <span className="text-teal-300/70 text-xs w-6">{role}</span>
                  <span className="text-white/90 text-xs font-mono bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/10">
                    {email}
                  </span>
                  <span className="text-white/90 text-xs font-mono bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/10">
                    {password}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧登录表单 */}
        <div className="relative bg-white p-10 xl:p-12 flex flex-col justify-center">

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              {mode === 'login' ? '登录' : '注册'}
            </h1>
            <p className="text-slate-500 mt-2">
              {mode === 'login' ? '欢迎回来！请输入您的账号信息' : '创建账号后将自动进入对应工作区'}
            </p>
          </div>

          <div className="space-y-5">

            {mode === 'register' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">姓名</Label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10">
                    <User size={18} />
                  </div>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例如：张三"
                    className="pl-12 h-12 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">邮箱地址</Label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10">
                  <Mail size={18} />
                </div>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="pl-12 h-12 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">密码</Label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10">
                  <Lock size={18} />
                </div>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入密码"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submit();
                  }}
                  className="pl-12 pr-12 h-12 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors z-10"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">身份</Label>
                <Select value={role} onValueChange={(v: any) => setRole(v)}>
                  <SelectTrigger className="h-12 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all text-slate-800">
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

            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200/60 text-red-600 text-sm">
                {error}
              </div>
            )}

            <Button
              onClick={submit}
              disabled={loading}
              className="w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/25 hover:shadow-teal-600/35 transition-all font-semibold"
            >
              {loading ? '处理中...' : mode === 'login' ? '登 录' : '注册并进入'}
              <ArrowRight size={16} className="ml-2" />
            </Button>

            <div className="flex items-center justify-between pt-1">
              <Button
                variant="ghost"
                className="px-0 text-sm text-slate-500 hover:text-teal-600 transition-colors"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                disabled={loading}
              >
                {mode === 'login' ? '没有账号？去注册' : '已有账号？去登录'}
              </Button>
              <Button
                variant="ghost"
                className="px-0 text-sm text-slate-500 hover:text-teal-600 transition-colors"
                onClick={() => setError('暂不支持找回密码，请联系教师或管理员。')}
                disabled={loading}
              >
                忘记密码？
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}