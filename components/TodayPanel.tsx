import React, { useMemo } from 'react';
import { Student, Lesson, LessonStatus } from '../types';
import {
  Sun, Sunset, Moon, Calendar, DollarSign, AlertTriangle, Clock,
  CheckCircle, Users, ArrowRight, Bell,
  Coffee, BookOpen, FileText
} from 'lucide-react';
import { getWeekStart } from './dateUtils';

interface TodayPanelProps {
  lessons: Lesson[];
  students: Student[];
  onNavigate: (view: string) => void;
}

export const TodayPanel: React.FC<TodayPanelProps> = ({
  lessons,
  students,
  onNavigate
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Bugünkü dersler
  const todayLessons = useMemo(() => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);
    return lessons
      .filter(l => {
        const lessonDate = new Date(l.start);
        return lessonDate >= dayStart && lessonDate < dayEnd;
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [lessons]);

  // Bekleyen ödemeler (son 30 gündeki ödenmemiş dersler)
  const pendingPayments = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return lessons.filter(l => 
      l.status === LessonStatus.COMPLETED && 
      !l.paid &&
      new Date(l.start) >= thirtyDaysAgo
    );
  }, [lessons]);

  // Öğrenci bazlı bekleyen ödemeler
  const pendingByStudent = useMemo(() => {
    const grouped: Record<string, { student: Student | undefined; amount: number; count: number }> = {};
    
    pendingPayments.forEach(lesson => {
      if (!grouped[lesson.studentId]) {
        grouped[lesson.studentId] = {
          student: students.find(s => s.id === lesson.studentId),
          amount: 0,
          count: 0
        };
      }
      grouped[lesson.studentId].amount += lesson.price;
      grouped[lesson.studentId].count += 1;
    });
    
    return Object.values(grouped)
      .filter(g => g.student)
      .sort((a, b) => b.amount - a.amount);
  }, [pendingPayments, students]);

  // Uzun süredir ders yapılmayan öğrenciler (14+ gün)
  // Hiç dersi olmayan yeni öğrenciler ve ileri tarihli planlı dersi olanlar sayılmaz.
  const inactiveStudents = useMemo(() => {
    const now = new Date();
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    return students.filter(student => {
      const studentLessons = lessons.filter(l => l.studentId === student.id);
      const hasUpcoming = studentLessons.some(l =>
        l.status === LessonStatus.SCHEDULED && new Date(l.start) >= now
      );
      if (hasUpcoming) return false;

      const completedLessons = studentLessons.filter(l => l.status === LessonStatus.COMPLETED);
      if (completedLessons.length === 0) return false;

      const lastLesson = completedLessons.reduce((latest, current) =>
        new Date(current.start) > new Date(latest.start) ? current : latest
      );

      return new Date(lastLesson.start) < fourteenDaysAgo;
    });
  }, [students, lessons]);

  // Bu hafta iptal edilen dersler (yeniden planlanması gereken)
  const cancelledThisWeek = useMemo(() => {
    const weekStart = getWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    return lessons.filter(l => {
      const start = new Date(l.start);
      return l.status === LessonStatus.CANCELLED && start >= weekStart && start < weekEnd;
    });
  }, [lessons]);

  // Sıradaki ders
  const nextLesson = useMemo(() => {
    const now = new Date();
    return todayLessons.find(l => l.status === LessonStatus.SCHEDULED && new Date(l.start) > now);
  }, [todayLessons]);

  // Tamamlanan bugünkü dersler
  const completedToday = todayLessons.filter(l => l.status === LessonStatus.COMPLETED).length;

  // Günün saatine göre selamlama ve ikon
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { text: 'Günaydın', icon: <Sun className="w-6 h-6 text-yellow-300" /> };
    if (hour >= 12 && hour < 18) return { text: 'İyi günler', icon: <Sun className="w-6 h-6 text-yellow-300" /> };
    if (hour >= 18 && hour < 22) return { text: 'İyi akşamlar', icon: <Sunset className="w-6 h-6 text-amber-200" /> };
    return { text: 'İyi geceler', icon: <Moon className="w-6 h-6 text-indigo-100" /> };
  };
  const greeting = getGreeting();

  // Toplam bekleyen ödeme
  const totalPending = pendingPayments.reduce((sum, l) => sum + l.price, 0);

  // Kritik uyarılar
  const criticalAlerts = useMemo(() => {
    const alerts: { type: 'payment' | 'inactive' | 'cancelled'; message: string; count: number }[] = [];
    
    if (totalPending > 5000) {
      alerts.push({ 
        type: 'payment', 
        message: `₺${totalPending.toLocaleString('tr-TR')} bekleyen ödeme var`,
        count: pendingPayments.length
      });
    }
    
    if (inactiveStudents.length > 0) {
      alerts.push({
        type: 'inactive',
        message: `${inactiveStudents.length} öğrenci 2 haftadır ders almadı`,
        count: inactiveStudents.length
      });
    }
    
    if (cancelledThisWeek.length > 0) {
      alerts.push({
        type: 'cancelled',
        message: `${cancelledThisWeek.length} iptal edilmiş ders yeniden planlanabilir`,
        count: cancelledThisWeek.length
      });
    }
    
    return alerts;
  }, [totalPending, pendingPayments, inactiveStudents, cancelledThisWeek]);

  return (
    <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 rounded-2xl p-6 text-white shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {greeting.icon}
            <h2 className="text-xl font-bold">{greeting.text}!</h2>
          </div>
          <p className="text-orange-100">
            {today.toLocaleDateString('tr-TR', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold">{todayLessons.length}</p>
          <p className="text-orange-200 text-sm">bugün ders</p>
        </div>
      </div>

      {/* Bugün boş mu? */}
      {todayLessons.length === 0 ? (
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <Coffee className="w-8 h-8 text-orange-200" />
            <div>
              <p className="font-medium">Bugün ders yok</p>
              <p className="text-sm text-orange-200">Dinlenme veya planlama zamanı!</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Sıradaki Ders */}
          {nextLesson && (
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-orange-200 text-sm">Sıradaki Ders</p>
                    <p className="font-bold text-lg">
                      {students.find(s => s.id === nextLesson.studentId)?.name || 'Öğrenci'}
                    </p>
                    <p className="text-sm text-orange-100">{nextLesson.subject}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {new Date(nextLesson.start).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bugünkü Ders Listesi */}
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Bugünkü Dersler
              </h3>
              <span className="text-sm bg-white/20 px-2 py-0.5 rounded-full">
                {completedToday}/{todayLessons.length} tamamlandı
              </span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {todayLessons.map(lesson => {
                const student = students.find(s => s.id === lesson.studentId);
                const isCompleted = lesson.status === LessonStatus.COMPLETED;
                const isPast = new Date(lesson.start) < new Date();
                
                return (
                  <div 
                    key={lesson.id}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      isCompleted 
                        ? 'bg-emerald-500/30' 
                        : isPast 
                          ? 'bg-red-500/30'
                          : 'bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4 text-emerald-300" />
                      ) : (
                        <Clock className="w-4 h-4 text-orange-200" />
                      )}
                      <span className="font-medium">{student?.name || 'Öğrenci'}</span>
                    </div>
                    <span className="text-sm">
                      {new Date(lesson.start).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Kritik Uyarılar */}
      {criticalAlerts.length > 0 && (
        <div className="space-y-2 mb-4">
          {criticalAlerts.map((alert, index) => (
            <div 
              key={index}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                alert.type === 'payment' 
                  ? 'bg-red-500/30' 
                  : alert.type === 'inactive'
                    ? 'bg-amber-500/30'
                    : 'bg-purple-500/30'
              }`}
            >
              {alert.type === 'payment' && <DollarSign className="w-5 h-5" />}
              {alert.type === 'inactive' && <Users className="w-5 h-5" />}
              {alert.type === 'cancelled' && <AlertTriangle className="w-5 h-5" />}
              <span className="text-sm flex-1">{alert.message}</span>
              <Bell className="w-4 h-4 animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* Hızlı Aksiyonlar */}
      <div className="grid grid-cols-2 gap-3">
        {/* Bekleyen Ödemeler */}
        {pendingByStudent.length > 0 && (
          <button
            onClick={() => onNavigate('FINANCE')}
            className="bg-white/10 hover:bg-white/20 rounded-xl p-3 text-left transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-emerald-300" />
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-2xl font-bold">₺{totalPending.toLocaleString('tr-TR')}</p>
            <p className="text-xs text-orange-200">{pendingPayments.length} bekleyen ödeme</p>
          </button>
        )}

        {/* Pasif Öğrenciler */}
        {inactiveStudents.length > 0 && (
          <button
            onClick={() => onNavigate('STUDENTS')}
            className="bg-white/10 hover:bg-white/20 rounded-xl p-3 text-left transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-amber-300" />
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-2xl font-bold">{inactiveStudents.length}</p>
            <p className="text-xs text-orange-200">pasif öğrenci</p>
          </button>
        )}

        {/* Rapor Oluştur */}
        <button
          onClick={() => onNavigate('REPORTS')}
          className="bg-white/10 hover:bg-white/20 rounded-xl p-3 text-left transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-5 h-5 text-blue-300" />
            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-sm font-medium">Rapor Oluştur</p>
          <p className="text-xs text-orange-200">PDF çıktı al</p>
        </button>

        {/* Ders Planla */}
        <button
          onClick={() => onNavigate('CREATE_LESSON')}
          className="bg-white/10 hover:bg-white/20 rounded-xl p-3 text-left transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <BookOpen className="w-5 h-5 text-purple-300" />
            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-sm font-medium">Yeni Ders</p>
          <p className="text-xs text-orange-200">Hızlıca planla</p>
        </button>
      </div>

      {/* En Çok Bekleyen Ödemeler (Top 3) */}
      {pendingByStudent.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/20">
          <h4 className="text-sm font-medium text-orange-200 mb-2">Öncelikli Tahsilatlar</h4>
          <div className="space-y-2">
            {pendingByStudent.slice(0, 3).map(({ student, amount, count }) => (
              <div key={student?.id} className="flex items-center justify-between bg-white/10 rounded-lg p-2">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: student?.color || '#888' }}
                  >
                    {student?.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{student?.name}</p>
                    <p className="text-xs text-orange-200">{count} ders</p>
                  </div>
                </div>
                <p className="font-bold">₺{amount.toLocaleString('tr-TR')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
