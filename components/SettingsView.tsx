import React, { useState, useRef, useEffect } from 'react';
import { Teacher, Student, Lesson, Group, BackupData, EducationLevel, EducationLevelLabels } from '../types';
import { Settings, Download, Upload, Shield, Trash2, AlertTriangle, CheckCircle, Database, HardDrive, DollarSign, Save } from 'lucide-react';

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
  onRestoreBackup: (data: BackupData) => void;
  onClearAllData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  teacher,
  students,
  lessons,
  groups,
  onRestoreBackup,
  onClearAllData
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  // Yedek oluştur
  const createBackup = () => {
    const backupData: BackupData = {
      version: '2.0.0',
      createdAt: new Date().toISOString(),
      teacher,
      students,
      lessons,
      groups
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DersTakipCO_Yedek_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setRestoreStatus('success');
    setStatusMessage('Yedek başarıyla indirildi!');
    setTimeout(() => setRestoreStatus('idle'), 3000);
  };

  // Yedek geri yükle
  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as BackupData;
        
        // Veri doğrulama
        if (!data.version || !data.teacher || !data.students || !data.lessons) {
          throw new Error('Geçersiz yedek dosyası');
        }

        onRestoreBackup(data);
        setRestoreStatus('success');
        setStatusMessage(`Yedek başarıyla geri yüklendi! (${data.students.length} öğrenci, ${data.lessons.length} ders)`);
      } catch (error) {
        setRestoreStatus('error');
        setStatusMessage('Yedek dosyası okunamadı. Geçerli bir DersTakipCO yedek dosyası seçtiğinizden emin olun.');
      }
    };
    reader.readAsText(file);
    
    // Input'u sıfırla
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Tüm verileri sil
  const handleClearAll = () => {
    onClearAllData();
    setShowClearConfirm(false);
    setRestoreStatus('success');
    setStatusMessage('Tüm veriler silindi. Uygulama sıfırlandı.');
    setTimeout(() => setRestoreStatus('idle'), 3000);
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
              ðŸ›ï¸ Ãœniversite
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
                  Tüm verilerinizi JSON formatında indirin. Bilgisayarınızda güvenli bir yerde saklayın.
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
                  Daha önce oluşturduğunuz bir yedek dosyasını yükleyin. Mevcut veriler değiştirilecek.
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
              </ul>
            </div>
          </div>
        </div>
      </div>

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
                Bu işlem tüm öğrenci, ders ve grup bilgilerinizi kalıcı olarak siler. Bu işlem geri alınamaz!
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
                    âš ï¸ Emin misiniz? Bu iÅŸlem geri alÄ±namaz!
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
        <p className="text-slate-500 text-sm mt-1">Versiyon 2.0.0</p>
        <p className="text-slate-400 text-xs mt-2">
          Öğretmenler için çevrimdışı ders takip uygulaması
        </p>
        <div className="mt-4 pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-400">
            Tüm veriler yerel olarak tarayıcınızda saklanır.
          </p>
        </div>
      </div>
    </div>
  );
};
