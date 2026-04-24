import React from 'react';
import { useParams } from 'react-router-dom';
import { MessageSquare, Paperclip, Send, Users, Download, Smile } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/app/api';
import { useAuth } from '@/app/auth';
import { PageLoading, PageError } from '@/screens/common/States';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { ChatMessageRecord } from '@/lib/api-client/chat';
import EmojiPicker, { EmojiStyle } from 'emoji-picker-react';


export function ProjectMessagesPage() {
  const api = useApi();
  const { session } = useAuth();
  const { projectId } = useParams();
  const pid = Number(projectId);
  const qc = useQueryClient();

  const roomQ = useQuery({
    queryKey: ['chatProjectRoom', pid],
    queryFn: () => api.getChatProjectRoom(pid),
  });

  const messagesQ = useQuery({
    queryKey: ['chatMessages', roomQ.data?.id],
    enabled: !!roomQ.data?.id,
    queryFn: () => api.chatMessages(roomQ.data!.id),
  });

  const sendM = useMutation({
    mutationFn: (payload: { content?: string; fileAssetId?: number; fileName?: string; fileSizeBytes?: number; mimeType?: string }) =>
      api.sendChatMessage(roomQ.data!.id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['chatMessages', roomQ.data?.id] });
      await qc.invalidateQueries({ queryKey: ['chatProjectRoom', pid] });
    },
  });

  const uploadM = useMutation({
    mutationFn: async (file: File) => {
      const roomId = roomQ.data!.id;
      const fileRecord = await api.uploadFile('CHAT_MESSAGE', roomId, file);
      await api.sendChatMessage(roomId, {
        fileAssetId: fileRecord.id,
        fileName: file.name,
        fileSizeBytes: file.size,
        mimeType: file.type,
      });
      await qc.invalidateQueries({ queryKey: ['chatMessages', roomId] });
      await qc.invalidateQueries({ queryKey: ['chatProjectRoom', pid] });
    },
  });

  const [text, setText] = React.useState('');
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  const [previewFile, setPreviewFile] = React.useState<{ fileAssetId: number; fileName: string; mimeType: string } | null>(null);
  const [showEmoji, setShowEmoji] = React.useState(false);

  React.useEffect(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ block: 'end' });
    }, 100);
  }, [messagesQ.data]);

  if (roomQ.isLoading) return <PageLoading label="正在加载群聊..." />;
  if (roomQ.isError) return <PageError title="无法加载群聊" onRetry={() => roomQ.refetch()} />;

  const messages = ((messagesQ.data || []) as ChatMessageRecord[]).slice().reverse();
  const room = roomQ.data;

  return (
    <div className="flex h-[calc(100vh-220px)] rounded-2xl border bg-white shadow-sm">
      {/* Chat area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <MessageSquare size={16} className="text-primary" />
            </div>
            <div>
              <div className="font-semibold">{room?.name || '项目群聊'}</div>
              <div className="text-xs text-muted-foreground">{room?.memberCount || 0} 人</div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 overflow-hidden">
          <div className="flex flex-col gap-4 p-6">
            {!messagesQ.isLoading && !messages.length ? (
              <div className="text-center text-sm text-muted-foreground py-12">暂无消息，快来发起对话吧。</div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={cn('flex gap-3', msg.authorId === session?.profile.id && 'flex-row-reverse')}>
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={msg.authorAvatar || undefined} />
                    <AvatarFallback>{msg.authorName?.slice(0, 1) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className={cn('max-w-[70%]', msg.authorId === session?.profile.id && 'items-end')}>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xs font-semibold">{msg.authorName}</span>
                      <span className="text-[10px] text-muted-foreground">{msg.createdAt}</span>
                    </div>
                    {msg.content && (
                      <div className={cn('rounded-2xl px-4 py-2.5 text-sm', msg.authorId === session?.profile.id ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                        {msg.content}
                      </div>
                    )}
                    {msg.fileAssetId && (
                      <FileAttachment
                        fileAssetId={msg.fileAssetId}
                        fileName={msg.fileName || undefined}
                        mimeType={msg.mimeType || undefined}
                        fileSizeBytes={msg.fileSizeBytes || undefined}
                        isOwn={msg.authorId === session?.profile.id}
                        api={api}
                        onPreview={setPreviewFile}
                      />
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t p-4 relative">
          <div className="flex items-end gap-3">
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !room?.id) return;
                await uploadM.mutateAsync(file);
                if (fileRef.current) fileRef.current.value = '';
              }}
            />
            <Button variant="outline" size="icon" onClick={() => fileRef.current?.click()} disabled={uploadM.isPending || !room?.id}>
              <Paperclip size={16} />
            </Button>
            <div className="flex-1">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!text.trim() || !room?.id) return;
                    sendM.mutate({ content: text.trim() });
                    setText('');
                  }
                }}
                placeholder="输入消息，Enter 发送..."
                rows={1}
                className="w-full resize-none rounded-xl border border-muted bg-muted/20 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => setShowEmoji(!showEmoji)} disabled={uploadM.isPending || !room?.id}>
              <Smile size={16} />
            </Button>
            <Button size="icon" disabled={!text.trim() || sendM.isPending || !room?.id} onClick={() => {
              if (!text.trim() || !room?.id) return;
              sendM.mutate({ content: text.trim() });
              setText('');
            }}>
              <Send size={16} />
            </Button>
          </div>
          {showEmoji && (
            <div className="absolute bottom-full left-0 right-0 z-50 mb-2 bg-white shadow-lg rounded-xl border">
              <EmojiPicker
                searchPlaceholder="搜索表情"
                searchClearButtonLabel="清除"
                emojiStyle={EmojiStyle.Native}
                skinTonesDisabled={true}
                width="100%"
                onEmojiClick={(e) => {
                  setText((prev) => prev + e.emoji);
                  setShowEmoji(false);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* File preview dialog */}
      {previewFile && (
        <FilePreviewDialog
          fileAssetId={previewFile.fileAssetId}
          fileName={previewFile.fileName}
          mimeType={previewFile.mimeType}
          api={api}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}

type FileAttachmentProps = {
  fileAssetId: number;
  fileName: string | undefined;
  mimeType: string | undefined;
  fileSizeBytes: number | undefined;
  isOwn: boolean;
  api: ReturnType<typeof useApi>;
  onPreview: (file: { fileAssetId: number; fileName: string; mimeType: string } | null) => void;
};

function FileAttachment({ fileAssetId, fileName, mimeType, fileSizeBytes, isOwn, api, onPreview }: FileAttachmentProps) {
  const isImage = mimeType?.startsWith('image/');

  if (isImage) {
    return (
      <div className={cn('mt-1 rounded-2xl overflow-hidden', isOwn ? 'bg-primary/90' : 'bg-muted')}>
        <img
          src={api.downloadFileUrl(fileAssetId)}
          alt={fileName || '图片'}
          className="max-w-64 max-h-64 object-contain cursor-pointer hover:opacity-90"
          onClick={() => onPreview({ fileAssetId, fileName: fileName || '图片', mimeType: mimeType || 'image/*' })}
        />
        <div className="flex items-center justify-between px-3 py-1.5">
          {fileName && (
            <div className="text-xs text-muted-foreground truncate max-w-[120px]">{fileName}</div>
          )}
          <Button size="sm" variant="ghost" className={cn('h-6 px-2 text-[10px]', isOwn ? 'text-primary-foreground/80 hover:bg-primary-foreground/20' : '')} onClick={() => window.open(api.downloadFileUrl(fileAssetId), '_blank')}>
            <Download size={11} className="mr-0.5" />下载
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('mt-1 rounded-2xl overflow-hidden', isOwn ? 'bg-primary/90' : 'bg-muted')}>
      <div className="flex items-center gap-3 p-3">
        <Paperclip size={16} className={isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{fileName || '未知文件'}</div>
          {fileSizeBytes ? <div className="text-xs opacity-70">{Math.round(fileSizeBytes / 1024)} KB</div> : null}
        </div>
        <Button size="sm" variant="ghost" className={cn('shrink-0', isOwn ? 'text-primary-foreground hover:bg-primary-foreground/20' : '')} onClick={() => window.open(api.downloadFileUrl(fileAssetId), '_blank')}>
          <Download size={14} className="mr-1" /> 下载
        </Button>
      </div>
    </div>
  );
}

type FilePreviewDialogProps = {
  fileAssetId: number;
  fileName: string;
  mimeType: string;
  api: ReturnType<typeof useApi>;
  onClose: () => void;
};

function FilePreviewDialog({ fileAssetId, fileName, mimeType, api, onClose }: FilePreviewDialogProps) {
  const isImage = mimeType.startsWith('image/');
  const fileUrl = api.downloadFileUrl(fileAssetId);

  const [imgSize, setImgSize] = React.useState<{ w: number; h: number } | null>(null);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    if (!isImage) return;
    const img = new Image();
    img.onload = () => {
      const maxW = Math.min(img.naturalWidth, window.innerWidth * 0.85);
      const maxH = Math.min(img.naturalHeight, window.innerHeight * 0.85);
      const scale = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight);
      setImgSize({ w: Math.round(img.naturalWidth * scale), h: Math.round(img.naturalHeight * scale) });
    };
    img.src = fileUrl;
  }, [isImage, fileUrl]);

  const dlgStyle: React.CSSProperties = isImage && imgSize
    ? { width: imgSize.w + 48, height: imgSize.h + 64, maxWidth: '95vw', maxHeight: '90vh' }
    : { width: 'auto', height: 'auto', maxWidth: '90vw', maxHeight: '85vh' };

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="!p-0 !gap-0"
        style={dlgStyle}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b bg-white">
          <div className="text-sm font-medium truncate">{fileName}</div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={() => window.open(fileUrl, '_blank')}>
              <Download size={14} className="mr-1" />下载
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>关闭</Button>
          </div>
        </div>
        {/* Image content */}
        <div className="flex-1 overflow-hidden bg-[#f5f5f5]" style={{ height: isImage && imgSize ? imgSize.h : undefined }}>
          {isImage ? (
            <div className="w-full h-full flex items-center justify-center overflow-hidden">
              <img
                ref={imgRef}
                src={fileUrl}
                alt={fileName}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <Paperclip size={48} className="mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">此文件类型暂不支持预览</p>
                <Button onClick={() => window.open(fileUrl, '_blank')}>
                  <Download size={14} className="mr-2" />下载文件
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
