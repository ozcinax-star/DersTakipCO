import React, { useState, useMemo } from 'react';
import { Student, Lesson, LessonStatus } from '../types';
import { X, Calendar, Clock, DollarSign, TrendingUp, BookOpen, FileText, Award, AlertCircle, CheckCircle, XCircle, Image } from 'lucide-react';

interface StudentCardProps {
  student: Student;
  lessons: Lesson[];
  onClose: () => void;
  onShowQR: () => void;
}

export const StudentCard: React.FC<StudentCardProps> = ({
  student,
  lessons,
  onClose,
  onShowQR
}) => {
  // Öğrenciye ait dersler
  const studentLessons = useMemo(() => 
    lessons.filter(l => l.studentId === student.id),
    [lessons, student.id]
  );

  // Tamamlanan dersler
  const completedLessons = useMemo(() => 
    studentLessons.filter(l => l.status === LessonStatus.COMPLETED),
    [studentLessons]
  );

  // İptal edilen dersler
  const cancelledLessons = useMemo(() => 
    studentLessons.filter(l => l.status === LessonStatus.CANCELLED),
    [studentLessons]
  );

  // Planlanan dersler
  const scheduledLessons = useMemo(() => 
    studentLessons.filter(l => l.status === LessonStatus.SCHEDULED),
    [studentLessons]
  );

  // Son ders tarihi
  const lastLesson = useMemo(() => {
    const completed = [...completedLessons].sort((a, b) => 
      new Date(b.start).getTime() - new Date(a.start).getTime()
    );
    return completed[0];
  }, [completedLessons]);

  // Toplam kazanç
  const totalEarnings = useMemo(() => 
    completedLessons.reduce((sum, l) => sum + l.price, 0),
    [completedLessons]
  );

  // Ödenen ve bekleyen
  const paidAmount = useMemo(() => 
    completedLessons.filter(l => l.paid).reduce((sum, l) => sum + l.price, 0),
    [completedLessons]
  );

  const pendingAmount = totalEarnings - paidAmount;

  // Konu analizi
  const topicAnalysis = useMemo(() => {
    const topics: Record<string, number> = {};
    completedLessons.forEach(l => {
      const topic = l.subject || 'Belirtilmemiş';
      topics[topic] = (topics[topic] || 0) + 1;
    });
    return Object.entries(topics)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [completedLessons]);

  // Katılım oranı
  const attendanceRate = useMemo(() => {
    if (studentLessons.length === 0) return 0;
    return Math.round((completedLessons.length / (completedLessons.length + cancelledLessons.length)) * 100) || 0;
  }, [completedLessons, cancelledLessons, studentLessons]);

  // Ortalama performans (participation score)
  const avgPerformance = useMemo(() => {
    const scores = completedLessons
      .filter(l => l.participationScore)
      .map(l => l.participationScore!);
    if (scores.length === 0) return null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 20);
  }, [completedLessons]);

  // Son derslerden notlar
  const recentNotes = useMemo(() => {
    return completedLessons
      .filter(l => l.notes)
      .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
      .slice(0, 3);
  }, [completedLessons]);

  // Aylık ders trendi
  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const thisMonth = completedLessons.filter(l => {
      const d = new Date(l.start);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    
    const lastMonth = completedLessons.filter(l => {
      const d = new Date(l.start);
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getMonth() === prevMonth.getMonth() && d.getFullYear() === prevMonth.getFullYear();
    }).length;

    return { thisMonth, lastMonth, diff: thisMonth - lastMonth };
  }, [completedLessons]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold bg-white/20 backdrop-blur"
            >
              {student.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{student.name}</h2>
              <p className="text-orange-100">{student.gradeLevel || 'Seviye belirtilmemiş'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onShowQR}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              title="Veli Kartı"
            >
              <Image className="w-6 h-6" />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Ana İstatistikler */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-blue-600">{completedLessons.length}</p>
              <p className="text-xs text-slate-500">Tamamlanan Ders</p>
            </div>
            
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                <XCircle className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-red-600">{cancelledLessons.length}</p>
              <p className="text-xs text-slate-500">İptal Edilen</p>
            </div>
            
            <div className="bg-emerald-50 rounded-xl p-4 text-center">
              <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-emerald-600">₺{totalEarnings.toLocaleString('tr-TR')}</p>
              <p className="text-xs text-slate-500">Toplam Kazanç</p>
            </div>
            
            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-purple-600">%{attendanceRate}</p>
              <p className="text-xs text-slate-500">Katılım Oranı</p>
            </div>
          </div>

          {/* Son Ders & Performans */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-500" />
                Son Ders
              </h3>
              {lastLesson ? (
                <div>
                  <p className="text-lg font-bold text-slate-800">
                    {new Date(lastLesson.start).toLocaleDateString('tr-TR', { 
                      day: 'numeric', month: 'long', year: 'numeric' 
                    })}
                  </p>
                  <p className="text-sm text-slate-500">{lastLesson.subject || 'Konu belirtilmemiş'}</p>
                </div>
              ) : (
                <p className="text-slate-400">Henüz ders yapılmamış</p>
              )}
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-orange-500" />
                Ortalama Performans
              </h3>
              {avgPerformance !== null ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-slate-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${
                        avgPerformance >= 80 ? 'bg-emerald-500' :
                        avgPerformance >= 60 ? 'bg-blue-500' :
                        avgPerformance >= 40 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${avgPerformance}%` }}
                    />
                  </div>
                  <span className="font-bold text-slate-700">{avgPerformance}/100</span>
                </div>
              ) : (
                <p className="text-slate-400">Henüz değerlendirme yok</p>
              )}
            </div>
          </div>

          {/* Finansal Durum */}
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-4 border border-emerald-100">
            <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              Finansal Durum
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-slate-500">Toplam</p>
                <p className="text-xl font-bold text-slate-800">₺{totalEarnings.toLocaleString('tr-TR')}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Ödenen</p>
                <p className="text-xl font-bold text-emerald-600">₺{paidAmount.toLocaleString('tr-TR')}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Bekleyen</p>
                <p className="text-xl font-bold text-amber-600">₺{pendingAmount.toLocaleString('tr-TR')}</p>
              </div>
            </div>
          </div>

          {/* Konu Analizi */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-orange-500" />
              Konu Dağılımı
            </h3>
            {topicAnalysis.length > 0 ? (
              <div className="space-y-2">
                {topicAnalysis.map(([topic, count], index) => (
                  <div key={topic} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{topic}</span>
                        <span className="text-xs text-slate-500">{count} ders</span>
                      </div>
                      <div className="bg-slate-200 rounded-full h-1.5">
                        <div 
                          className="bg-orange-500 rounded-full h-1.5"
                          style={{ width: `${(count / completedLessons.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400">Henüz konu verisi yok</p>
            )}
          </div>

          {/* Aylık Trend */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              Aylık Trend
            </h3>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-sm text-slate-500">Bu Ay</p>
                <p className="text-2xl font-bold text-slate-800">{monthlyTrend.thisMonth} ders</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Geçen Ay</p>
                <p className="text-2xl font-bold text-slate-800">{monthlyTrend.lastMonth} ders</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                monthlyTrend.diff > 0 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : monthlyTrend.diff < 0 
                    ? 'bg-red-100 text-red-700'
                    : 'bg-slate-100 text-slate-700'
              }`}>
                {monthlyTrend.diff > 0 ? '+' : ''}{monthlyTrend.diff} fark
              </div>
            </div>
          </div>

          {/* Son Notlar */}
          {recentNotes.length > 0 && (
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
              <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                Son Ders Notları
              </h3>
              <div className="space-y-3">
                {recentNotes.map(lesson => (
                  <div key={lesson.id} className="bg-white rounded-lg p-3 border border-amber-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-500">
                        {new Date(lesson.start).toLocaleDateString('tr-TR')}
                      </span>
                      <span className="text-xs text-amber-600 font-medium">{lesson.subject}</span>
                    </div>
                    <p className="text-sm text-slate-700">{lesson.notes}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Öğrenci Notu */}
          {student.notes && (
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <h3 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-500" />
                Öğretmen Notu
              </h3>
              <p className="text-slate-700">{student.notes}</p>
            </div>
          )}

          {/* İletişim Bilgileri */}
          <div className="bg-slate-100 rounded-xl p-4">
            <h3 className="font-semibold text-slate-700 mb-3">İletişim Bilgileri</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Veli</p>
                <p className="font-medium text-slate-800">{student.parentName || '-'}</p>
              </div>
              <div>
                <p className="text-slate-500">Telefon</p>
                <p className="font-medium text-slate-800">{student.contactNumber || '-'}</p>
              </div>
              <div>
                <p className="text-slate-500">Saat Ücreti</p>
                <p className="font-medium text-orange-600">₺{student.hourlyRate}</p>
              </div>
              <div>
                <p className="text-slate-500">Planlanan Ders</p>
                <p className="font-medium text-slate-800">{scheduledLessons.length} ders</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
