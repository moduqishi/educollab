import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApi } from '@/app/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';
import { AdminPanel } from './admin-layout';
import { discussionOpenLink } from './admin-content-utils';

export function AdminDiscussionsPage() {
  const api = useApi();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = React.useState('');
  const q = useQuery({ queryKey: ['adminDiscussions'], queryFn: () => api.adminDiscussions() });
  if (q.isLoading) return <PageLoading label="正在加载讨论入口..." />;
  if (q.isError) return <PageError title="讨论入口加载失败" onRetry={() => q.refetch()} />;
  const returnTo = `${location.pathname}${location.search}`;
  const rows = (q.data || []).filter((item) => !search || `${item.title} ${item.projectName || ''} ${item.courseName || ''} ${item.teamName || ''} ${item.authorName || ''}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <AdminPanel title="讨论全局入口" description="先定位讨论所属结构，再直接进入前台项目讨论页处理。">
      <div className="mb-4 relative max-w-md"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索讨论、项目、作者..." /></div>
      {!rows.length ? <PageEmpty title="没有匹配讨论" message="请调整关键词。" /> : <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="px-3 py-3">讨论</th><th className="px-3 py-3">结构位置</th><th className="px-3 py-3">状态</th><th className="px-3 py-3 text-right">操作</th></tr></thead><tbody>{rows.map((item) => { const href = discussionOpenLink(item, returnTo); return <tr key={item.id} className="border-b last:border-b-0"><td className="px-3 py-3"><div className="font-medium">{item.title}</div><div className="mt-1 text-xs text-muted-foreground">作者 {item.authorName || '未知'} · 回复 {item.replyCount}</div></td><td className="px-3 py-3 text-muted-foreground"><div>{item.courseName || '未关联课程'}</div><div className="text-xs">{item.teamName || '未关联团队'} / {item.projectName || '未关联项目'}</div></td><td className="px-3 py-3 text-muted-foreground">{item.category} · {item.status} · {item.createdAt}</td><td className="px-3 py-3 text-right">{href ? <Button size="sm" variant="outline" onClick={() => navigate(href)}>打开项目讨论页</Button> : <span className="text-xs text-muted-foreground">缺少项目归属</span>}</td></tr>; })}</tbody></table></div>}
    </AdminPanel>
  );
}
