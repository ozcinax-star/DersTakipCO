import React, { useEffect, useState } from 'react';
import { DownloadCloud, Loader2 } from 'lucide-react';
import { RestoreResult } from '../services/db';
import { driveBridge, unwrap, formatDateTime, downloadFromDrive, applyDriveData } from '../services/driveSync';

interface DrivePullOnboardingProps {
  onImported: (result: RestoreResult, remote: DriveUploadSummary) => void;
}

// Yeni bilgisayarda (henüz profil yokken) Google Drive'daki verileri almak için
export const DrivePullOnboarding: React.FC<DrivePullOnboardingProps> = ({ onImported }) => {
  const bridge = driveBridge();
  const [configured, setConfigured] = useState(false);
  const [step, setStep] = useState<'idle' | 'connecting' | 'loading' | 'confirm' | 'applying'>('idle');
  const [remote, setRemote] = useState<DriveDownload | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    bridge?.status().then(r => setConfigured(r.ok && r.result.configured)).catch(() => undefined);
  }, []);

  if (!bridge || !configured) return null;

  const start = async () => {
    setError('');
    try {
      const status = unwrap(await bridge.status());
      if (!status.connected) {
        setStep('connecting');
        unwrap(await bridge.connect());
      }
      setStep('loading');
      const data = await downloadFromDrive();
      if (!data) {
        setError('Bu Google hesabında yüklenmiş DersTakipCO verisi bulunamadı. Önce diğer bilgisayarda Ayarlar → Google Drive ile Aktarım → "Drive\'a Yükle" düğmesini kullanın.');
        setStep('idle');
        return;
      }
      setRemote(data);
      setStep('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.');
      setStep('idle');
    }
  };

  const confirm = async () => {
    if (!remote) return;
    setStep('applying');
    try {
      const result = await applyDriveData(remote);
      const { json: _json, ...summary } = remote;
      onImported(result, summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veriler alınamadı.');
      setStep('idle');
    }
  };

  return (
    <div className="space-y-3">
      {step === 'confirm' && remote ? (
        <div className="text-left p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm space-y-3">
          <p className="font-bold text-blue-800">Google Drive'da verileriniz bulundu</p>
          <p className="text-blue-700">
            {remote.device ? `"${remote.device}" bilgisayarından ` : ''}{formatDateTime(remote.uploadedAt)} tarihinde yüklendi:
            {' '}{remote.teachers} profil, {remote.students} öğrenci, {remote.lessons} ders.
          </p>
          <div className="flex gap-2">
            <button onClick={confirm} className="flex-1 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium">
              Verileri Al
            </button>
            <button onClick={() => { setStep('idle'); setRemote(null); }} className="flex-1 py-2 text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg font-medium">
              İptal
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={start}
          disabled={step !== 'idle'}
          className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg font-medium disabled:opacity-70"
        >
          {step === 'idle' ? <DownloadCloud size={16} /> : <Loader2 size={16} className="animate-spin" />}
          {step === 'connecting' ? 'Tarayıcıda Google ile giriş yapın...' : step === 'idle' ? "Google Drive'dan verilerimi çek" : 'Veriler alınıyor...'}
        </button>
      )}
      {step === 'connecting' && (
        <button onClick={() => bridge.cancel()} className="block mx-auto text-xs text-slate-400 hover:text-slate-600 underline">
          Vazgeç
        </button>
      )}
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
};
