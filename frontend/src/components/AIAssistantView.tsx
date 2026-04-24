import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Bot, User, Sparkles, MessageSquare, Trash2, Briefcase, CheckSquare, Users, GraduationCap, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import type { createApiClient } from '@/lib/api';

type Api = ReturnType<typeof createApiClient>;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  meta?: { provider?: string; model?: string };
}

export function AIAssistantView({ api }: { api: Api }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "你好！我是 EduCollab AI Assistant。我可以帮你梳理项目计划、总结讨论、生成待办、或回答课程相关问题。想从哪里开始？",
      timestamp: new Date(),
      meta: { provider: 'system', model: 'bootstrap' },
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const text = input.trim();
    setInput('');
    setIsLoading(true);

    setMessages((prev) => [...prev, { role: 'user', content: text, timestamp: new Date() }]);

    try {
      const reply = await api.aiChat(text, 'general');
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: reply.content || '（空响应）', timestamp: new Date(), meta: { provider: reply.provider, model: reply.model } },
      ]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: e?.message || 'AI 请求失败，请稍后再试。', timestamp: new Date() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-muted/10">
      <div className="flex-1 overflow-hidden flex flex-col max-w-5xl mx-auto w-full p-6">
        <Card className="flex-1 flex flex-col shadow-xl border-none overflow-hidden bg-white">
          <CardHeader className="border-b bg-primary/5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                  <Bot size={24} />
                </div>
                <div>
                  <CardTitle className="text-lg font-display font-bold">EduCollab AI</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className={cn('w-2 h-2 rounded-full', isLoading ? 'bg-amber-500 animate-pulse' : 'bg-green-500')} />
                    <span className="text-xs text-muted-foreground font-medium">{isLoading ? 'Thinking…' : 'Online • Powered by backend'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setMessages([
                      {
                        role: 'assistant',
                        content: '会话已清空。你想继续做什么？',
                        timestamp: new Date(),
                      },
                    ])
                  }
                  className="text-muted-foreground hover:text-destructive"
                  title="Clear chat"
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            </div>
          </CardHeader>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {messages.map((msg, idx) => (
                <div key={idx} className={cn('flex gap-4', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.role !== 'user' && (
                    <Avatar className="w-8 h-8 bg-primary text-white shrink-0">
                      <AvatarFallback>
                        <Bot size={18} />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn('max-w-[85%] space-y-1', msg.role === 'user' ? 'items-end text-right' : 'items-start')}>
                    <div
                      className={cn(
                        'p-4 rounded-2xl border shadow-sm',
                        msg.role === 'user'
                          ? 'bg-primary text-white border-primary/20 rounded-tr-none'
                          : 'bg-muted/40 text-foreground border-muted rounded-tl-none',
                      )}
                    >
                      <div className={cn('prose prose-sm max-w-none', msg.role === 'user' ? 'prose-invert' : 'prose-slate')}>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end text-[10px] text-muted-foreground px-1">
                      <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {msg.meta?.provider && msg.meta?.model && (
                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                          {msg.meta.provider}/{msg.meta.model}
                        </span>
                      )}
                    </div>
                  </div>
                  {msg.role === 'user' && (
                    <Avatar className="w-8 h-8 bg-muted text-foreground shrink-0">
                      <AvatarFallback>
                        <User size={18} />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          <div className="p-6 border-t bg-white">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
              <div className="relative bg-white border rounded-2xl p-2 flex items-end gap-2 shadow-sm">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask anything about your projects..."
                  className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-2 px-3 text-sm min-h-[40px] max-h-[140px]"
                  rows={1}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className={cn('shrink-0 h-10 w-10 rounded-xl transition-all', input.trim() ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-muted text-muted-foreground')}
                >
                  <Send size={18} />
                </Button>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-4">
              <button
                className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                onClick={() => setInput('请帮我总结一下当前项目的状态，并给出下一步建议。')}
              >
                <Sparkles size={10} /> Summarize
              </button>
              <button
                className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                onClick={() => setInput('请把我接下来一周的工作拆成可执行的任务清单（含优先级和截止日期建议）。')}
              >
                <MessageSquare size={10} /> Plan tasks
              </button>
            </div>
            <div className="mt-2 flex items-center justify-center gap-4 border-t pt-3">
              <button
                className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                onClick={() => navigate('/app/projects')}
              >
                <Briefcase size={10} /> 我的项目
              </button>
              <button
                className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                onClick={() => navigate('/app/tasks')}
              >
                <CheckSquare size={10} /> 我的任务
              </button>
              <button
                className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                onClick={() => navigate('/app/teams')}
              >
                <Users size={10} /> 我的团队
              </button>
              <button
                className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                onClick={() => navigate('/app/classes')}
              >
                <GraduationCap size={10} /> 我的课程
              </button>
              <button
                className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                onClick={() => navigate('/app/discussions')}
              >
                <MessageCircle size={10} /> 讨论区
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
