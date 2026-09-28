import React, { useEffect, useState } from 'react';
import { Cloud, UploadCloud, DownloadCloud, LogOut, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { FullBackupData } from '../types';
import { dbService, RestoreResult } from '../services/db';
import {
  driveBridge, unwrap, formatDateTime, uploadToDrive, downloadFromDrive, applyDriveData, isRemoteNewerThanLocalSync
} from '../services/driveSync';

interface DriveSyncCardProps {
  onRestore: (data: FullBackupData) => RestoreResult;
}

type Busy = null | 'status' | 'connect' | 'upload' | 'download' | 'apply' | 'disconnect';
type Pending =
  | { kind: 'pull'; remote: DriveDownload }
  | { kind: 'overwrite'; remote: DriveDownload };

export const DriveSyncCard: React.FC<DriveSyncCardProps> = ({ onRestore }) => {
  const bridge = driveBridge();
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [busy, setBusy] = useState<Busy>('status');
  const [pending, setPending] = useState<Pending | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const run = async (kind: Busy, fn: () => Promise<void>) => {
    setBusy(kind);
    setMessage(null);
    try {
      await fn();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.' });
    } finally {
      setBusy(null);
    }
  };

  const refreshStatus = async () => {
    if (!bridge) return;
    setStatus(unwrap(await bridge.status()));
  };

  useEffect(() => {
    run('status', refreshStatus);
  }, []);

  // Yapılandırılmamış sürümde kart hiç gösterilmez
  if (!bridge || (status && !status.configured)) return null;

  const localCounts = {
    teachers: dbService.getTeachers().length,
    students: dbService.getAllStudents().length,
    lessons: dbService.getAllLessons().length,
  };

  const handleConnect = () => run('connect', async () => {
    setStatus(unwrap(await bridge.connect()));
    setMessage({ type: 'success', text: 'Google Drive bağlandı.' });
  });

  const handleDisconnect = () => run('disconnect', async () => {
    setPending(null);
    setStatus(unwrap(await bridge.disconnect()));
    setMessage({ type: 'success', text: 'Google Drive bağlantısı kesildi. Drive\'daki kopyanız silinmedi.' });
  });

  const doUpload = async () => {
    const summary = await uploadToDrive();
    await refreshStatus();
    setMessage({ type: 'success', text: `Verileriniz Google Drive'a yüklendi (${summary.teachers} profil, ${summary.students} öğrenci, ${summary.lessons} ders).` });
  };

  // Başka bir bilgisayar daha yeni veri yüklediyse üzerine yazmadan önce sor
  const handleUpload = () => run('upload', async () => {
    const remote = await downloadFromDrive();
    if (remote && status && isRemoteNewerThanLocalSync(remote, status)) {
      setPending({ kind: 'overwrite', remote });
      return;
    }
    await doUpload();
  });

  const handleDownload = () => run('download', async () => {
    const remote = await downloadFromDrive();
    if (!remote) {
      setMessage({ type: 'error', text: 'Google Drive\'da henüz yüklenmiş veri yok. Önce diğer bilgisayardan "Drive\'a Yükle" düğmesini kullanın.' });
      return;
    }
    setPending({ kind: 'pull', remote });
  });

  const confirmPending = () => {
    if (!pending) return;
    const current = pending;
    setPending(null);
    if (current.kind === 'overwrite') {
      run('upload', doUpload);
      return;
    }
    run('apply', async () => {
      const result = await applyDriveData(current.remote, onRestore);
      await refreshStatus();
      setMessage({ type: 'success', text: `Google Drive'daki veriler alındı (${result.teachers} profil, ${result.students} öğrenci, ${result.lessons} ders). Önceki verilerinizin kopyası Yedekler klasörüne kaydedildi.` });
    });
  };

  const remoteLine = (r: DriveUploadSummary) =>
    `${r.device ? `"${r.device}" bilgisayarından ` : ''}${formatDateTime(r.uploadedAt)} tarihinde yüklendi: ${r.teachers} profil, ${r.students} öğrenci, ${r.lessons} ders.`;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
        <Cloud className="w-5 h-5 text-orange-500" />
        Google Drive ile Aktarım
      </h2>
      <p className="text-sm text-slate-500 mb-4">
        İsteğe bağlıdır. Verilerinizi Google Drive hesabınıza yükleyip aynı hesapla başka bir bilgisayardaki DersTakipCO'ya çekebilirsiniz.
        Uygulama yalnızca kendi oluşturduğu gizli bir dosyaya erişir; Drive'daki diğer dosyalarınızı göremez.
      </p>

      {message && (
        <div className={`mb-4 rounded-lg p-3 flex items-start gap-2 text-sm ${message.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {busy === 'status' && !status ? (
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Durum kontrol ediliyor...
        </div>
      ) : !status?.connected ? (
        busy === 'connect' ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-600 text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
              Tarayıcıda açılan sayfada Google hesabınızı seçip izin verin...
            </div>
            <button
              onClick={() => bridge.cancel()}
              className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors text-sm"
            >
              İptal
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnect}
            className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Cloud className="w-4 h-4" />
            Google Drive'a Bağlan
          </button>
        )
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-sm">
              <p className="font-medium text-slate-800">Bağlı hesap: {status.email || 'Google hesabı'}</p>
              <p className="text-slate-500">
                Son yükleme: {status.lastUpload ? formatDateTime(status.lastUpload.uploadedAt) : 'henüz yok'}
                {status.lastDownload && ` · Son çekme: ${formatDateTime(status.lastDownload.downloadedAt)}`}
              </p>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={!!busy}
              className="flex items-center gap-2 text-sm text-slate-600 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-white disabled:opacity-60"
            >
              <LogOut className="w-4 h-4" />
              Bağlantıyı Kes
            </button>
          </div>

          {!status.persistent && (
            <p className="text-sm text-amber-700">
              ⚠️ Bu bilgisayarda güvenli anahtar saklama kullanılamıyor; uygulama kapanınca yeniden bağlanmanız gerekecek.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={handleUpload}
              disabled={!!busy}
              className="flex items-center justify-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-60"
            >
              {busy === 'upload' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              Drive'a Yükle
            </button>
            <button
              onClick={handleDownload}
              disabled={!!busy}
              className="flex items-center justify-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-60"
            >
              {busy === 'download' || busy === 'apply' ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
              Drive'dan Verileri Çek
            </button>
          </div>

          {pending && (
            <div className={`p-4 rounded-lg border space-y-3 text-sm ${pending.kind === 'pull' ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
              {pending.kind === 'pull' ? (
                <>
                  <p className="font-medium text-blue-800">Google Drive'daki veriler bu bilgisayara alınsın mı?</p>
                  <p className="text-blue-700">Drive'daki veri {remoteLine(pending.remote)}</p>
                  <p className="text-blue-700">
                    Bu bilgisayardaki veriler ({localCounts.teachers} profil, {localCounts.students} öğrenci, {localCounts.lessons} ders) bunlarla değiştirilecek.
                    Değiştirmeden önce mevcut verilerin kopyası Yedekler klasörüne kaydedilir.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-amber-800">⚠️ Drive'da daha yeni veri var</p>
                  <p className="text-amber-700">
                    Drive'daki veri {remoteLine(pending.remote)} Bu bilgisayar o veriyi henüz çekmedi. Yüklerseniz Drive'daki kopya bu bilgisayardaki verilerle değiştirilecek.
                  </p>
                </>
              )}
              <div className="flex gap-2">
                <button
                  onClick={confirmPending}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  {pending.kind === 'pull' ? 'Evet, Verileri Çek' : 'Yine de Yükle'}
                </button>
                <button
                  onClick={() => setPending(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors"
                >
                  İptal
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
