import { FullBackupData } from '../types';
import { dbService, RestoreResult } from './db';

// Google Drive aktarımı yalnızca masaüstü uygulamasında (preload köprüsü varken) kullanılabilir
export const driveBridge = () => window.derstakip?.drive;

export const unwrap = <T,>(r: DriveResult<T>): T => {
  if ('error' in r) throw new Error(r.error);
  return (r as { ok: true; result: T }).result;
};

export const formatDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

export async function uploadToDrive(): Promise<DriveUploadSummary> {
  const bridge = driveBridge();
  if (!bridge) throw new Error('Google Drive bu ortamda kullanılamıyor.');
  return unwrap(await bridge.upload(JSON.stringify(dbService.exportAll())));
}

export async function downloadFromDrive(): Promise<DriveDownload | null> {
  const bridge = driveBridge();
  if (!bridge) throw new Error('Google Drive bu ortamda kullanılamıyor.');
  return unwrap(await bridge.download());
}

// Başka bir bilgisayar, bu bilgisayarın son yükleme/çekme işleminden sonra Drive'a veri yüklediyse true
export function isRemoteNewerThanLocalSync(remote: DriveUploadSummary, status: DriveStatus): boolean {
  const lastSync = [status.lastUpload?.uploadedAt, status.lastDownload?.uploadedAt]
    .filter((d): d is string => !!d)
    .sort()
    .pop();
  return !lastSync || remote.uploadedAt > lastSync;
}

// Drive'daki verileri bu bilgisayardaki verilerin yerine koyar.
// Mevcut veri varsa önce Yedekler klasörüne bir kopyası yazılır; yazılamazsa işlem yapılmaz.
export async function applyDriveData(
  remote: DriveDownload,
  restore: (data: FullBackupData) => RestoreResult = data => dbService.restoreBackup(data)
): Promise<RestoreResult> {
  const data = JSON.parse(remote.json) as FullBackupData;
  if (dbService.getTeachers().length > 0 && window.derstakip?.snapshotBackup) {
    await window.derstakip.snapshotBackup(JSON.stringify(dbService.exportAll(), null, 2), 'drive-oncesi');
  }
  const result = restore(data);
  dbService.repairOrphans();
  const { json: _json, ...summary } = remote;
  await driveBridge()?.markDownloaded(summary);
  return result;
}
