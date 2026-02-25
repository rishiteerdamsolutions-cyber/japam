/// <reference types="vite/client" />

interface RegisterSWOptions {
  immediate?: boolean;
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegisteredSW?: (swUrl: string, registration: ServiceWorkerRegistration | undefined) => void;
  onRegisterError?: (error: unknown) => void;
}

declare module 'virtual:pwa-register' {
  export function registerSW(options?: RegisterSWOptions): () => void;
}
