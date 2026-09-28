import React, { useRef, useState, useMemo } from 'react';
import { Student, Lesson, LessonStatus } from '../types';
import { X, Download, Share2, Image, CheckCircle, BookOpen, Calendar, TrendingUp, RefreshCw } from 'lucide-react';

interface ParentCardProps {
  student: Student;
  lessons: Lesson[];
  teacherName: string;
  onClose: () => void;
}

export const ParentCard: React.FC<ParentCardProps> = ({
  student,
  lessons,
  teacherName,
  onClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // Öğrenci istatistikleri
  const studentLessons = lessons.filter(l => l.studentId === student.id);
  const completedLessons = studentLessons.filter(l => l.status === LessonStatus.COMPLETED);
  const cancelledLessons = studentLessons.filter(l => l.status === LessonStatus.CANCELLED);
  const scheduledLessons = studentLessons.filter(l => l.status === LessonStatus.SCHEDULED);
  
  const attendanceRate = (completedLessons.length + cancelledLessons.length) > 0 
    ? Math.round((completedLessons.length / (completedLessons.length + cancelledLessons.length)) * 100)
    : 0;

  // Konu listesi
  const topics = [...new Set(completedLessons.map(l => l.subject).filter(Boolean))];

  // Son ders
  const lastLesson = completedLessons.length > 0 
    ? completedLessons.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())[0]
    : null;

  // Yaklaşan ders
  const nextLesson = scheduledLessons
    .filter(l => new Date(l.start) > new Date())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0];

  // Kart oluştur
  const generateCard = () => {
    setGenerating(true);
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas boyutu (mobil uyumlu)
    const width = 600;
    const height = 800;
    canvas.width = width;
    canvas.height = height;

    // Arka plan gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#8B5CF6');
    gradient.addColorStop(1, '#6366F1');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Beyaz kart alanı
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, 20, 20, width - 40, height - 40, 20);
    ctx.fill();

    // Header gradient
    const headerGradient = ctx.createLinearGradient(20, 20, width - 20, 160);
    headerGradient.addColorStop(0, '#8B5CF6');
    headerGradient.addColorStop(1, '#A855F7');
    ctx.fillStyle = headerGradient;
    roundRectTop(ctx, 20, 20, width - 40, 140, 20);
    ctx.fill();

    // Öğrenci avatarı
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.arc(width / 2, 90, 45, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(student.name.charAt(0).toUpperCase(), width / 2, 102);

    // Öğrenci adı
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(student.name, width / 2, 175);

    // Sınıf seviyesi
    if (student.gradeLevel) {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = '16px Arial';
      ctx.fillText(student.gradeLevel, width / 2, 200);
    }

    // Öğretmen bilgisi
    ctx.fillStyle = '#64748B';
    ctx.font = '14px Arial';
    ctx.fillText(`Öğretmen: ${teacherName}`, width / 2, 240);

    // İstatistik kartları
    const statY = 270;
    const statWidth = 160;
    const statHeight = 80;
    const gap = 20;
    const startX = (width - (statWidth * 3 + gap * 2)) / 2;

    // Tamamlanan
    drawStatCard(ctx, startX, statY, statWidth, statHeight, 
      completedLessons.length.toString(), 'Tamamlanan', '#10B981', '#ECFDF5');

    // İptal
    drawStatCard(ctx, startX + statWidth + gap, statY, statWidth, statHeight,
      cancelledLessons.length.toString(), 'İptal', '#EF4444', '#FEF2F2');

    // Katılım
    drawStatCard(ctx, startX + (statWidth + gap) * 2, statY, statWidth, statHeight,
      `%${attendanceRate}`, 'Katılım', '#8B5CF6', '#F5F3FF');

    // Konular başlığı
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('📚 İşlenen Konular', 50, 400);

    // Konular listesi
    ctx.fillStyle = '#64748B';
    ctx.font = '14px Arial';
    const topicsText = topics.length > 0 
      ? topics.slice(0, 4).join(', ') + (topics.length > 4 ? ` +${topics.length - 4} daha` : '')
      : 'Henüz konu eklenmemiş';
    ctx.fillText(topicsText, 50, 430);

    // Son ders
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('📅 Son Ders', 50, 480);

    ctx.fillStyle = '#64748B';
    ctx.font = '14px Arial';
    if (lastLesson) {
      const lastDate = new Date(lastLesson.start).toLocaleDateString('tr-TR', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
      ctx.fillText(`${lastDate} - ${lastLesson.subject || 'Belirtilmemiş'}`, 50, 510);
    } else {
      ctx.fillText('Henüz ders yapılmamış', 50, 510);
    }

    // Yaklaşan ders
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('⏰ Yaklaşan Ders', 50, 560);

    ctx.fillStyle = '#64748B';
    ctx.font = '14px Arial';
    if (nextLesson) {
      const nextDate = new Date(nextLesson.start).toLocaleDateString('tr-TR', {
        weekday: 'long', day: 'numeric', month: 'long'
      });
      const nextTime = new Date(nextLesson.start).toLocaleTimeString('tr-TR', {
        hour: '2-digit', minute: '2-digit'
      });
      ctx.fillText(`${nextDate} - ${nextTime}`, 50, 590);
    } else {
      ctx.fillText('Planlanan ders yok', 50, 590);
    }

    // Bilgi notu
    ctx.fillStyle = '#F59E0B';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⚠️ Bu kart sadece bilgi amaçlıdır', width / 2, 660);

    // Alt bilgi
    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px Arial';
    const now = new Date().toLocaleDateString('tr-TR', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    ctx.fillText(`Oluşturulma: ${now}`, width / 2, 700);

    // Logo/marka
    ctx.fillStyle = '#8B5CF6';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('DersTakipCO', width / 2, 740);

    // Görsel oluştur
    const imageUrl = canvas.toDataURL('image/png');
    setGeneratedImage(imageUrl);
    setGenerating(false);
  };

  // Yardımcı fonksiyonlar
  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const roundRectTop = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const drawStatCard = (
    ctx: CanvasRenderingContext2D, 
    x: number, y: number, w: number, h: number,
    value: string, label: string, color: string, bgColor: string
  ) => {
    // Arka plan
    ctx.fillStyle = bgColor;
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();

    // Değer
    ctx.fillStyle = color;
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(value, x + w / 2, y + 40);

    // Etiket
    ctx.fillStyle = '#64748B';
    ctx.font = '12px Arial';
    ctx.fillText(label, x + w / 2, y + 65);
  };

  // İndir
  const downloadCard = () => {
    if (!generatedImage) return;
    
    const link = document.createElement('a');
    link.download = `${student.name}_Veli_Karti.png`;
    link.href = generatedImage;
    link.click();
  };

  // Paylaş
  const shareCard = async () => {
    if (!generatedImage) return;

    // Canvas'tan blob oluştur
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      if (navigator.share && navigator.canShare) {
        const file = new File([blob], `${student.name}_Veli_Karti.png`, { type: 'image/png' });
        
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `${student.name} - Ders Özeti`,
              text: `${student.name} için ders takip kartı`
            });
            return;
          } catch (err) {
            console.log('Paylaşım iptal edildi');
          }
        }
      }
      
      // Fallback: İndir
      downloadCard();
    }, 'image/png');
  };

  // İlk yüklemede kartı oluştur
  React.useEffect(() => {
    generateCard();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Veli Kartı</h2>
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
          {/* Canvas (gizli) */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Önizleme */}
          {generatedImage ? (
            <div className="flex flex-col items-center">
              <div className="border-2 border-slate-200 rounded-xl overflow-hidden shadow-lg">
                <img 
                  src={generatedImage} 
                  alt="Veli Kartı" 
                  className="w-full max-w-[300px]"
                />
              </div>
              <p className="text-sm text-slate-500 mt-3 text-center">
                Bu kartı indirip veliye gönderebilirsiniz
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center py-8">
              <RefreshCw className="w-8 h-8 text-purple-500 animate-spin mb-2" />
              <p className="text-slate-500">Kart oluşturuluyor...</p>
            </div>
          )}

          {/* Butonlar */}
          <div className="flex gap-3">
            <button
              onClick={downloadCard}
              disabled={!generatedImage}
              className="flex-1 flex items-center justify-center gap-2 bg-purple-500 text-white py-3 rounded-lg hover:bg-purple-600 transition-colors font-medium disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
              İndir
            </button>
            <button
              onClick={shareCard}
              disabled={!generatedImage}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white py-3 rounded-lg hover:bg-emerald-600 transition-colors font-medium disabled:opacity-50"
            >
              <Share2 className="w-5 h-5" />
              Paylaş
            </button>
          </div>

          {/* Yeniden oluştur */}
          <button
            onClick={generateCard}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-2 rounded-lg hover:bg-slate-200 transition-colors font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            Yeniden Oluştur
          </button>

          {/* Bilgi */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-xs text-blue-700">
              💡 <strong>İpucu:</strong> Bu kartı WhatsApp, Telegram veya SMS ile veliye gönderebilirsiniz. 
              Veli internet bağlantısı olmadan bile görebilir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
