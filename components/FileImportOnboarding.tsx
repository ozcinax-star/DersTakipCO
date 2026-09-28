import React, { useRef, useState } from 'react';
import { FileUp } from 'lucide-react';
import { dbService, RestoreResult } from '../services/db';
import { readBackupFile, describeBackup, snapshotBeforeRestore, ParsedBackup } from '../services/backupFile';

interface FileImportOnboardingProps {
  onImported: (result: RestoreResult, summary: string) => void;
}

// Yeni bilgisayarda (henüz profil yokken) başka bilgisayardan getirilen yedek dosyasını yüklemek için
export const FileImportOnboarding: React.FC<FileImportOnboardingProps> = ({ onImported }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<ParsedBackup | null>(null);
  const [error, setError] = useState('');

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    setError('');
    try {
      setPending(await readBackupFile(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dosya okunamadı.');
    }
  };

  const confirm = async () => {
    if (!pending) return;
    const current = pending;
    setPending(null);
    try {
      await snapshotBeforeRestore('dosya-oncesi');
      const result = dbService.restoreBackup(current.data);
      dbService.repairOrphans();
      onImported(result, describeBackup(current));
    } catch {
      setError('Veriler yüklenemedi. Dosya bozuk olabilir.');
    }
  };

  return (
    <div className="space-y-3">
      <input ref={inputRef} type="file" accept=".json,application/json" onChange={handleFile} className="hidden" id="onboarding-backup-file" />
      {pending ? (
        <div className="text-left p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm space-y-3">
          <p className="font-bold text-emerald-800">Yedek dosyası okundu</p>
          <p className="text-emerald-700">{describeBackup(pending)}</p>
          <div className="flex gap-2">
            <button onClick={confirm} className="flex-1 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium">
              Verileri Yükle
            </button>
            <button onClick={() => setPending(null)} className="flex-1 py-2 text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg font-medium">
              İptal
            </button>
          </div>
        </div>
      ) : (
        <label
          htmlFor="onboarding-backup-file"
          className="inline-flex items-center gap-2 px-4 py-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg font-medium cursor-pointer"
        >
          <FileUp size={16} />
          Yedek dosyasından yükle
        </label>
      )}
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
};
