/// <reference types="vite/client" />

interface OldAppScanResult {
  source: string;
  path: string;
  lastModified?: number;
  counts?: { teachers: number; students: number; lessons: number; groups: number };
  data?: Record<string, string>;
  error?: string;
}

interface Window {
  // Electron preload köprüsü (tarayıcıda/geliştirmede tanımsız olabilir)
  derstakip?: {
    getVersion: () => Promise<string>;
    scanOldAppData: () => Promise<OldAppScanResult[]>;
    autoBackup: (json: string) => Promise<boolean>;
    saveBackup: (json: string, suggestedName?: string) => Promise<string | null>;
  };
}
