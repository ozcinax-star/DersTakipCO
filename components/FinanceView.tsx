import React, { useState, useMemo } from 'react';
import { Lesson, Student, Group, ReportTemplate, Teacher, LessonStatus } from '../types';
import { TrendingUp, TrendingDown, Users, BookOpen, Calendar, ChevronDown, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { parseLocalDate } from './dateUtils';

interface FinanceViewProps {
  lessons: Lesson[];
  students: Student[];
  groups: Group[];
  templates: ReportTemplate[];
  teacher: Teacher;
}

export const FinanceView: React.FC<FinanceViewProps> = ({ lessons, students, groups, templates, teacher }) => {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  // Calculate date range based on period
  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date;
    
    switch (period) {
      case 'week':
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default: // month
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    return { start, end: now };
  }, [period]);

  // Filter lessons by date range
  const filteredLessons = useMemo(() => {
    return lessons.filter(lesson => {
      const lessonDate = new Date(lesson.start);
      return lessonDate >= dateRange.start && lessonDate <= dateRange.end;
    });
  }, [lessons, dateRange]);

  // Calculate statistics
  const stats = useMemo(() => {
    const completed = filteredLessons.filter(l => l.status === LessonStatus.COMPLETED);
    const cancelled = filteredLessons.filter(l => l.status === LessonStatus.CANCELLED);
    const scheduled = filteredLessons.filter(l => l.status === LessonStatus.SCHEDULED);
    
    const totalRevenue = completed.reduce((sum, l) => sum + l.price, 0);
    const paidRevenue = completed.filter(l => l.paid).reduce((sum, l) => sum + l.price, 0);
    const pendingRevenue = totalRevenue - paidRevenue;
    
    // Revenue by student
    const revenueByStudent: { [key: string]: number } = {};
    completed.forEach(lesson => {
      const studentId = lesson.studentId;
      revenueByStudent[studentId] = (revenueByStudent[studentId] || 0) + lesson.price;
    });
    
    // Lessons by student
    const lessonsByStudent: { [key: string]: number } = {};
    completed.forEach(lesson => {
      const studentId = lesson.studentId;
      lessonsByStudent[studentId] = (lessonsByStudent[studentId] || 0) + 1;
    });
    
    return {
      totalLessons: filteredLessons.length,
      completedLessons: completed.length,
      cancelledLessons: cancelled.length,
      scheduledLessons: scheduled.length,
      totalRevenue,
      paidRevenue,
      pendingRevenue,
      revenueByStudent,
      lessonsByStudent,
      cancellationRate: filteredLessons.length > 0 
        ? Math.round((cancelled.length / filteredLessons.length) * 100) 
        : 0
    };
  }, [filteredLessons]);

  // Chart data for monthly breakdown
  const monthlyChartData = useMemo(() => {
    const months: { [key: string]: { revenue: number; lessons: number } } = {};
    const now = new Date();

    lessons.forEach(lesson => {
      const date = new Date(lesson.start);
      // Gelecek aylardaki planlı dersler son 6 ayı grafikten itmesin
      if (date > now) return;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!months[monthKey]) {
        months[monthKey] = { revenue: 0, lessons: 0 };
      }
      
      if (lesson.status === LessonStatus.COMPLETED) {
        months[monthKey].revenue += lesson.price;
        months[monthKey].lessons += 1;
      }
    });
    
    return Object.entries(months)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, data]) => ({
        // new Date('YYYY-MM-01') UTC kabul eder; yerel tarih olarak çöz
        month: parseLocalDate(`${month}-01`).toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' }),
        ...data
      }));
  }, [lessons]);

  // Pie chart data for student distribution
  const studentDistributionData = useMemo(() => {
    const entries = Object.entries(stats.revenueByStudent) as [string, number][];
    return entries
      .map(([studentId, revenue]) => {
        const student = students.find(s => s.id === studentId);
        return {
          name: student?.name || 'Bilinmeyen',
          value: revenue as number,
          color: student?.color || '#6b7280'
        };
      })
      .sort((a, b) => (b.value as number) - (a.value as number))
      .slice(0, 5);
  }, [stats.revenueByStudent, students]);

  const periodLabels = {
    week: 'Son 7 Gün',
    month: 'Bu Ay',
    year: 'Bu Yıl'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Finans</h1>
          <p className="text-slate-500">Finansal özet ve istatistikler</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <Calendar className="w-4 h-4" />
            <span>{periodLabels[period]}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showPeriodDropdown ? 'rotate-180' : ''}`} />
          </button>
          {showPeriodDropdown && (
            <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
              <div className="p-2 space-y-1">
                {Object.entries(periodLabels).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => { setPeriod(key as any); setShowPeriodDropdown(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                      period === key 
                        ? 'bg-orange-50 text-orange-700' 
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Toplam Kazanç</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">₺{stats.totalRevenue.toLocaleString('tr-TR')}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <BookOpen className="w-4 h-4" />
            <span className="text-sm">Tamamlanan Ders</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.completedLessons}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <TrendingDown className="w-4 h-4" />
            <span className="text-sm">Bekleyen Ödeme</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">₺{stats.pendingRevenue.toLocaleString('tr-TR')}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Users className="w-4 h-4" />
            <span className="text-sm">İptal Oranı</span>
          </div>
          <p className="text-2xl font-bold text-red-600">%{stats.cancellationRate}</p>
        </div>
      </div>

      {/* Revenue Summary Card */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white">
        <h2 className="text-lg font-medium text-orange-100 mb-4">Dönem Özeti: {periodLabels[period]}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-orange-100 text-sm mb-1">Toplam Ders Sayısı</p>
            <p className="text-3xl font-bold">{stats.totalLessons}</p>
          </div>
          <div>
            <p className="text-orange-100 text-sm mb-1">Tahsil Edilen</p>
            <p className="text-3xl font-bold">₺{stats.paidRevenue.toLocaleString('tr-TR')}</p>
          </div>
          <div>
            <p className="text-orange-100 text-sm mb-1">Aktif Öğrenci</p>
            <p className="text-3xl font-bold">{Object.keys(stats.lessonsByStudent).length}</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-800 mb-4">Aylık Kazanç</h2>
          {monthlyChartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number) => [`₺${value.toLocaleString('tr-TR')}`, 'Kazanç']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              Henüz veri yok
            </div>
          )}
        </div>

        {/* Student Distribution Pie Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-800 mb-4">Öğrenci Dağılımı (Kazanç)</h2>
          {studentDistributionData.length > 0 ? (
            <div className="h-64 flex items-center">
              <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={studentDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {studentDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`₺${value.toLocaleString('tr-TR')}`, 'Kazanç']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-2">
                {studentDistributionData.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-slate-600 truncate flex-1">{item.name}</span>
                    <span className="text-sm font-medium text-slate-800">₺{item.value.toLocaleString('tr-TR')}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              Henüz veri yok
            </div>
          )}
        </div>
      </div>

      {/* Student Performance Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h2 className="font-bold text-slate-800">Öğrenci Bazlı Özet</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Öğrenci</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">Ders Sayısı</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Toplam Kazanç</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                    Henüz öğrenci bulunmuyor
                  </td>
                </tr>
              ) : (
                students.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                          style={{ backgroundColor: student.color }}
                        >
                          {student.name.charAt(0)}
                        </div>
                        <span className="font-medium text-slate-800">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">
                      {stats.lessonsByStudent[student.id] || 0}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      ₺{(stats.revenueByStudent[student.id] || 0).toLocaleString('tr-TR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
