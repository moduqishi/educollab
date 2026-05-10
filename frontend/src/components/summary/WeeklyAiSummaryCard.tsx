import React, { useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import type { WeeklyAiSummaryRecord } from '@/lib/types';

interface WeeklyAiSummaryCardProps {
  data: WeeklyAiSummaryRecord | undefined;
  isLoading: boolean;
  error: string | null;
  onGenerate: () => void;
}

export function WeeklyAiSummaryCard({ data, isLoading, error, onGenerate }: WeeklyAiSummaryCardProps) {
  return (
    <Card className="border-muted/70">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">AI 周报总结</CardTitle>
          </div>
          {!data && !isLoading && (
            <Button size="sm" onClick={onGenerate} disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  生成AI周报
                </>
              )}
            </Button>
          )}
          {data && !isLoading && (
            <Button size="sm" variant="outline" onClick={onGenerate} disabled={isLoading}>
              <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', isLoading && 'animate-spin')} />
              重新生成
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && !data && (
          <div className="flex items-center justify-center py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="ml-2 text-sm text-muted-foreground">正在生成周报...</span>
          </div>
        )}
        {error && !isLoading && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button size="sm" variant="outline" className="mt-2" onClick={onGenerate}>
              重试
            </Button>
          </div>
        )}
        {data && !isLoading && (
          <div className="space-y-3">
            <div className="rounded-2xl border bg-muted/30 p-4 prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{data.content}</ReactMarkdown>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {data.weekStart} ~ {data.weekEnd}
              </span>
              <span>
                由 {data.provider} · {data.model} 生成
              </span>
            </div>
          </div>
        )}
        {!data && !isLoading && !error && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">点击按钮生成本周 AI 周报总结</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}