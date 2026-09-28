import React, { useState, useRef, useEffect } from 'react';
import { Teacher, Student, Lesson, Group, BackupData, FullBackupData, EducationLevel } from '../types';
import { dbService, MigrationInfo, RestoreResult } from '../services/db';
import { DriveSyncCard } from './DriveSyncCard';
import { Settings, Download, Upload, Shield, Trash2, AlertTriangle, CheckCircle, Database, HardDrive, DollarSign, Save, History, RefreshCw } from 'lucide-react';

// Varsayılan ücret ayarları için storage key
const PRICING_STORAGE_KEY = 'derstakipco_default_pricing';

export interface DefaultPricing {
  [EducationLevel.ELEMENTARY]: number;
  [EducationLevel.MIDDLE_SCHOOL]: number;
  [EducationLevel.HIGH_SCHOOL]: number;
  [EducationLevel.UNIVERSITY]: number;
  [EducationLevel.ADULT]: number;
  defaultRate: number; // Genel varsayılan
}

const DEFAULT_PRICING: DefaultPricing = {
  [EducationLevel.ELEMENTARY]: 300,
  [EducationLevel.MIDDLE_SCHOOL]: 400,
  [EducationLevel.HIGH_SCHOOL]: 500,
  [EducationLevel.UNIVERSITY]: 600,
  [EducationLevel.ADULT]: 500,
  defaultRate: 500,
};

// Global erişim için export
export const getDefaultPricing = (): DefaultPricing => {
  const stored = localStorage.getItem(PRICING_STORAGE_KEY);
  if (stored) {
    return { ...DEFAULT_PRICING, ...JSON.parse(stored) };
  }
  return DEFAULT_PRICING;
};

export const saveDefaultPricing = (pricing: DefaultPricing): void => {
  localStorage.setItem(PRICING_STORAGE_KEY, JSON.stringify(pricing));
};

interface SettingsViewProps {
  teacher: Teacher;
  students: Student[];
  lessons: Lesson[];
  groups: Group[];
  onRestoreBackup: (data: BackupData | FullBackupData) => RestoreResult;
  onClearAllData: () => void;
  onImportFromOldApp?: () => Promise<MigrationInfo | null>;
}

// Yerel tarihe göre YYYY-MM-DD (toISOString UTC'ye çevirip gün kaydırabilir)
const localDateStamp = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const SettingsView: React.FC<SettingsViewProps> = ({
  teacher,
  students,
  lessons,
  groups,
  onRestoreBackup,
  onClearAllData,
  onImportFromOldApp
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingRestore, setPendingRestore] = useState<{ data: BackupData | FullBackupData; summary: string } | null>(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [appVersion, setAppVersion] = useState('');
  const migrationInfo = dbService.getMigrationInfo();

  useEffect(() => {
    window.derstakip?.getVersion().then(setAppVersion).catch(() => undefined);
  }, []);

  const showStatus = (status: 'success' | 'error', message: string) => {
    setRestoreStatus(status);
    setStatusMessage(message);
    if (status === 'success') setTimeout(() => setRestoreStatus('idle'), 5000);
  };
  
  // Ücret ayarları state
  const [pricing, setPricing] = useState<DefaultPricing>(getDefaultPricing());
  const [pricingSaved, setPricingSaved] = useState(false);

  // Ücret ayarlarını kaydet
  const handleSavePricing = () => {
    saveDefaultPricing(pricing);
    setPricingSaved(true);
    setRestoreStatus('success');
    setStatusMessage('Varsayılan ücret ayarları kaydedildi!');
    setTimeout(() => {
      setRestoreStatus('idle');
      setPricingSaved(false);
    }, 3000);
  };

  // Yedek oluştur: tüm profilleri içeren tam yedek
  const createBackup = async () => {
    const json = JSON.stringify(dbService.exportAll(), null, 2);
    const fileName = `DersTakipCO_Yedek_${localDateStamp()}.json`;

    try {
      if (window.derstakip?.saveBackup) {
        const savedPath = await window.derstakip.saveBackup(json, fileName);
        if (savedPath) showStatus('success', `Yedek kaydedildi: ${savedPath}`);
        return;
      }

      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showStatus('success', 'Yedek başarıyla indirildi!');
    } catch {
      showStatus('error', 'Yedek kaydedilemedi. Lütfen tekrar deneyin.');
    }
  };

  // Yedek dosyasını oku ve onaya sun (yeni tam yedek ve eski tek profilli yedek desteklenir)
  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as BackupData | FullBackupData;
        let summary: string;
        if ('teachers' in data && Array.isArray(data.teachers) && Array.isArray(data.students) && Array.isArray(data.lessons)) {
          summary = `${data.teachers.length} profil, ${data.students.length} öğrenci, ${data.lessons.length} ders. Bu bilgisayardaki TÜM profillerin verileri yedektekilerle değiştirilecek.`;
        } else if ('teacher' in data && data.teacher && Array.isArray(data.students) && Array.isArray(data.lessons)) {
          summary = `"${data.teacher.name}" profili: ${data.students.length} öğrenci, ${data.lessons.length} ders. Bu profilin mevcut verileri yedektekilerle değiştirilecek; diğer profillere dokunulmaz.`;
        } else {
          throw new Error('Geçersiz yedek dosyası');
        }
        setPendingRestore({ data, summary });
        setRestoreStatus('idle');
      } catch {
        showStatus('error', 'Yedek dosyası okunamadı. Geçerli bir DersTakipCO yedek dosyası seçtiğinizden emin olun.');
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const confirmRestore = () => {
    if (!pendingRestore) return;
    try {
      const result = onRestoreBackup(pendingRestore.data);
      showStatus('success', `Yedek başarıyla geri yüklendi! (${result.teachers} profil, ${result.students} öğrenci, ${result.lessons} ders)`);
    } catch {
      showStatus('error', 'Yedek geri yüklenemedi. Dosya bozuk olabilir.');
    } finally {
      setPendingRestore(null);
    }
  };

  // Eski uygulamadan verileri yeniden aktar
  const handleImportOld = async () => {
    if (!onImportFromOldApp) return;
    setIsImporting(true);
    try {
      const info = await onImportFromOldApp();
      if (!info) showStatus('error', 'Bu bilgisayarda eski DersTakipCO verisi bulunamadı.');
    } catch {
      showStatus('error', 'Eski veriler okunurken bir hata oluştu.');
    } finally {
      setIsImporting(false);
      setShowImportConfirm(false);
    }
  };

  // Tüm verileri sil
  const handleClearAll = () => {
    onClearAllData();
    setShowClearConfirm(false);
    showStatus('success', 'Bu profile ait tüm öğrenci, ders ve grup verileri silindi.');
  };

  // İstatistikler
  const dataStats = {
    students: students.length,
    lessons: lessons.length,
    groups: groups.length,
    totalSize: new Blob([JSON.stringify({ teacher, students, lessons, groups })]).size
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Settings className="w-7 h-7 text-orange-500" />
          Ayarlar
        </h1>
        <p className="text-slate-500 mt-1">Ücret ayarları, yedekleme ve veri yönetimi</p>
      </div>

      {/* Status Message */}
      {restoreStatus !== 'idle' && (
        <div className={`rounded-xl p-4 flex items-center gap-3 ${
          restoreStatus === 'success' 
            ? 'bg-emerald-50 border border-emerald-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          {restoreStatus === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-500" />
          )}
          <p className={restoreStatus === 'success' ? 'text-emerald-700' : 'text-red-700'}>
            {statusMessage}
          </p>
        </div>
      )}

      {/* Pricing Settings - NEW */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-orange-500" />
            Varsayılan Ders Ücretleri
          </h2>
          <button
            onClick={handleSavePricing}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              pricingSaved 
                ? 'bg-emerald-500 text-white' 
                : 'bg-orange-500 text-white hover:bg-orange-600'
            }`}
          >
            {pricingSaved ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Kaydedildi
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Kaydet
              </>
            )}
          </button>
        </div>
        
        <p className="text-sm text-slate-500 mb-4">
          Yeni öğrenci eklerken ve ders oluştururken bu ücretler varsayılan olarak kullanılır. Her derste özel ücret de belirleyebilirsiniz.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Genel Varsayılan */}
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
            <label className="block text-sm font-medium text-orange-800 mb-2">
              🎯 Genel Varsayılan
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₺</span>
              <input
                type="number"
                min="0"
                step="50"
                value={pricing.defaultRate}
                onChange={(e) => setPricing({ ...pricing, defaultRate: Number(e.target.value) })}
                className="w-full pl-8 pr-16 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">/saat</span>
            </div>
          </div>

          {/* İlkokul */}
          <div className="bg-pink-50 rounded-xl p-4 border border-pink-200">
            <label className="block text-sm font-medium text-pink-800 mb-2">
              🎒 İlkokul (1-4. Sınıf)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₺</span>
              <input
                type="number"
                min="0"
                step="50"
                value={pricing[EducationLevel.ELEMENTARY]}
                onChange={(e) => setPricing({ ...pricing, [EducationLevel.ELEMENTARY]: Number(e.target.value) })}
                className="w-full pl-8 pr-16 py-2 border border-pink-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">/saat</span>
            </div>
          </div>

          {/* Ortaokul */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <label className="block text-sm font-medium text-blue-800 mb-2">
              📚 Ortaokul (5-8. Sınıf)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₺</span>
              <input
                type="number"
                min="0"
                step="50"
                value={pricing[EducationLevel.MIDDLE_SCHOOL]}
                onChange={(e) => setPricing({ ...pricing, [EducationLevel.MIDDLE_SCHOOL]: Number(e.target.value) })}
                className="w-full pl-8 pr-16 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">/saat</span>
            </div>
          </div>

          {/* Lise */}
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <label className="block text-sm font-medium text-purple-800 mb-2">
              🎓 Lise (9-12. Sınıf)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₺</span>
              <input
                type="number"
                min="0"
                step="50"
                value={pricing[EducationLevel.HIGH_SCHOOL]}
                onChange={(e) => setPricing({ ...pricing, [EducationLevel.HIGH_SCHOOL]: Number(e.target.value) })}
                className="w-full pl-8 pr-16 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">/saat</span>
            </div>
          </div>

          {/* Üniversite */}
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
            <label className="block text-sm font-medium text-emerald-800 mb-2">
              🏛️ Üniversite
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₺</span>
              <input
                type="number"
                min="0"
                step="50"
                value={pricing[EducationLevel.UNIVERSITY]}
                onChange={(e) => setPricing({ ...pricing, [EducationLevel.UNIVERSITY]: Number(e.target.value) })}
                className="w-full pl-8 pr-16 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">/saat</span>
            </div>
          </div>

          {/* Yetişkin */}
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <label className="block text-sm font-medium text-amber-800 mb-2">
              💼 Yetişkin Eğitimi
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₺</span>
              <input
                type="number"
                min="0"
                step="50"
                value={pricing[EducationLevel.ADULT]}
                onChange={(e) => setPricing({ ...pricing, [EducationLevel.ADULT]: Number(e.target.value) })}
                className="w-full pl-8 pr-16 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">/saat</span>
            </div>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700">
            💡 <strong>İpucu:</strong> Ders oluştururken "Özel Ücret" seçeneğini işaretleyerek bu varsayılanları geçersiz kılabilirsiniz.
          </p>
        </div>
      </div>

      {/* Data Overview */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-orange-500" />
          Veri Özeti
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{dataStats.students}</p>
            <p className="text-sm text-slate-600">Öğrenci</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-emerald-600">{dataStats.lessons}</p>
            <p className="text-sm text-slate-600">Ders</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-purple-600">{dataStats.groups}</p>
            <p className="text-sm text-slate-600">Grup</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-orange-600">{formatBytes(dataStats.totalSize)}</p>
            <p className="text-sm text-slate-600">Toplam Boyut</p>
          </div>
        </div>
      </div>

      {/* Backup & Restore */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-orange-500" />
          Yedekleme & Geri Yükleme
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Create Backup */}
          <div className="border border-slate-200 rounded-xl p-5 hover:border-orange-300 transition-colors">
            <div className="flex items-start gap-4">
              <div className="bg-emerald-100 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                <Download className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800">Yedek Oluştur</h3>
                <p className="text-sm text-slate-500 mt-1 mb-4">
                  Tüm profillerin verilerini tek bir dosyaya kaydedin. Bilgisayarınızda güvenli bir yerde saklayın.
                </p>
                <button
                  onClick={createBackup}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Yedek İndir
                </button>
              </div>
            </div>
          </div>

          {/* Restore Backup */}
          <div className="border border-slate-200 rounded-xl p-5 hover:border-orange-300 transition-colors">
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800">Yedek Geri Yükle</h3>
                <p className="text-sm text-slate-500 mt-1 mb-4">
                  Daha önce aldığınız bir yedek dosyasını yükleyin. Eski sürümün yedekleri de desteklenir.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleRestore}
                  className="hidden"
                  id="backup-file"
                />
                <label
                  htmlFor="backup-file"
                  className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  Yedek Yükle
                </label>
              </div>
            </div>
          </div>
        </div>

        {pendingRestore && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
            <p className="text-blue-800 font-medium">Yedek geri yüklensin mi?</p>
            <p className="text-sm text-blue-700">{pendingRestore.summary}</p>
            <div className="flex gap-2">
              <button
                onClick={confirmRestore}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Evet, Geri Yükle
              </button>
              <button
                onClick={() => setPendingRestore(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors"
              >
                İptal
              </button>
            </div>
          </div>
        )}

        {/* Backup Tips */}
        <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-2">
            <Shield className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800">Veri Güvenliği İpuçları</h4>
              <ul className="text-sm text-amber-700 mt-1 space-y-1">
                <li>• Düzenli olarak yedek alın (haftada en az 1 kez)</li>
                <li>• Yedek dosyalarını farklı konumlarda saklayın (bulut, harici disk)</li>
                <li>• Yedek dosyası şifresiz JSON formatındadır, güvenli yerde saklayın</li>
                <li>• Geri yükleme mevcut tüm verilerin üzerine yazar</li>
                <li>• Uygulama her değişiklikten sonra Belgeler klasöründeki "DersTakipCO Yedekler" klasörüne otomatik yedek alır (son 30 gün)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Google Drive ile bilgisayarlar arası aktarım (isteğe bağlı) */}
      <DriveSyncCard onRestore={onRestoreBackup} />

      {/* Eski uygulamadan aktarım */}
      {onImportFromOldApp && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
            <History className="w-5 h-5 text-orange-500" />
            Eski DersTakipCO Verileri
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            {migrationInfo && migrationInfo.source !== 'yok'
              ? `Verileriniz ${new Date(migrationInfo.date).toLocaleString('tr-TR')} tarihinde önceki DersTakipCO uygulamasından aktarıldı (${migrationInfo.counts.students} öğrenci, ${migrationInfo.counts.lessons} ders).`
              : "Microsoft Store'dan kurulan önceki DersTakipCO uygulamasındaki verileri bu uygulamaya aktarabilirsiniz."}
          </p>
          {!showImportConfirm ? (
            <button
              onClick={() => setShowImportConfirm(true)}
              className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Eski Uygulamadan Tekrar Aktar
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-amber-700 text-sm font-medium">
                ⚠️ Bu işlem bu uygulamadaki tüm profillerin verilerini eski uygulamadaki verilerle değiştirir. Devam etmeden önce yedek almanız önerilir.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleImportOld}
                  disabled={isImporting}
                  className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-60"
                >
                  <RefreshCw className={`w-4 h-4 ${isImporting ? 'animate-spin' : ''}`} />
                  {isImporting ? 'Aktarılıyor...' : 'Evet, Aktar'}
                </button>
                <button
                  onClick={() => setShowImportConfirm(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors"
                >
                  İptal
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Danger Zone */}
      <div className="bg-white rounded-xl border border-red-200 p-6">
        <h2 className="font-bold text-red-600 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Tehlikeli Bölge
        </h2>
        
        <div className="border border-red-200 rounded-xl p-5 bg-red-50">
          <div className="flex items-start gap-4">
            <div className="bg-red-100 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-800">Tüm Verileri Sil</h3>
              <p className="text-sm text-red-600 mt-1 mb-4">
                Bu işlem bu profile ait tüm öğrenci, ders ve grup bilgilerini kalıcı olarak siler. Bu işlem geri alınamaz!
              </p>
              
              {!showClearConfirm ? (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Tüm Verileri Sil
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-red-700 font-medium">
                    ⚠️ Emin misiniz? Bu işlem geri alınamaz!
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleClearAll}
                      className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Evet, Tüm Verileri Sil
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* App Info */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 text-center">
        <h2 className="font-bold text-slate-800">DersTakipCO</h2>
        {appVersion && <p className="text-slate-500 text-sm mt-1">Versiyon {appVersion}</p>}
        <p className="text-slate-400 text-xs mt-2">
          Öğretmenler için çevrimdışı ders takip uygulaması
        </p>
        <div className="mt-4 pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-400">
            Tüm veriler yalnızca bu bilgisayarda saklanır, internete gönderilmez.
          </p>
        </div>
      </div>
    </div>
  );
};
