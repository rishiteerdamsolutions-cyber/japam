export type DownloadBlobResult = 'downloaded' | 'shared' | 'failed';

export type DownloadBlobOptions = {
  /**
   * Prefer a file download (organiser report). Default prefers the system share
   * sheet when available (devotee WhatsApp flow).
   */
  preferDownload?: boolean;
  shareTitle?: string;
};

function triggerAnchorDownload(blob: Blob, filename: string): boolean {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch {
    return false;
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

async function trySaveFilePicker(blob: Blob, filename: string): Promise<boolean> {
  const w = window as Window & {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{ description: string; accept: Record<string, string[]> }>;
    }) => Promise<FileSystemFileHandle>;
  };
  if (typeof w.showSaveFilePicker !== 'function') return false;
  try {
    const ext = filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg')
      ? 'jpeg'
      : 'png';
    const mime = blob.type || (ext === 'jpeg' ? 'image/jpeg' : 'image/png');
    const handle = await w.showSaveFilePicker({
      suggestedName: filename,
      types: [
        {
          description: 'Image',
          accept: { [mime]: [ext === 'jpeg' ? '.jpg' : '.png'] },
        },
      ],
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    if (name === 'AbortError') return false;
    return false;
  }
}

async function tryShare(
  blob: Blob,
  filename: string,
  title: string,
): Promise<'shared' | 'aborted' | 'unavailable'> {
  if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
    return 'unavailable';
  }
  const type = blob.type || 'image/png';
  const file = new File([blob], filename, { type });
  try {
    if (!navigator.canShare({ files: [file] })) return 'unavailable';
    await navigator.share({ files: [file], title });
    return 'shared';
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    if (name === 'AbortError') return 'aborted';
    return 'unavailable';
  }
}

/**
 * Download or share a blob. Works better on mobile than bare `<a download>`.
 * For organiser reports, pass `{ preferDownload: true }` so canceling a share
 * sheet still falls through to a real download attempt.
 */
export async function downloadOrSaveBlob(
  blob: Blob,
  filename: string,
  options: DownloadBlobOptions = {},
): Promise<DownloadBlobResult> {
  const preferDownload = options.preferDownload === true;
  const shareTitle = options.shareTitle ?? 'Japam satsang';

  if (preferDownload) {
    if (await trySaveFilePicker(blob, filename)) return 'downloaded';
    if (triggerAnchorDownload(blob, filename)) return 'downloaded';
    const shared = await tryShare(blob, filename, shareTitle);
    if (shared === 'shared') return 'shared';
    return 'failed';
  }

  const shared = await tryShare(blob, filename, shareTitle);
  if (shared === 'shared') return 'shared';
  // User cancelled share — still try download so the action isn't a no-op.
  if (triggerAnchorDownload(blob, filename)) return 'downloaded';
  return 'failed';
}
