import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Download, FileUp, UploadCloud } from 'lucide-react';
import { useApi } from '@/app/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';

export function AdminCourseImportPage() {
  const api = useApi();
  const qc = useQueryClient();
  const { classId } = useParams();
  const id = Number(classId);
  const [file, setFile] = React.useState<File | null>(null);
  const previewQ = useMutation({ mutationFn: (upload: File) => api.previewCourseImport(id, upload) });
  const executeM = useMutation({
    mutationFn: (upload: File) => api.executeCourseImport(id, upload),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['classDetail', id] }),
        qc.invalidateQueries({ queryKey: ['adminCourseDetail', id] }),
      ]);
    },
  });
  const jobsQ = useQuery({ queryKey: ['adminCourseImports', id], queryFn: () => api.adminCourseImports(id) });

  const downloadTemplate = React.useCallback(() => {
    const csv = ['name,email,groupName', '张三,zhangsan@example.com,第一组', '李四,lisi@example.com,第二组'].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'educollab-course-import-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  if (jobsQ.isLoading) return <PageLoading label="正在加载导入记录..." />;
  if (jobsQ.isError) return <PageError onRetry={() => jobsQ.refetch()} title="导入记录加载失败" />;

  return (
    <div className="space-y-6">
      <Card className="border-muted/70">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><UploadCloud size={16} />课程批量导入学生</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">模板列固定为 <code>name,email,groupName</code>。支持 CSV / XLSX，系统会自动校验并预览。</div>
          <Button variant="outline" className="gap-2" onClick={downloadTemplate}>
            <Download size={14} />
            下载模板
          </Button>
          <input type="file" accept=".csv,.xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={!file || previewQ.isPending} onClick={() => file && previewQ.mutate(file)}>{previewQ.isPending ? '预校验中...' : '预校验'}</Button>
            <Button disabled={!file || !previewQ.data || executeM.isPending} onClick={() => file && executeM.mutate(file)}>{executeM.isPending ? '导入中...' : '执行导入'}</Button>
          </div>
          {previewQ.data ? (
            <div className="rounded-2xl border p-4 text-sm">
              <div className="font-medium">预校验结果</div>
              <div className="mt-2 text-muted-foreground">总行数 {previewQ.data.totalRows} · 可导入 {previewQ.data.readyRows} · 跳过 {previewQ.data.skippedRows} · 新建账号 {previewQ.data.createUserRows}</div>
              <div className="mt-3 max-h-[360px] overflow-auto rounded-xl border">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium">行</th>
                      <th className="px-3 py-2 font-medium">姓名</th>
                      <th className="px-3 py-2 font-medium">邮箱</th>
                      <th className="px-3 py-2 font-medium">团队</th>
                      <th className="px-3 py-2 font-medium">动作</th>
                      <th className="px-3 py-2 font-medium">说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewQ.data.rows.map((row) => (
                      <tr key={row.rowNumber} className="border-b last:border-b-0">
                        <td className="px-3 py-2">{row.rowNumber}</td>
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.email}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.groupName || '—'}</td>
                        <td className="px-3 py-2">{row.action}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
          {executeM.data ? (
            <div className="rounded-2xl border p-4 text-sm">
              <div className="font-medium">导入完成</div>
              <div className="mt-2 text-muted-foreground">
                成功导入 {executeM.data.importedRows} 行，跳过 {executeM.data.skippedRows} 行，创建账号 {executeM.data.createdUsersCount} 个。
              </div>
              {executeM.data.warnings.length ? (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground">
                  {executeM.data.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}
                </ul>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-muted/70">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><FileUp size={16} />导入历史</CardTitle></CardHeader>
        <CardContent>
          {!jobsQ.data?.length ? <PageEmpty title="暂无导入历史" message="执行过导入后，这里会显示历史结果。" icon={FileUp} /> : (
            <div className="space-y-3">
              {jobsQ.data.map((job) => (
                <div key={job.id} className="rounded-2xl border p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">{job.fileName || '导入文件'}</div>
                    <div className="text-xs text-muted-foreground">{job.createdAt}</div>
                  </div>
                  <div className="mt-2 text-muted-foreground">导入 {job.importedRows || 0} · 跳过 {job.skippedRows || 0} · 创建账号 {job.createdUsersCount || 0}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
