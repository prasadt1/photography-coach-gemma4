/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEPLOYMENT_PROFILE?: 'judge' | 'artisan';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
