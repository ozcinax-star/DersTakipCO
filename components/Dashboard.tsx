import React from 'react';
import { Teacher, Student, Lesson, LessonStatus } from '../types';
import { BookOpen, Users, TrendingUp, Clock, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { TodayPanel } from './TodayPanel';

interface DashboardProps {
  teacher: Teacher;
  lessons: Lesson[];
  students: Student[];
  onNavigate: (view: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ teacher, lessons, students, onNavigate }) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  // This month's lessons
  const thisMonthLessons = lessons.filter(l => {
    const lessonDate = new Date(l.start);
    return lessonDate >= startOfMonth && lessonDate <= endOfMonth;
  });
  
  // All completed lessons (for total earnings)
  const allCompletedLessons = lessons.filter(l => l.status === LessonStatus.COMPLETED);
  
  // This month statistics
  const thisMonthCompleted = thisMonthLessons.filter(l => l.status === LessonStatus.COMPLETED);
  const scheduledLessons = thisMonthLessons.filter(l => l.status === LessonStatus.SCHEDULED);
  const cancelledLessons = thisMonthLessons.filter(l => l.status === LessonStatus.CANCELLED);
  
  // Earnings - ALL TIME (tüm zamanlar)
  const totalEarnings = allCompletedLessons.reduce((sum, l) => sum + l.price, 0);
  const paidEarnings = allCompletedLessons.filter(l => l.paid).reduce((sum, l) => sum + l.price, 0);
  const pendingPayments = totalEarnings - paidEarnings;
  
  // This month earnings (for comparison)
  const thisMonthEarnings = thisMonthCompleted.reduce((sum, l) => sum + l.price, 0);
  
  // Upcoming lessons (next 7 days)
  const next7Days = new Date();
  next7Days.setDate(next7Days.getDate() + 7);
  
  const upcomingLessons = lessons
    .filter(l => {
      const lessonDate = new Date(l.start);
      return lessonDate >= now && lessonDate <= next7Days && l.status === LessonStatus.SCHEDULED;
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 5);
  
  // Recent lessons
  const recentLessons = lessons
    .filter(l => new Date(l.start) < now)
    .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
    .slice(0, 5);

  const getStudentName = (studentId: string) => {
    return students.find(s => s.id === studentId)?.name || 'Bilinmeyen';
  };

  const getStudentColor = (studentId: string) => {
    return students.find(s => s.id === studentId)?.color || '#6b7280';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const stats = [
    {
      label: 'Toplam Öğrenci',
      value: students.length,
      icon: <Users className="w-5 h-5" />,
      color: 'bg-blue-500',
      bgLight: 'bg-blue-50',
    },
    {
      label: 'Tamamlanan Ders',
      value: allCompletedLessons.length,
      icon: <CheckCircle className="w-5 h-5" />,
      color: 'bg-emerald-500',
      bgLight: 'bg-emerald-50',
    },
    {
      label: 'Planlanan Dersler',
      value: scheduledLessons.length,
      icon: <Clock className="w-5 h-5" />,
      color: 'bg-orange-500',
      bgLight: 'bg-orange-50',
    },
    {
      label: 'İptal Edilen',
      value: cancelledLessons.length,
      icon: <XCircle className="w-5 h-5" />,
      color: 'bg-red-500',
      bgLight: 'bg-red-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Hoş geldin, {teacher.name.split(' ')[0]}! 👋
          </h1>
          <p className="text-slate-500 mt-1">
            {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Bugün Ne Yapacağım Paneli */}
      <TodayPanel 
        lessons={lessons} 
        students={students} 
        onNavigate={onNavigate}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className={`${stat.bgLight} rounded-xl p-4 border border-slate-100`}>
            <div className={`${stat.color} w-10 h-10 rounded-lg flex items-center justify-center text-white mb-3`}>
              {stat.icon}
            </div>
            <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            <p className="text-sm text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Earnings Card */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5" />
          <span className="font-medium">Toplam Kazanç</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-orange-100 text-sm mb-1">Toplam Kazanç</p>
            <p className="text-3xl font-bold">₺{totalEarnings.toLocaleString('tr-TR')}</p>
          </div>
          <div>
            <p className="text-orange-100 text-sm mb-1">Tahsil Edilen</p>
            <p className="text-3xl font-bold">₺{paidEarnings.toLocaleString('tr-TR')}</p>
          </div>
          <div>
            <p className="text-orange-100 text-sm mb-1">Bekleyen</p>
            <p className="text-3xl font-bold">₺{pendingPayments.toLocaleString('tr-TR')}</p>
          </div>
        </div>
        {thisMonthEarnings > 0 && (
          <div className="mt-4 pt-4 border-t border-orange-400/30">
            <p className="text-orange-100 text-sm">Bu Ay: <span className="font-bold text-white">₺{thisMonthEarnings.toLocaleString('tr-TR')}</span></p>
          </div>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Lessons */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-orange-500" />
            <h2 className="font-bold text-slate-800">Yaklaşan Dersler</h2>
          </div>
          {upcomingLessons.length === 0 ? (
            <p className="text-slate-400 text-sm py-8 text-center">Yaklaşan ders bulunmuyor</p>
          ) : (
            <div className="space-y-3">
              {upcomingLessons.map(lesson => (
                <div 
                  key={lesson.id} 
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div 
                    className="w-1 h-12 rounded-full"
                    style={{ backgroundColor: getStudentColor(lesson.studentId) }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">
                      {getStudentName(lesson.studentId)}
                    </p>
                    <p className="text-sm text-slate-500">
                      {formatDate(lesson.start)} • {formatTime(lesson.start)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-slate-800">₺{lesson.price}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Lessons */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-blue-500" />
            <h2 className="font-bold text-slate-800">Son Dersler</h2>
          </div>
          {recentLessons.length === 0 ? (
            <p className="text-slate-400 text-sm py-8 text-center">Henüz ders bulunmuyor</p>
          ) : (
            <div className="space-y-3">
              {recentLessons.map(lesson => (
                <div 
                  key={lesson.id} 
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                >
                  <div 
                    className="w-1 h-12 rounded-full"
                    style={{ backgroundColor: getStudentColor(lesson.studentId) }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">
                      {getStudentName(lesson.studentId)}
                    </p>
                    <p className="text-sm text-slate-500">
                      {formatDate(lesson.start)} • {formatTime(lesson.start)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      lesson.status === LessonStatus.COMPLETED 
                        ? 'bg-emerald-100 text-emerald-700'
                        : lesson.status === LessonStatus.CANCELLED
                        ? 'bg-red-100 text-red-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {lesson.status === LessonStatus.COMPLETED ? 'Tamamlandı' : 
                       lesson.status === LessonStatus.CANCELLED ? 'İptal' : 'Planlandı'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
