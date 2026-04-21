import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApi } from '@/app/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';
import { AdminPanel } from './admin-layout';
import { assignmentOpenLink } from './admin-content-utils';

export function AdminAssignmentsPage() {
  const api = useApi();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = React.useState('');
  const q = useQuery({ queryKey: ['adminAssignments'], queryFn: () => api.adminAssignments() });
  if (q.isLoading) return <PageLoading label="正在加载作业入口..." />;
  if (q.isError) return <PageError title="作业入口加载失败" onRetry={() => q.refetch()} />;
  const returnTo = `${location.pathname}${location.search}`;
  const rows = (q.data || []).filter((item) => !search || `${item.title} ${item.courseName || ''}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <AdminPanel title="作业全局入口" description="从全局作业列表直接跳到课程前台作业页，而不是停留在后台异常清理壳。">
      <div className="mb-4 relative max-w-md"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索作业标题或课程..." /></div>
      {!rows.length ? <PageEmpty title="没有匹配作业" message="请调整关键词。" /> : <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="px-3 py-3">作业</th><th className="px-3 py-3">课程</th><th className="px-3 py-3">提交情况</th><th className="px-3 py-3 text-right">操作</th></tr></thead><tbody>{rows.map((item) => { const href = assignmentOpenLink(item, returnTo); return <tr key={item.id} className="border-b last:border-b-0"><td className="px-3 py-3"><div className="font-medium">{item.title}</div><div className="mt-1 text-xs text-muted-foreground">截止 {item.dueDate || '未设置'} · 创建于 {item.createdAt}</div></td><td className="px-3 py-3 text-muted-foreground">{item.courseName || '未关联课程'}</td><td className="px-3 py-3 text-muted-foreground">提交 {item.totalSubmissions} · 已批改 {item.gradedSubmissions}</td><td className="px-3 py-3 text-right">{href ? <Button size="sm" variant="outline" onClick={() => navigate(href)}>打开课程作业页</Button> : <span className="text-xs text-muted-foreground">缺少课程归属</span>}</td></tr>; })}</tbody></table></div>}
    </AdminPanel>
  );
}
