import React, { useRef, useState, useEffect } from 'react';
import { Student, Lesson, LessonStatus } from '../types';
import { X, Download, Eye, RefreshCw, Smartphone, AlertCircle, Image } from 'lucide-react';

interface ParentQRProps {
  student: Student;
  lessons: Lesson[];
  teacherName: string;
  onClose: () => void;
}

// Basit QR kod oluşturucu (qrcode kütüphanesi yerine API kullanır)
export const ParentQR: React.FC<ParentQRProps> = ({
  student,
  lessons,
  teacherName,
  onClose
}) => {
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Öğrenci istatistikleri
  const studentLessons = lessons.filter(l => l.studentId === student.id);
  const completedLessons = studentLessons.filter(l => l.status === LessonStatus.COMPLETED);
  const cancelledLessons = studentLessons.filter(l => l.status === LessonStatus.CANCELLED);
  const scheduledLessons = studentLessons.filter(l => l.status === LessonStatus.SCHEDULED);
  
  const attendanceRate = (completedLessons.length + cancelledLessons.length) > 0 
    ? Math.round((completedLessons.length / (completedLessons.length + cancelledLessons.length)) * 100)
    : 0;

  // Konu listesi (kısa)
  const topics = [...new Set(completedLessons.map(l => l.subject).filter(Boolean))];
  const topicsShort = topics.slice(0, 2).join(', ') || '-';

  // Son ders tarihi
  const lastLesson = completedLessons.length > 0 
    ? completedLessons.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())[0]
    : null;
  const lastDate = lastLesson 
    ? new Date(lastLesson.start).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
    : '-';

  // Yaklaşan ders
  const nextLesson = scheduledLessons
    .filter(l => new Date(l.start) > new Date())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0];
  const nextInfo = nextLesson
    ? new Date(nextLesson.start).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) + ' ' +
      new Date(nextLesson.start).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    : '-';

  // Ultra kompakt HTML (QR limit: ~2900 karakter)
  const generateCompactHTML = () => {
    // Öğrenci adı kısalt (max 12 karakter)
    const shortName = student.name.length > 12 ? student.name.substring(0, 12) : student.name;
    const initial = student.name.charAt(0).toUpperCase();
    
    // Süper minimal HTML (~1800 karakter)
    return `<!DOCTYPE html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0}body{font-family:system-ui;background:#7C3AED;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:10px}.c{background:#fff;border-radius:16px;width:100%;max-width:340px;text-align:center;padding:20px}.a{width:60px;height:60px;background:#7C3AED;border-radius:50%;margin:0 auto 10px;line-height:60px;color:#fff;font-size:28px;font-weight:700}h1{font-size:20px;color:#1F2937}p{color:#6B7280;font-size:13px;margin:4px 0 16px}.g{display:flex;justify-content:space-around;background:#F5F3FF;border-radius:12px;padding:14px;margin-bottom:16px}.g div b{display:block;font-size:24px;color:#7C3AED}.g div span{font-size:10px;color:#6B7280}.i{text-align:left;background:#F8FAFC;border-radius:10px;padding:12px;font-size:13px;color:#374151}.i div{margin-bottom:8px}.i div:last-child{margin:0}.i span{color:#9CA3AF;font-size:11px}.f{margin-top:16px;color:#7C3AED;font-size:12px;font-weight:600}</style></head><body><div class=c><div class=a>${initial}</div><h1>${shortName}</h1><p>${teacherName}</p><div class=g><div><b>${completedLessons.length}</b><span>Ders</span></div><div><b>${cancelledLessons.length}</b><span>İptal</span></div><div><b>%${attendanceRate}</b><span>Katılım</span></div></div><div class=i><div><span>Son:</span> ${lastDate}</div><div><span>Sıradaki:</span> ${nextInfo}</div></div><div class=f>DersTakipCO</div></div></body></html>`;
  };

  // QR kod oluştur
  const generateQR = async () => {
    setLoading(true);
    setError(null);

    try {
      const html = generateCompactHTML();
      const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
      
      console.log('Data URL uzunluğu:', dataUrl.length, 'karakter');

      // QR kod boyut kontrolü (max ~2900 karakter güvenli)
      if (dataUrl.length > 2900) {
        setError(`Veri çok büyük (${dataUrl.length} karakter). QR kod oluşturulamıyor.`);
        setLoading(false);
        return;
      }

      // QR Server API kullan (ücretsiz, güvenilir)
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(dataUrl)}`;
      
      // Test et
      const response = await fetch(qrApiUrl);
      if (response.ok) {
        setQrImageUrl(qrApiUrl);
      } else {
        throw new Error('QR API yanıt vermedi');
      }
    } catch (err) {
      console.error('QR oluşturma hatası:', err);
      setError('QR kod oluşturulamadı. İnternet bağlantınızı kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateQR();
  }, []);

  // QR indir
  const downloadQR = async () => {
    if (!qrImageUrl) return;
    
    try {
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.download = `${student.name}_Veli_QR.png`;
      link.href = url;
      link.click();
      
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('İndirme hatası:', err);
    }
  };

  // Önizleme aç
  const openPreview = () => {
    const html = generateCompactHTML();
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Veli QR Kodu</h2>
              <p className="text-purple-200 text-sm">{student.name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* QR Kod Alanı */}
          <div className="flex flex-col items-center">
            <div className="bg-white p-4 rounded-xl border-2 border-slate-200 shadow-lg">
              {loading ? (
                <div className="w-[250px] h-[250px] flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
                </div>
              ) : error ? (
                <div className="w-[250px] h-[250px] flex flex-col items-center justify-center text-center p-4">
                  <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              ) : qrImageUrl ? (
                <img 
                  src={qrImageUrl} 
                  alt="Veli QR Kodu" 
                  className="w-[250px] h-[250px]"
                />
              ) : null}
            </div>
            
            {!error && !loading && (
              <p className="text-sm text-slate-500 mt-3 text-center">
                📱 Veli bu QR'ı okutunca bilgi kartı açılacak
              </p>
            )}
          </div>

          {/* Nasıl Çalışır */}
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
            <h4 className="font-medium text-purple-800 mb-2 flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Nasıl Çalışır?
            </h4>
            <ol className="text-sm text-purple-700 space-y-1">
              <li>1. QR kodu veliye gösterin veya gönderin</li>
              <li>2. Veli telefon kamerasıyla okutunca</li>
              <li>3. Tarayıcıda güzel tasarımlı kart açılır ✨</li>
            </ol>
          </div>

          {/* Butonlar */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={downloadQR}
              disabled={!qrImageUrl || loading}
              className="flex items-center justify-center gap-2 bg-purple-500 text-white py-3 rounded-lg hover:bg-purple-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              QR İndir
            </button>
            <button
              onClick={openPreview}
              className="flex items-center justify-center gap-2 bg-emerald-500 text-white py-3 rounded-lg hover:bg-emerald-600 transition-colors font-medium"
            >
              <Eye className="w-5 h-5" />
              Önizle
            </button>
          </div>

          {/* Yeniden oluştur */}
          <button
            onClick={generateQR}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-600 py-2 rounded-lg hover:bg-slate-200 transition-colors text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Yeniden Oluştur
          </button>

          {/* İstatistik Özeti */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h4 className="font-medium text-slate-700 mb-3">QR'da Görünecek Bilgiler</h4>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="bg-white rounded-lg p-2 border border-slate-100">
                <p className="text-lg font-bold text-purple-600">{completedLessons.length}</p>
                <p className="text-xs text-slate-500">Ders</p>
              </div>
              <div className="bg-white rounded-lg p-2 border border-slate-100">
                <p className="text-lg font-bold text-orange-500">{cancelledLessons.length}</p>
                <p className="text-xs text-slate-500">İptal</p>
              </div>
              <div className="bg-white rounded-lg p-2 border border-slate-100">
                <p className="text-lg font-bold text-emerald-600">%{attendanceRate}</p>
                <p className="text-xs text-slate-500">Katılım</p>
              </div>
            </div>
          </div>

          {/* İpucu */}
          <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
            <p className="text-xs text-amber-700">
              💡 <strong>İpucu:</strong> QR kod, içinde tam bir web sayfası barındırır. Veli internet olmadan bile görebilir (sayfa tarayıcıda cache'lenir).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
