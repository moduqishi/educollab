import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, LoaderCircle, Mail, RotateCcw, ShieldCheck, UserRound, ZoomIn } from 'lucide-react';
import { useApi } from '@/app/api';
import { useAuth } from '@/app/auth';
import { setTitle } from '@/app/title';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageError, PageLoading } from '@/screens/common/States';
import { PageHero } from '@/screens/shell/PageHero';
import type { UserProfile } from '@/lib/types';
import {
  AVATAR_CROP_DIAMETER,
  AVATAR_EXPORT_SIZE,
  AVATAR_SIZE,
  MAX_ZOOM,
  MIN_ZOOM,
  ZOOM_STEP,
  clampAvatarPosition,
  createAvatarCropperState,
  defaultAvatarPosition,
  getAvatarContainZoom,
  getAvatarRenderLayout,
  getAvatarScaledSize,
  normalizeAvatarState,
  type AvatarCropperState,
} from './avatarCrop';

export function ProfilePage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const { session, setSession, token } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [name, setName] = React.useState('');
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [cropper, setCropper] = React.useState<AvatarCropperState | null>(null);
  const [avatarRenderNonce, setAvatarRenderNonce] = React.useState(0);

  React.useEffect(() => setTitle(['个人中心']), []);

  const profileQuery = useQuery({
    queryKey: ['user-profile', token],
    enabled: !!token,
    queryFn: () => api.userMe(),
  });

  React.useEffect(() => {
    if (profileQuery.data) setName(profileQuery.data.name || '');
  }, [profileQuery.data]);

  const syncProfile = React.useCallback(
    (profile: UserProfile) => {
      queryClient.setQueryData(['user-profile', token], profile);
      void queryClient.invalidateQueries({ queryKey: ['user-profile', token] });
      if (session) {
        setSession({ ...session, profile });
      }
    },
    [queryClient, session, setSession, token],
  );

  const updateMutation = useMutation({
    mutationFn: () => api.updateMyProfile({ name: name.trim() }),
    onSuccess: (profile) => {
      setMessage('资料已更新');
      setError(null);
      syncProfile(profile);
    },
    onError: (err: Error) => {
      setError(err.message || '保存失败，请稍后重试');
      setMessage(null);
    },
  });

  const avatarMutation = useMutation({
    mutationFn: (file: File) => api.uploadMyAvatar(file),
    onSuccess: (profile) => {
      const nextProfile = {
        ...profile,
        avatar: withAvatarCacheBust(profile.avatar),
      };
      setMessage('头像已更新');
      setError(null);
      setAvatarRenderNonce((current) => current + 1);
      syncProfile(nextProfile);
      setCropper(null);
    },
    onError: (err: Error) => {
      setError(err.message || '头像上传失败，请稍后重试');
      setMessage(null);
    },
  });

  const handlePickAvatar = React.useCallback(() => {
    if (!avatarMutation.isPending) {
      fileInputRef.current?.click();
    }
  }, [avatarMutation.isPending]);

  const handleAvatarChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      setMessage(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropper(createAvatarCropperState(file.name, String(reader.result || '')));
      setMessage(null);
      setError(null);
    };
    reader.onerror = () => {
      setError('读取图片失败');
      setMessage(null);
    };
    reader.readAsDataURL(file);
  }, []);

  if (profileQuery.isLoading) {
    return <PageLoading label="正在加载个人中心..." />;
  }

  if (profileQuery.isError || !profileQuery.data) {
    return <PageError title="个人中心加载失败" onRetry={() => profileQuery.refetch()} />;
  }

  const profile = profileQuery.data;
  const roleLabel = profile.role === 'TEACHER' ? '教师' : '学生';

  return (
    <div>
      <PageHero title="个人中心" subtitle="管理头像、昵称和基础账号信息。" />
      <div className="px-8 pb-10">
        <div className="mx-auto grid max-w-[1200px] gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="border-muted/70">
            <CardContent className="flex flex-col items-center gap-5 p-8 text-center">
              <Avatar className="h-28 w-28 border-4 border-primary/10 shadow-sm">
                <AvatarImage key={`${profile.avatar ?? 'none'}-${avatarRenderNonce}`} src={profile.avatar} />
                <AvatarFallback className="text-3xl">{profile.name?.slice(0, 1) || 'U'}</AvatarFallback>
              </Avatar>

              <div className="space-y-1">
                <div className="text-xl font-semibold">{profile.name}</div>
                <div className="text-sm text-muted-foreground">{profile.email}</div>
              </div>

              <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                {roleLabel}
              </Badge>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />

              <Button type="button" variant="outline" className="w-full gap-2 rounded-full" disabled={avatarMutation.isPending} onClick={handlePickAvatar}>
                {avatarMutation.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <Camera size={16} />}
                上传新头像
              </Button>

              <div className="w-full rounded-2xl bg-muted/40 p-4 text-left text-sm text-muted-foreground">
                支持 PNG、JPG、WEBP、GIF，大小不超过 5MB。选图后可拖动、缩放，满意后再保存。
              </div>
            </CardContent>
          </Card>

          <Card className="border-muted/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">基础资料</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profile-name" className="flex items-center gap-2">
                    <UserRound size={14} />
                    姓名
                  </Label>
                  <Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="请输入姓名" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail size={14} />
                    邮箱
                  </Label>
                  <Input value={profile.email} disabled />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="flex items-center gap-2">
                    <ShieldCheck size={14} />
                    身份
                  </Label>
                  <div className="rounded-2xl border border-dashed border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">{roleLabel}</div>
                </div>
              </div>

              {message ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
              {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

              <div className="flex justify-end">
                <Button className="rounded-full px-6" disabled={!name.trim() || updateMutation.isPending} onClick={() => updateMutation.mutate()}>
                  {updateMutation.isPending ? '保存中...' : '保存资料'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AvatarCropDialog
        state={cropper}
        pending={avatarMutation.isPending}
        onClose={() => setCropper(null)}
        onChange={setCropper}
        onConfirm={async () => {
          if (!cropper) return;
          const file = await exportCroppedAvatar(cropper);
          avatarMutation.mutate(file);
        }}
      />
    </div>
  );
}

function AvatarCropDialog({
  state,
  pending,
  onClose,
  onChange,
  onConfirm,
}: {
  state: AvatarCropperState | null;
  pending: boolean;
  onClose: () => void;
  onChange: React.Dispatch<React.SetStateAction<AvatarCropperState | null>>;
  onConfirm: () => Promise<void>;
}) {
  const imageRef = React.useRef<HTMLImageElement | null>(null);
  const surfaceRef = React.useRef<HTMLDivElement | null>(null);
  const dragStateRef = React.useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [imageSize, setImageSize] = React.useState({ width: AVATAR_SIZE, height: AVATAR_SIZE });
  const [dragging, setDragging] = React.useState(false);

  React.useEffect(() => {
    if (!state) {
      setImageSize({ width: AVATAR_SIZE, height: AVATAR_SIZE });
      dragStateRef.current = null;
      setDragging(false);
      return;
    }
    setImageSize({ width: AVATAR_SIZE, height: AVATAR_SIZE });
  }, [state]);

  const updateState = (updater: (current: AvatarCropperState) => AvatarCropperState) => {
    onChange((current) => {
      if (!current) return current;
      return updater(current);
    });
  };

  const handleLoadedImage = () => {
    if (!state || !imageRef.current) return;
    const loadedSize = {
      width: imageRef.current.naturalWidth || AVATAR_SIZE,
      height: imageRef.current.naturalHeight || AVATAR_SIZE,
    };
    setImageSize(loadedSize);
    onChange((current) => {
      if (!current) return current;
      return normalizeAvatarState(
        {
          ...current,
          zoom: Math.max(current.zoom, getAvatarContainZoom(loadedSize)),
          position: defaultAvatarPosition(),
        },
        loadedSize,
      );
    });
  };

  if (!state) return null;

  const normalizedState = normalizeAvatarState(state, imageSize);
  const layout = getAvatarRenderLayout(imageSize, normalizedState.zoom, normalizedState.position);
  const minZoom = Math.max(MIN_ZOOM, getAvatarContainZoom(imageSize));
  const cropInset = (AVATAR_SIZE - AVATAR_CROP_DIAMETER) / 2;

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: normalizedState.position.x,
      originY: normalizedState.position.y,
    };
    surfaceRef.current?.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const nextPosition = {
      x: drag.originX + (event.clientX - drag.startX),
      y: drag.originY + (event.clientY - drag.startY),
    };
    const scaled = getAvatarScaledSize(imageSize, normalizedState.zoom);
    updateState((current) => ({
      ...current,
      position: clampAvatarPosition(nextPosition, scaled),
    }));
  };

  const finishDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragStateRef.current = null;
    setDragging(false);
    if (surfaceRef.current?.hasPointerCapture(event.pointerId)) {
      surfaceRef.current.releasePointerCapture(event.pointerId);
    }
  };

  const handleReset = () => {
    updateState((current) => ({
      ...current,
      zoom: minZoom,
      position: defaultAvatarPosition(),
    }));
  };

  const handleClose = () => {
    dragStateRef.current = null;
    setDragging(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DialogContent className="w-[min(92vw,760px)] max-w-none overflow-hidden p-0" showCloseButton={false}>
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>裁剪头像</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 px-6 py-6">
          <div className="flex justify-center">
            <div
              ref={surfaceRef}
              className={`relative overflow-hidden rounded-[32px] border border-border/70 bg-muted/20 select-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
            >
              <img
                ref={imageRef}
                src={state.imageUrl}
                alt="头像裁剪原图"
                className="absolute max-w-none"
                draggable={false}
                onDragStart={(event) => event.preventDefault()}
                style={{
                  width: layout.width,
                  height: layout.height,
                  left: layout.left,
                  top: layout.top,
                }}
                onLoad={handleLoadedImage}
              />
              <div className="pointer-events-none absolute inset-0 bg-black/35" />
              <div
                className="pointer-events-none absolute rounded-full border border-white/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.42)]"
                style={{
                  width: AVATAR_CROP_DIAMETER,
                  height: AVATAR_CROP_DIAMETER,
                  left: cropInset,
                  top: cropInset,
                }}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-xs font-medium tracking-[0.2em] text-white/90">
                拖动图片调整位置
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_120px] md:items-center">
            <div className="space-y-3 rounded-3xl border border-border/60 bg-muted/20 p-4">
              <div className="text-sm font-medium">缩放</div>
              <SliderField
                icon={<ZoomIn size={14} />}
                label="头像缩放"
                min={minZoom}
                max={MAX_ZOOM}
                step={ZOOM_STEP}
                value={normalizedState.zoom}
                valueLabel={`${Math.round(normalizedState.zoom * 100)}%`}
                onChange={(value) =>
                  updateState((current) =>
                    normalizeAvatarState(
                      {
                        ...current,
                        zoom: value,
                      },
                      imageSize,
                    ),
                  )
                }
              />
              <div className="text-sm text-muted-foreground">现在可以缩小到完整显示整张图。拖动和缩放都会直接影响最终保存结果。</div>
            </div>

            <div className="flex flex-col items-center gap-3 rounded-3xl border border-border/60 bg-muted/20 p-4">
              <div className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">预览</div>
              <AvatarPreview imageUrl={state.imageUrl} layout={layout} />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" className="gap-2 rounded-full" onClick={handleReset} disabled={pending}>
              <RotateCcw size={14} />
              重置
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={handleClose} disabled={pending}>
            取消
          </Button>
          <Button className="rounded-full" onClick={() => void onConfirm()} disabled={pending}>
            {pending ? '上传中...' : '保存头像'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AvatarPreview({
  imageUrl,
  layout,
}: {
  imageUrl: string;
  layout: { width: number; height: number; left: number; top: number };
}) {
  const previewSize = 96;
  const scale = previewSize / AVATAR_SIZE;

  return (
    <div className="relative overflow-hidden rounded-full border border-border/60 shadow-sm" style={{ width: previewSize, height: previewSize }}>
      <img
        src={imageUrl}
        alt="头像预览"
        className="absolute max-w-none"
        draggable={false}
        onDragStart={(event) => event.preventDefault()}
        style={{
          width: layout.width * scale,
          height: layout.height * scale,
          left: layout.left * scale,
          top: layout.top * scale,
        }}
      />
    </div>
  );
}

function SliderField({
  icon,
  label,
  min,
  max,
  step,
  value,
  valueLabel,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  valueLabel: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 text-sm font-medium">
        <div className="flex items-center gap-2">
          {icon}
          <span>{label}</span>
        </div>
        <span className="rounded-full bg-background px-2.5 py-1 text-xs text-muted-foreground">{valueLabel}</span>
      </div>
      <input
        type="range"
        className="w-full accent-primary"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

async function exportCroppedAvatar(state: AvatarCropperState): Promise<File> {
  const image = await loadImage(state.imageUrl);
  const normalizedState = normalizeAvatarState(state, {
    width: image.naturalWidth,
    height: image.naturalHeight,
  });
  const layout = getAvatarRenderLayout(
    {
      width: image.naturalWidth,
      height: image.naturalHeight,
    },
    normalizedState.zoom,
    normalizedState.position,
  );
  const cropInset = (AVATAR_SIZE - AVATAR_CROP_DIAMETER) / 2;
  const exportScale = AVATAR_EXPORT_SIZE / AVATAR_CROP_DIAMETER;

  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_EXPORT_SIZE;
  canvas.height = AVATAR_EXPORT_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to process avatar crop.');

  context.clearRect(0, 0, AVATAR_EXPORT_SIZE, AVATAR_EXPORT_SIZE);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image,
    (layout.left - cropInset) * exportScale,
    (layout.top - cropInset) * exportScale,
    layout.width * exportScale,
    layout.height * exportScale,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error('Avatar export failed.'));
    }, 'image/png');
  });

  return new File([blob], `${stripExtension(state.fileName)}.png`, { type: 'image/png' });
}

function stripExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '');
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image load failed.'));
    image.src = src;
  });
}

function withAvatarCacheBust(avatar?: string) {
  if (!avatar) return avatar;
  const separator = avatar.includes('?') ? '&' : '?';
  return `${avatar}${separator}_ts=${Date.now()}`;
}
