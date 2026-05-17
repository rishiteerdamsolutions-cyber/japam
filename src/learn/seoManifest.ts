export type SeoManifest = {
  generatedAt: string;
  langs: string[];
  bySlug: Record<string, string[]>;
};

let manifestPromise: Promise<SeoManifest | null> | null = null;

function manifestUrl(): string {
  const base = import.meta.env.BASE_URL || '/';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}content/seo/manifest.json`;
}

export function loadSeoManifest(): Promise<SeoManifest | null> {
  if (!manifestPromise) {
    manifestPromise = fetch(manifestUrl())
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);
  }
  return manifestPromise;
}

export function clearSeoManifestCache(): void {
  manifestPromise = null;
}

export async function getPublishedLangsForSlug(slug: string): Promise<string[]> {
  const manifest = await loadSeoManifest();
  const langs = manifest?.bySlug?.[slug];
  if (langs?.length) return langs;
  return ['en'];
}
