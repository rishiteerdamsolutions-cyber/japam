/** Download or share a PNG blob — works on mobile browsers where bare <a download> often fails. */
export async function downloadOrSaveBlob(blob: Blob, filename: string): Promise<'downloaded' | 'shared' | 'failed'> {
  const type = blob.type || 'image/png';
  const file = new File([blob], filename, { type });

  if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
    try {
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Japam satsang' });
        return 'shared';
      }
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      if (name === 'AbortError') return 'failed';
    }
  }

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
    return 'downloaded';
  } catch {
    return 'failed';
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}
