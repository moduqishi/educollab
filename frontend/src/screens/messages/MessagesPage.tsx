import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MessageSquare, Paperclip, Send, Upload, Users, Download, Search, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { setTitle } from '@/app/title';
import { useApi } from '@/app/api';
import { useAuth } from '@/app/auth';
import { PageHero } from '@/screens/shell/PageHero';
import { PageEmpty, PageError, PageLoading } from '@/screens/common/States';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { ChatMessageRecord, ChatRoomRecord } from '@/lib/api-client/chat';

export function MessagesPage() {
  const api = useApi();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const [roomSearch, setRoomSearch] = React.useState('');

  const rawRoom = searchParams.get('room');
  const projectIdParam = searchParams.get('projectId');
  const selectedRoomId = rawRoom ? Number(rawRoom) : null;

  React.useEffect(() => setTitle(['消息']), []);

  // Resolve projectId -> chatRoomId if navigating from project tab
  const projectRoomQ = useQuery({
    queryKey: ['chatProjectRoomResolve', projectIdParam],
    enabled: !!projectIdParam && !rawRoom,
    queryFn: () => api.getChatProjectRoom(Number(projectIdParam)),
  });

  const effectiveRoomId = projectRoomQ.data?.id ?? selectedRoomId;

  React.useEffect(() => {
    if (projectRoomQ.data?.id) {
      navigate(`/app/messages?room=${projectRoomQ.data.id}`, { replace: true });
    }
  }, [projectRoomQ.data?.id]);

  const roomsQ = useQuery({
    queryKey: ['chatRooms'],
    queryFn: () => api.chatRooms(),
  });

  const messagesQ = useQuery({
    queryKey: ['chatMessages', effectiveRoomId],
    enabled: !!effectiveRoomId,
    queryFn: () => api.chatMessages(effectiveRoomId!),
  });

  const sendM = useMutation({
    mutationFn: (payload: { content?: string; fileAssetId?: number; fileName?: string; fileSizeBytes?: number; mimeType?: string }) =>
      api.sendChatMessage(effectiveRoomId!, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['chatMessages', effectiveRoomId] });
      await qc.invalidateQueries({ queryKey: ['chatRooms'] });
    },
  });

  const uploadM = useMutation({
    mutationFn: async (file: File) => {
      const roomId = effectiveRoomId!;
      const fileRecord = await api.uploadFile('CHAT_MESSAGE', roomId, file);
      await api.sendChatMessage(roomId, {
        fileAssetId: fileRecord.id,
        fileName: file.name,
        fileSizeBytes: file.size,
        mimeType: file.type,
      });
      await qc.invalidateQueries({ queryKey: ['chatMessages', roomId] });
      await qc.invalidateQueries({ queryKey: ['chatRooms'] });
    },
  });

  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  const [previewFile, setPreviewFile] = React.useState<{ fileAssetId: number; fileName: string; mimeType: string } | null>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesQ.data]);

  const rooms = ((roomsQ.data || []) as ChatRoomRecord[]).filter(r =>
    !roomSearch.trim() || r.name.toLowerCase().includes(roomSearch.trim().toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Left: room list */}
      <div className="w-80 border-r bg-white flex flex-col">
        <div className="p-4 border-b space-y-2">
          <div className="text-sm font-semibold text-muted-foreground">聊天室列表</div>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={roomSearch}
              onChange={e => setRoomSearch(e.target.value)}
              placeholder="搜索聊天室..."
              className="w-full h-8 rounded-md border border-muted bg-muted/30 pl-8 pr-8 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
            {roomSearch && (
              <button onClick={() => setRoomSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={12} />
              </button>
            )}
          </div>
        </div>
        <ScrollArea className="flex-1">
          {!roomsQ.isLoading && !rooms.length ? (
            <PageEmpty title="暂无聊天室" message="加入课程或项目后，自动创建对应的群聊。" icon={MessageSquare} />
          ) : (
            rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => navigate(`/app/messages?room=${room.id}`)}
                className={cn(
                  'w-full border-b p-4 text-left transition-colors hover:bg-muted/30',
                  effectiveRoomId === room.id && 'bg-primary/5'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    {room.roomType === 'PROJECT' ? <MessageSquare size={16} className="text-primary" /> : <Users size={16} className="text-primary" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="truncate font-semibold text-sm">{room.name}</div>
                      {room.lastMessageAt ? <div className="text-[10px] text-muted-foreground">{room.lastMessageAt.split(' ')[0]}</div> : null}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{room.roomType === 'PROJECT' ? '项目群聊' : '课程群聊'}</Badge>
                      <span className="text-[10px] text-muted-foreground">{room.memberCount}人</span>
                    </div>
                    {room.lastMessage ? (
                      <div className="mt-1 truncate text-xs text-muted-foreground">{room.lastMessage}</div>
                    ) : null}
                  </div>
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Right: chat area */}
      <div className="flex flex-1 flex-col">
        {!effectiveRoomId ? (
          <div className="flex flex-1 items-center justify-center">
            <PageEmpty title="选择一个聊天室" message="从左侧列表选择，开始聊天。" icon={MessageSquare} />
          </div>
        ) : messagesQ.isLoading || projectRoomQ.isLoading ? (
          <PageLoading label="正在加载聊天记录..." />
        ) : messagesQ.isError ? (
          <PageError title="加载失败" onRetry={() => messagesQ.refetch()} />
        ) : (
          <>
            {/* Chat header */}
            <div className="border-b bg-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <MessageSquare size={16} className="text-primary" />
                </div>
                <div>
                  <div className="font-semibold">{rooms.find(r => r.id === effectiveRoomId)?.name || projectRoomQ.data?.name}</div>
                  <div className="text-xs text-muted-foreground">{rooms.find(r => r.id === effectiveRoomId)?.memberCount || projectRoomQ.data?.memberCount} 人</div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1">
              <div className="flex flex-col gap-4 p-6">
                {((messagesQ.data || []) as ChatMessageRecord[]).slice().reverse().map((msg) => (
                  <ChatMessage key={msg.id} msg={msg} isOwn={msg.authorId === session?.profile.id} api={api} onPreview={setPreviewFile} />
                ))}
                {!(messagesQ.data || []).length && (
                  <div className="text-center text-sm text-muted-foreground py-12">暂无消息，快来发起对话吧。</div>
                )}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <ChatInput onSend={(content) => sendM.mutate({ content })} onUpload={(file) => uploadM.mutate(file)} sending={sendM.isPending || uploadM.isPending} />
          </>
        )}

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
    </div>
  );
}

function ChatMessage({ msg, isOwn, api, onPreview }: { msg: ChatMessageRecord; isOwn: boolean; api: ReturnType<typeof useApi>; onPreview: (file: { fileAssetId: number; fileName: string; mimeType: string } | null) => void }) {
  if (msg.fileAssetId) {
    return (
      <div className={cn('flex gap-3', isOwn && 'flex-row-reverse')}>
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={msg.authorAvatar || undefined} />
          <AvatarFallback>{msg.authorName?.slice(0, 1) || 'U'}</AvatarFallback>
        </Avatar>
        <div className={cn('max-w-[70%]', isOwn && 'items-end')}>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-semibold">{msg.authorName}</span>
            <span className="text-[10px] text-muted-foreground">{msg.createdAt}</span>
          </div>
          <FileAttachment
            fileAssetId={msg.fileAssetId}
            fileName={msg.fileName || undefined}
            mimeType={msg.mimeType || undefined}
            fileSizeBytes={msg.fileSizeBytes || undefined}
            isOwn={isOwn}
            api={api}
            onPreview={onPreview}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex gap-3', isOwn && 'flex-row-reverse')}>
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={msg.authorAvatar || undefined} />
        <AvatarFallback>{msg.authorName?.slice(0, 1) || 'U'}</AvatarFallback>
      </Avatar>
      <div className={cn('max-w-[70%]', isOwn && 'items-end')}>
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-semibold">{msg.authorName}</span>
          <span className="text-[10px] text-muted-foreground">{msg.createdAt}</span>
        </div>
        {msg.content && (
          <div className={cn('rounded-2xl px-4 py-2.5 text-sm', isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
            {msg.content}
          </div>
        )}
      </div>
    </div>
  );
}

function ChatInput({ onSend, onUpload, sending }: { onSend: (content: string) => void; onUpload: (file: File) => void; sending: boolean }) {
  const [text, setText] = React.useState('');
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <div className="border-t bg-white p-4">
      <div className="flex items-end gap-3">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            onUpload(file);
            if (fileRef.current) fileRef.current.value = '';
          }}
        />
        <Button variant="outline" size="icon" onClick={() => fileRef.current?.click()} disabled={sending}>
          <Paperclip size={16} />
        </Button>
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="输入消息，Enter 发送，Shift+Enter 换行..."
            rows={1}
            className="w-full resize-none rounded-xl border border-muted bg-muted/20 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>
        <Button size="icon" onClick={handleSend} disabled={sending || !text.trim()}>
          <Send size={16} />
        </Button>
      </div>
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
      <DialogContent showCloseButton={false} className="!p-0 !gap-0" style={dlgStyle}>
        <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b bg-white">
          <div className="text-sm font-medium truncate">{fileName}</div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={() => window.open(fileUrl, '_blank')}>
              <Download size={14} className="mr-1" />下载
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>关闭</Button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden bg-[#f5f5f5]" style={{ height: isImage && imgSize ? imgSize.h : undefined }}>
          {isImage ? (
            <div className="w-full h-full flex items-center justify-center overflow-hidden">
              <img src={fileUrl} alt={fileName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
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