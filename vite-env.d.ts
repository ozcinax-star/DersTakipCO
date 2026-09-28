/// <reference types="vite/client" />

interface OldAppScanResult {
  source: string;
  path: string;
  lastModified?: number;
  counts?: { teachers: number; students: number; lessons: number; groups: number };
  data?: Record<string, string>;
  error?: string;
}

type DriveResult<T> = { ok: true; result: T } | { ok: false; error: string };

interface DriveStatus {
  configured: boolean;
  connected: boolean;
  persistent: boolean;
  email: string | null;
  lastUpload: DriveUploadSummary | null;
  lastDownload: (DriveUploadSummary & { downloadedAt: string }) | null;
}

interface DriveUploadSummary {
  uploadedAt: string;
  device: string | null;
  teachers: number;
  students: number;
  lessons: number;
}

interface DriveDownload extends DriveUploadSummary {
  json: string;
}

interface Window {
  // Electron preload köprüsü (tarayıcıda/geliştirmede tanımsız olabilir)
  derstakip?: {
    getVersion: () => Promise<string>;
    scanOldAppData: () => Promise<OldAppScanResult[]>;
    autoBackup: (json: string) => Promise<boolean>;
    saveBackup: (json: string, suggestedName?: string) => Promise<string | null>;
    snapshotBackup: (json: string, label?: string) => Promise<string | null>;
    drive: {
      status: () => Promise<DriveResult<DriveStatus>>;
      connect: () => Promise<DriveResult<DriveStatus>>;
      cancel: () => Promise<DriveResult<boolean>>;
      disconnect: () => Promise<DriveResult<DriveStatus>>;
      upload: (json: string) => Promise<DriveResult<DriveUploadSummary>>;
      download: () => Promise<DriveResult<DriveDownload | null>>;
      markDownloaded: (summary: DriveUploadSummary) => Promise<DriveResult<boolean>>;
    };
  };
}
