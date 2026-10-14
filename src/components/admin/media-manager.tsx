'use client';

import { ArrowDown, ArrowUp, Star, Trash2, Upload, Video } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import {
  addMediaAction,
  deleteMediaAction,
  reorderMediaAction,
  setPrimaryMediaAction,
  updateMediaAction,
} from '@/lib/admin/actions';
import type { AdminMedia } from '@/lib/admin/queries';
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MEDIA_BUCKET,
} from '@/lib/data/constants';
import { getBrowserSupabase } from '@/lib/supabase/browser';
import { ConfirmButton } from './confirm-button';
import { useAdminError } from './use-admin-error';

const MAX_DIMENSION = 2400;
const VIDEO_EXT: Record<string, string> = { 'video/mp4': 'mp4', 'video/webm': 'webm' };

/**
 * Re-encodes an image in the browser: scales it down and writes a fresh WebP (JPEG as fallback).
 * Drawing to a canvas drops all metadata (EXIF, GPS, camera serial numbers).
 */
async function reencodeImage(file: File): Promise<{ blob: Blob; ext: string; width: number; height: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  const webp = await encode('image/webp');
  if (webp && webp.type === 'image/webp') return { blob: webp, ext: 'webp', width, height };
  const jpeg = await encode('image/jpeg');
  if (!jpeg) throw new Error('encoding failed');
  return { blob: jpeg, ext: 'jpg', width, height };
}

export function MediaManager({ vehicleId, media }: { vehicleId: string; media: AdminMedia[] }) {
  const t = useTranslations('admin.media');
  const errorText = useAdminError();
  const router = useRouter();
  const inputId = useId();
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [messages, setMessages] = useState<string[]>([]);

  async function upload(files: FileList) {
    const list = Array.from(files);
    const problems: string[] = [];
    setMessages([]);
    setProgress({ done: 0, total: list.length });
    const supabase = getBrowserSupabase();

    for (const [index, file] of list.entries()) {
      const isImage = (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type);
      const isVideo = (ACCEPTED_VIDEO_TYPES as readonly string[]).includes(file.type);
      if (!isImage && !isVideo) {
        problems.push(t('badType', { name: file.name }));
        continue;
      }
      if (file.size > (isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES)) {
        problems.push(t('tooLarge', { name: file.name }));
        continue;
      }
      try {
        let body: Blob = file;
        let ext = VIDEO_EXT[file.type] ?? 'mp4';
        let width: number | null = null;
        let height: number | null = null;
        if (isImage) {
          const encoded = await reencodeImage(file);
          ({ blob: body, ext, width, height } = encoded);
        }
        const path = `${vehicleId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(MEDIA_BUCKET)
          .upload(path, body, { contentType: body.type || file.type, cacheControl: '31536000', upsert: false });
        if (uploadError) throw uploadError;
        const result = await addMediaAction({
          vehicleId,
          storagePath: path,
          mediaType: isImage ? 'image' : 'video',
          width,
          height,
        });
        if (!result.ok) {
          await supabase.storage.from(MEDIA_BUCKET).remove([path]);
          throw new Error(result.error);
        }
      } catch (error) {
        console.error(error);
        problems.push(t('failed', { name: file.name }));
      }
      setProgress({ done: index + 1, total: list.length });
    }
    setProgress(null);
    setMessages(problems);
    router.refresh();
  }

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      setMessages(result.ok ? [] : [errorText(result.error ?? 'generic')]);
      router.refresh();
    });
  }

  function move(index: number, delta: -1 | 1) {
    const ids = media.map((m) => m.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    run(() => reorderMediaAction(vehicleId, ids));
  }

  const busy = pending || progress !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <p className="text-muted-foreground text-sm">{t('intro')}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" disabled={busy}>
            <label htmlFor={inputId} className="cursor-pointer">
              <Upload aria-hidden /> {t('upload')}
            </label>
          </Button>
          <input
            id={inputId}
            type="file"
            multiple
            className="sr-only"
            accept={[...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES].join(',')}
            disabled={busy}
            onChange={(e) => {
              const files = e.currentTarget.files;
              if (files?.length) void upload(files);
              e.currentTarget.value = '';
            }}
          />
          <span className="text-muted-foreground text-xs">{t('dropHint')}</span>
        </div>
        {progress ? (
          <p role="status" className="text-sm">
            {t('uploading', progress)}
          </p>
        ) : null}
        {messages.length ? (
          <ul role="alert" className="text-destructive space-y-1 text-sm">
            {messages.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        ) : null}

        {media.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('empty')}</p>
        ) : (
          <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy={busy}>
            {media.map((item, index) => (
              <li key={item.id} className="space-y-3 rounded-lg border p-3">
                <div className="bg-muted relative aspect-[4/3] overflow-hidden rounded-md">
                  {item.mediaType === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded file
                    <img src={item.url} alt={item.altText} className="size-full object-cover" loading="lazy" />
                  ) : (
                    <div className="text-muted-foreground flex size-full flex-col items-center justify-center gap-2">
                      <Video className="size-8" aria-hidden />
                      {t('video')}
                    </div>
                  )}
                  {item.isPrimary ? (
                    <span className="bg-primary text-primary-foreground absolute top-2 left-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold">
                      <Star className="size-3" aria-hidden /> {t('primary')}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy || index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={t('moveUp')}
                  >
                    <ArrowUp aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy || index === media.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={t('moveDown')}
                  >
                    <ArrowDown aria-hidden />
                  </Button>
                  {item.mediaType === 'image' && !item.isPrimary ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => run(() => setPrimaryMediaAction(item.id))}
                    >
                      <Star aria-hidden /> {t('setPrimary')}
                    </Button>
                  ) : null}
                  <ConfirmButton
                    variant="ghost"
                    size="sm"
                    className="text-destructive ml-auto"
                    disabled={busy}
                    message={t('confirmDelete')}
                    confirmLabel={t('delete')}
                    onConfirm={() => run(() => deleteMediaAction(item.id))}
                    aria-label={t('delete')}
                  >
                    <Trash2 aria-hidden />
                  </ConfirmButton>
                </div>
                <MediaMetaForm key={item.id} item={item} disabled={busy} />
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function MediaMetaForm({ item, disabled }: { item: AdminMedia; disabled: boolean }) {
  const t = useTranslations('admin.media');
  const errorText = useAdminError();
  const router = useRouter();
  const [altText, setAltText] = useState(item.altText);
  const [caption, setCaption] = useState(item.caption);
  const [isDamageView, setIsDamageView] = useState(item.isDamageView);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const id = useId();
  const dirty = altText !== item.altText || caption !== item.caption || isDamageView !== item.isDamageView;

  return (
    <div className="space-y-2">
      <div>
        <Label htmlFor={`${id}-alt`} className="text-xs">
          {t('altText')}
        </Label>
        <Input
          id={`${id}-alt`}
          className="h-9"
          value={altText}
          maxLength={300}
          onChange={(e) => setAltText(e.currentTarget.value)}
        />
      </div>
      <div>
        <Label htmlFor={`${id}-caption`} className="text-xs">
          {t('caption')}
        </Label>
        <Input
          id={`${id}-caption`}
          className="h-9"
          value={caption}
          maxLength={300}
          onChange={(e) => setCaption(e.currentTarget.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-[var(--primary)]"
          checked={isDamageView}
          onChange={(e) => setIsDamageView(e.currentTarget.checked)}
        />
        {t('damageView')}
      </label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled || pending || !dirty}
          onClick={() =>
            startTransition(async () => {
              const result = await updateMediaAction({ id: item.id, altText, caption, isDamageView });
              setNotice(result.ok ? t('saved') : errorText(result.error));
              if (result.ok) router.refresh();
            })
          }
        >
          {t('saveMeta')}
        </Button>
        {notice ? (
          <span role="status" className="text-muted-foreground text-xs">
            {notice}
          </span>
        ) : null}
      </div>
    </div>
  );
}
