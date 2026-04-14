import React from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { setTitle } from '@/app/title';
import { useApi } from '@/app/api';
import { PageHero } from '@/screens/shell/PageHero';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Msg = { role: 'user' | 'assistant'; content: string; meta?: string };

export function AiPage() {
  const api = useApi();
  React.useEffect(() => setTitle(['AI 助手']), []);

  const [scenario, setScenario] = React.useState('general');
  const [input, setInput] = React.useState('');
  const [messages, setMessages] = React.useState<Msg[]>([
    {
      role: 'assistant',
      content: '你好，我是 EduCollab 的 AI 助手。你可以让我帮你：拆分任务、润色文档、整理讨论结论、生成接口联调步骤、写 commit message 等。',
    },
  ]);

  const chatM = useMutation({
    mutationFn: (prompt: string) => api.aiChat(prompt, scenario),
    onSuccess: (res) => {
      setMessages((prev) => [...prev, { role: 'assistant', content: res.content, meta: `${res.provider}/${res.model}` }]);
    },
    onError: (e: any) => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `请求失败：${e?.message || '服务不可用'}。你可以稍后再试，或换一种提问方式。` },
      ]);
    },
  });

  const send = async () => {
    const text = input.trim();
    if (!text || chatM.isPending) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    await chatM.mutateAsync(text);
  };

  return (
    <div>
      <PageHero
        title="AI 助手"
        subtitle="让 AI 帮你把事情做“更清楚”：结论、步骤、边界、验收标准。"
        right={
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/15">
            <Sparkles size={14} className="mr-1" />
            场景：通用
          </Badge>
        }
      />

      <div className="px-8 pb-10">
        <div className="max-w-[1200px] mx-auto">
          <Card className="border-muted/70 overflow-hidden">
            <CardHeader className="border-b bg-muted/20">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot size={16} /> 对话
                </CardTitle>
                <div className="text-xs text-muted-foreground">建议提问方式：背景 + 目标 + 限制条件 + 期望输出格式。</div>
              </div>
            </CardHeader>
            <div className="h-[calc(100vh-300px)] flex flex-col">
              <ScrollArea className="flex-1 bg-white">
                <div className="p-5 space-y-3">
                  {messages.map((m, idx) => (
                    <div key={idx} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'max-w-[820px] rounded-2xl px-4 py-3 border shadow-sm',
                          m.role === 'user' ? 'bg-primary text-primary-foreground border-primary/30' : 'bg-muted/20 border-muted/60',
                        )}
                      >
                        <div className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</div>
                        {m.meta ? <div className={cn('mt-2 text-[11px]', m.role === 'user' ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{m.meta}</div> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <CardContent className="border-t bg-white">
                <div className="flex items-end gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="min-h-[52px] max-h-[180px]"
                    placeholder="输入问题（Enter 发送，Shift+Enter 换行）…"
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        await send();
                      }
                    }}
                  />
                  <Button className="gap-2" onClick={send} disabled={!input.trim() || chatM.isPending}>
                    <Send size={14} />
                    {chatM.isPending ? '发送中…' : '发送'}
                  </Button>
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  你也可以直接贴：接口返回、日志、错误截图文字、或你写的草稿；我会帮你归纳与给出下一步建议。
                </div>
              </CardContent>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

