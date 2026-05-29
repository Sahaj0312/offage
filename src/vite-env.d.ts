/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OFFAGE_WS?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
