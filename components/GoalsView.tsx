import React, { useState, useMemo } from 'react';
import { Teacher, Student, Lesson, LessonStatus, StudentPerformance } from '../types';
import { Target, TrendingUp, Clock, DollarSign, Award, AlertTriangle, CheckCircle, Users, BarChart3 } from 'lucide-react';

interface GoalsViewProps {
  teacher: Teacher;
  students: Student[];
  lessons: Lesson[];
  onUpdateTeacher: (teacher: Teacher) => void;
}

export const GoalsView: React.FC<GoalsViewProps> = ({
  teacher,
  students,
  lessons,
  onUpdateTeacher
}) => {
  const [monthlyGoal, setMonthlyGoal] = useState(teacher.monthlyGoal || 20000);
  const [avgHourlyRate, setAvgHourlyRate] = useState(teacher.defaultHourlyRate || 500);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysInMonth = endOfMonth.getDate();
  const daysPassed = now.getDate();
  const daysRemaining = daysInMonth - daysPassed;

  // Bu ayki kazanç
  const thisMonthEarnings = useMemo(() => {
    return lessons
      .filter(l => {
        const date = new Date(l.start);
        return date >= startOfMonth && date <= endOfMonth && l.status === LessonStatus.COMPLETED;
      })
      .reduce((sum, l) => sum + l.price, 0);
  }, [lessons]);

  // Hedefe kalan
  const remainingToGoal = monthlyGoal - thisMonthEarnings;
  const progressPercent = Math.min(100, (thisMonthEarnings / monthlyGoal) * 100);

  // Gerekli haftalık saat
  const weeksRemaining = Math.ceil(daysRemaining / 7);
  const hoursNeededPerWeek = remainingToGoal > 0 
    ? Math.ceil(remainingToGoal / avgHourlyRate / Math.max(1, weeksRemaining))
    : 0;

  // Günlük hedef
  const dailyTarget = remainingToGoal > 0 ? Math.ceil(remainingToGoal / Math.max(1, daysRemaining)) : 0;

  // Öğrenci performansları
  const studentPerformances = useMemo((): StudentPerformance[] => {
    return students.map(student => {
      const studentLessons = lessons.filter(l => l.studentId === student.id);
      const completedLessons = studentLessons.filter(l => l.status === LessonStatus.COMPLETED);
      const cancelledLessons = studentLessons.filter(l => l.status === LessonStatus.CANCELLED);
      
      // Katılım oranı
      const attendedLessons = completedLessons.filter(l => l.attendanceStatus !== 'absent');
      const attendanceRate = completedLessons.length > 0 
        ? (attendedLessons.length / completedLessons.length) * 100 
        : 100;
      
      // Ortalama katılım skoru
      const participationScores = completedLessons
        .filter(l => l.participationScore)
        .map(l => l.participationScore!);
      const avgParticipation = participationScores.length > 0
        ? participationScores.reduce((a, b) => a + b, 0) / participationScores.length * 20
        : 50;
      
      // Devamlılık skoru - son 3 ayda düzenlilik
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const recentLessons = completedLessons.filter(l => new Date(l.start) > threeMonthsAgo);
      
      // Haftalık ders sayısına göre devamlılık
      const weeksWithLessons = new Set(
        recentLessons.map(l => {
          const date = new Date(l.start);
          return `${date.getFullYear()}-${Math.floor(date.getDate() / 7)}`;
        })
      ).size;
      const continuityScore = Math.min(100, (weeksWithLessons / 12) * 100);
      
      // Final performans skoru (ağırlıklı ortalama)
      const performanceScore = Math.round(
        (attendanceRate * 0.3) +
        (avgParticipation * 0.3) +
        (continuityScore * 0.25) +
        (Math.min(100, completedLessons.length * 5) * 0.15)
      );
      
      return {
        studentId: student.id,
        totalLessons: studentLessons.length,
        completedLessons: completedLessons.length,
        cancelledLessons: cancelledLessons.length,
        attendanceRate,
        averageParticipation: avgParticipation,
        continuityScore,
        performanceScore
      };
    }).sort((a, b) => b.performanceScore - a.performanceScore);
  }, [students, lessons]);

  // Hedefi kaydet
  const saveGoal = () => {
    onUpdateTeacher({
      ...teacher,
      monthlyGoal,
      defaultHourlyRate: avgHourlyRate
    });
    alert('Hedefler kaydedildi!');
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50';
    if (score >= 60) return 'text-blue-600 bg-blue-50';
    if (score >= 40) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Mükemmel';
    if (score >= 60) return 'İyi';
    if (score >= 40) return 'Orta';
    return 'Düşük';
  };

  const selectedPerformance = selectedStudent 
    ? studentPerformances.find(p => p.studentId === selectedStudent)
    : null;
  const selectedStudentData = selectedStudent
    ? students.find(s => s.id === selectedStudent)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Target className="w-7 h-7 text-orange-500" />
            Hedefler & Performans
          </h1>
          <p className="text-slate-500 mt-1">Aylık gelir hedefinizi ve öğrenci performanslarını takip edin</p>
        </div>
        <button
          onClick={saveGoal}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
        >
          <CheckCircle className="w-4 h-4" />
          Kaydet
        </button>
      </div>

      {/* Goal Settings */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-orange-500" />
          Kazanç Hedef Sistemi
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Aylık Gelir Hedefi (₺)
            </label>
            <input
              type="number"
              value={monthlyGoal}
              onChange={(e) => setMonthlyGoal(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              step="1000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Ortalama Saat Ücreti (₺)
            </label>
            <input
              type="number"
              value={avgHourlyRate}
              onChange={(e) => setAvgHourlyRate(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              step="50"
            />
          </div>
        </div>
      </div>

      {/* Progress Card */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <span className="font-medium">{now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} Hedefi</span>
          <span className="text-orange-200">{daysPassed}/{daysInMonth} gün</span>
        </div>
        
        <div className="mb-4">
          <div className="flex items-end justify-between mb-2">
            <span className="text-3xl font-bold">₺{thisMonthEarnings.toLocaleString('tr-TR')}</span>
            <span className="text-orange-200">/ ₺{monthlyGoal.toLocaleString('tr-TR')}</span>
          </div>
          <div className="w-full bg-orange-400/30 rounded-full h-3">
            <div 
              className="bg-white rounded-full h-3 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-sm text-orange-200 mt-2">%{progressPercent.toFixed(1)} tamamlandı</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-orange-400/30">
          <div>
            <p className="text-orange-200 text-sm">Hedefe Kalan</p>
            <p className="text-xl font-bold">₺{Math.max(0, remainingToGoal).toLocaleString('tr-TR')}</p>
          </div>
          <div>
            <p className="text-orange-200 text-sm">Günlük Hedef</p>
            <p className="text-xl font-bold">₺{dailyTarget.toLocaleString('tr-TR')}</p>
          </div>
          <div>
            <p className="text-orange-200 text-sm">Gerekli Haftalık Saat</p>
            <p className="text-xl font-bold">{hoursNeededPerWeek} saat</p>
          </div>
        </div>
      </div>

      {/* Status Alert */}
      {progressPercent >= 100 ? (
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-emerald-500" />
          <div>
            <p className="font-medium text-emerald-800">Tebrikler! 🎉</p>
            <p className="text-sm text-emerald-600">Bu ayki hedefinize ulaştınız!</p>
          </div>
        </div>
      ) : daysRemaining <= 7 && progressPercent < 80 ? (
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
          <div>
            <p className="font-medium text-amber-800">Dikkat!</p>
            <p className="text-sm text-amber-600">
              Hedefinize ulaşmak için {daysRemaining} gün içinde {hoursNeededPerWeek} saat ders vermeniz gerekiyor.
            </p>
          </div>
        </div>
      ) : null}

      {/* Student Performance Section */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Award className="w-5 h-5 text-orange-500" />
            Öğrenci Performans Skorları
          </h2>
          <p className="text-sm text-slate-500">Katılım, devamlılık ve ders sayısına göre hesaplanır</p>
        </div>
        
        <div className="divide-y divide-slate-100">
          {studentPerformances.map((perf, index) => {
            const student = students.find(s => s.id === perf.studentId);
            if (!student) return null;
            
            return (
              <div 
                key={perf.studentId}
                className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${
                  selectedStudent === perf.studentId ? 'bg-orange-50' : ''
                }`}
                onClick={() => setSelectedStudent(
                  selectedStudent === perf.studentId ? null : perf.studentId
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: student.color }}
                    >
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{student.name}</p>
                      <p className="text-sm text-slate-500">
                        {perf.completedLessons} ders tamamlandı
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(perf.performanceScore)}`}>
                      {perf.performanceScore}/100
                    </div>
                    <span className={`text-xs ${getScoreColor(perf.performanceScore).split(' ')[0]}`}>
                      {getScoreLabel(perf.performanceScore)}
                    </span>
                  </div>
                </div>
                
                {/* Expanded Details */}
                {selectedStudent === perf.studentId && (
                  <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <p className="text-2xl font-bold text-slate-800">%{perf.attendanceRate.toFixed(0)}</p>
                      <p className="text-xs text-slate-500">Katılım Oranı</p>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <p className="text-2xl font-bold text-slate-800">{perf.averageParticipation.toFixed(0)}</p>
                      <p className="text-xs text-slate-500">Ders İçi Katılım</p>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <p className="text-2xl font-bold text-slate-800">{perf.continuityScore.toFixed(0)}</p>
                      <p className="text-xs text-slate-500">Devamlılık</p>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <p className="text-2xl font-bold text-slate-800">{perf.cancelledLessons}</p>
                      <p className="text-xs text-slate-500">İptal Edilen</p>
                    </div>
                    
                    {/* Performance Bar Chart */}
                    <div className="col-span-2 md:col-span-4 mt-2">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 w-24">Katılım</span>
                          <div className="flex-1 bg-slate-200 rounded-full h-2">
                            <div className="bg-blue-500 rounded-full h-2" style={{ width: `${perf.attendanceRate}%` }} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 w-24">Aktiflik</span>
                          <div className="flex-1 bg-slate-200 rounded-full h-2">
                            <div className="bg-emerald-500 rounded-full h-2" style={{ width: `${perf.averageParticipation}%` }} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 w-24">Devamlılık</span>
                          <div className="flex-1 bg-slate-200 rounded-full h-2">
                            <div className="bg-orange-500 rounded-full h-2" style={{ width: `${perf.continuityScore}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {studentPerformances.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              Henüz öğrenci bulunmuyor
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <h3 className="font-medium text-blue-800 mb-2">💡 Performans Skoru Nasıl Hesaplanır?</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Katılım Oranı (%30):</strong> Derse katılma yüzdesi</li>
          <li>• <strong>Ders İçi Katılım (%30):</strong> Derste aktif olma skoru</li>
          <li>• <strong>Devamlılık (%25):</strong> Son 3 ayda düzenli ders alma</li>
          <li>• <strong>Toplam Ders (%15):</strong> Tamamlanan ders sayısı</li>
        </ul>
      </div>
    </div>
  );
};
