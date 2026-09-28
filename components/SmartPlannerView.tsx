import React, { useState, useMemo } from 'react';
import { Teacher, Student, Lesson, WeeklyAvailability, TimeSlot, SuggestedLesson, LessonStatus } from '../types';
import { Calendar, Clock, Zap, Plus, Check, AlertCircle, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

interface SmartPlannerViewProps {
  teacher: Teacher;
  students: Student[];
  lessons: Lesson[];
  onUpdateTeacher: (teacher: Teacher) => void;
  onCreateLesson: (lesson: Omit<Lesson, 'id'>) => void;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_LABELS: Record<string, string> = {
  monday: 'Pazartesi',
  tuesday: 'Salı',
  wednesday: 'Çarşamba',
  thursday: 'Perşembe',
  friday: 'Cuma',
  saturday: 'Cumartesi',
  sunday: 'Pazar'
};

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 08:00 - 22:00

export const SmartPlannerView: React.FC<SmartPlannerViewProps> = ({
  teacher,
  students,
  lessons,
  onUpdateTeacher,
  onCreateLesson
}) => {
  const [availability, setAvailability] = useState<WeeklyAvailability>(
    teacher.availability || {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    }
  );
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Uygunluk saatlerini güncelle
  const toggleHour = (day: typeof DAYS[number], hour: number) => {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    const endStr = `${(hour + 1).toString().padStart(2, '0')}:00`;
    
    const daySlots = [...availability[day]];
    const existingIndex = daySlots.findIndex(slot => slot.start === timeStr);
    
    if (existingIndex >= 0) {
      daySlots.splice(existingIndex, 1);
    } else {
      daySlots.push({ start: timeStr, end: endStr });
      daySlots.sort((a, b) => a.start.localeCompare(b.start));
    }
    
    // Ardışık saatleri birleştir
    const mergedSlots: TimeSlot[] = [];
    for (const slot of daySlots) {
      const last = mergedSlots[mergedSlots.length - 1];
      if (last && last.end === slot.start) {
        last.end = slot.end;
      } else {
        mergedSlots.push({ ...slot });
      }
    }
    
    setAvailability(prev => ({
      ...prev,
      [day]: mergedSlots
    }));
  };

  const isHourSelected = (day: typeof DAYS[number], hour: number) => {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    return availability[day].some(slot => {
      const startHour = parseInt(slot.start.split(':')[0]);
      const endHour = parseInt(slot.end.split(':')[0]);
      return hour >= startHour && hour < endHour;
    });
  };

  // Mevcut dersleri kontrol et
  const isHourBooked = (day: typeof DAYS[number], hour: number) => {
    const dayIndex = DAYS.indexOf(day);
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1 + dayIndex);
    
    return lessons.some(lesson => {
      const lessonDate = new Date(lesson.start);
      const lessonHour = lessonDate.getHours();
      return lessonDate.getDay() === (dayIndex + 1) % 7 && 
             lessonHour === hour &&
             lesson.status === LessonStatus.SCHEDULED;
    });
  };

  // Uygunluğu kaydet
  const saveAvailability = () => {
    onUpdateTeacher({
      ...teacher,
      availability
    });
    alert('Uygunluk saatleri kaydedildi!');
  };

  // Toplam uygun saat
  const totalAvailableHours = useMemo(() => {
    return DAYS.reduce((total, day) => {
      return total + availability[day].reduce((sum, slot) => {
        const start = parseInt(slot.start.split(':')[0]);
        const end = parseInt(slot.end.split(':')[0]);
        return sum + (end - start);
      }, 0);
    }, 0);
  }, [availability]);

  // Dolu saat sayısı
  const bookedHours = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    return lessons.filter(l => {
      const lessonDate = new Date(l.start);
      return lessonDate >= weekStart && lessonDate < weekEnd && l.status === LessonStatus.SCHEDULED;
    }).length;
  }, [lessons]);

  // Boş saat analizi
  const freeHours = totalAvailableHours - bookedHours;

  // Akıllı ders önerileri
  const suggestions = useMemo((): SuggestedLesson[] => {
    const result: SuggestedLesson[] = [];
    
    // Son 30 günde ders almamış öğrenciler
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    students.forEach(student => {
      const studentLessons = lessons.filter(l => l.studentId === student.id);
      const recentLessons = studentLessons.filter(l => new Date(l.start) > thirtyDaysAgo);
      
      if (recentLessons.length === 0 && studentLessons.length > 0) {
        // Bu öğrenciye ders öner
        const lastLesson = studentLessons.sort((a, b) => 
          new Date(b.start).getTime() - new Date(a.start).getTime()
        )[0];
        
        if (lastLesson) {
          const lastDate = new Date(lastLesson.start);
          const dayName = DAYS[(lastDate.getDay() + 6) % 7];
          const hour = lastDate.getHours();
          
          // Aynı gün ve saatte uygunluk var mı kontrol et
          if (isHourSelected(dayName, hour)) {
            result.push({
              studentId: student.id,
              studentName: student.name,
              suggestedDay: DAY_LABELS[dayName],
              suggestedTime: `${hour.toString().padStart(2, '0')}:00`,
              duration: 60,
              reason: 'Son dersten bu yana 30 gün geçti'
            });
          }
        }
      }
      
      // Düzenli ders alan ama bu hafta dersi olmayan öğrenciler
      const thisWeekLessons = studentLessons.filter(l => {
        const date = new Date(l.start);
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() + 1);
        return date >= weekStart;
      });
      
      if (thisWeekLessons.length === 0 && recentLessons.length >= 2) {
        // En sık ders aldığı gün ve saati bul
        const dayCount: Record<string, number> = {};
        studentLessons.forEach(l => {
          const date = new Date(l.start);
          const day = DAYS[(date.getDay() + 6) % 7];
          dayCount[day] = (dayCount[day] || 0) + 1;
        });
        
        const mostFrequentDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0];
        if (mostFrequentDay && !result.find(r => r.studentId === student.id)) {
          result.push({
            studentId: student.id,
            studentName: student.name,
            suggestedDay: DAY_LABELS[mostFrequentDay[0]],
            suggestedTime: '14:00',
            duration: 60,
            reason: 'Bu hafta henüz dersi yok'
          });
        }
      }
    });
    
    return result.slice(0, 5);
  }, [students, lessons, availability]);

  // Öneriyi kabul et ve ders oluştur
  const acceptSuggestion = (suggestion: SuggestedLesson) => {
    const now = new Date();
    const dayIndex = Object.keys(DAY_LABELS).findIndex(k => DAY_LABELS[k] === suggestion.suggestedDay);
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() - now.getDay() + 1 + dayIndex);
    
    const [hours, minutes] = suggestion.suggestedTime.split(':').map(Number);
    targetDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(targetDate);
    endDate.setMinutes(endDate.getMinutes() + suggestion.duration);
    
    const student = students.find(s => s.id === suggestion.studentId);
    if (!student) return;
    
    onCreateLesson({
      teacherId: teacher.id,
      studentId: suggestion.studentId,
      start: targetDate.toISOString(),
      end: endDate.toISOString(),
      status: LessonStatus.SCHEDULED,
      price: student.hourlyRate,
      paid: false
    });
    
    alert(`${suggestion.studentName} için ders oluşturuldu!`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-orange-500" />
            Akıllı Ders Planlama
          </h1>
          <p className="text-slate-500 mt-1">Haftalık uygunluğunuzu belirleyin, size en uygun ders programını oluşturalım</p>
        </div>
        <button
          onClick={saveAvailability}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Check className="w-4 h-4" />
          Kaydet
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 w-10 h-10 rounded-lg flex items-center justify-center text-white">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{totalAvailableHours} saat</p>
              <p className="text-sm text-slate-500">Haftalık Uygunluk</p>
            </div>
          </div>
        </div>
        
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 w-10 h-10 rounded-lg flex items-center justify-center text-white">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{bookedHours} saat</p>
              <p className="text-sm text-slate-500">Dolu (Bu Hafta)</p>
            </div>
          </div>
        </div>
        
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 w-10 h-10 rounded-lg flex items-center justify-center text-white">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{freeHours} saat</p>
              <p className="text-sm text-slate-500">Boş Kapasite</p>
            </div>
          </div>
        </div>
      </div>

      {/* Availability Grid */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="font-bold text-slate-800">Haftalık Uygunluk Takvimi</h2>
          <p className="text-sm text-slate-500">Müsait olduğunuz saatlere tıklayın</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-2 text-left text-sm font-medium text-slate-600 w-20">Saat</th>
                {DAYS.map(day => (
                  <th key={day} className="p-2 text-center text-sm font-medium text-slate-600">
                    {DAY_LABELS[day].slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map(hour => (
                <tr key={hour} className="border-t border-slate-100">
                  <td className="p-2 text-sm text-slate-600">
                    {hour.toString().padStart(2, '0')}:00
                  </td>
                  {DAYS.map(day => {
                    const selected = isHourSelected(day, hour);
                    const booked = isHourBooked(day, hour);
                    
                    return (
                      <td key={`${day}-${hour}`} className="p-1">
                        <button
                          onClick={() => !booked && toggleHour(day, hour)}
                          disabled={booked}
                          className={`w-full h-8 rounded transition-colors ${
                            booked
                              ? 'bg-orange-500 text-white cursor-not-allowed'
                              : selected
                              ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                              : 'bg-slate-100 hover:bg-slate-200'
                          }`}
                          title={booked ? 'Ders var' : selected ? 'Müsait' : 'Müsait değil'}
                        >
                          {booked && <Calendar className="w-4 h-4 mx-auto" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-500"></div>
            <span className="text-slate-600">Müsait</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-500"></div>
            <span className="text-slate-600">Ders Var</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-slate-100"></div>
            <span className="text-slate-600">Müsait Değil</span>
          </div>
        </div>
      </div>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <h2 className="font-bold">Akıllı Ders Önerileri</h2>
            </div>
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="text-purple-200 hover:text-white transition-colors"
            >
              {showSuggestions ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
          
          {showSuggestions && (
            <div className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <div key={index} className="bg-white/10 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{suggestion.studentName}</p>
                    <p className="text-sm text-purple-200">
                      {suggestion.suggestedDay} {suggestion.suggestedTime} • {suggestion.reason}
                    </p>
                  </div>
                  <button
                    onClick={() => acceptSuggestion(suggestion)}
                    className="flex items-center gap-1 bg-white text-purple-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-purple-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Oluştur
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {!showSuggestions && (
            <p className="text-purple-200 text-sm">{suggestions.length} öneri mevcut - görmek için tıklayın</p>
          )}
        </div>
      )}

      {/* Tips */}
      <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-amber-800">İpuçları</h3>
            <ul className="text-sm text-amber-700 mt-1 space-y-1">
              <li>• Ardışık saatleri seçerek uzun ders blokları oluşturabilirsiniz</li>
              <li>• Sistem, öğrenci alışkanlıklarına göre en uygun saatleri önerir</li>
              <li>• Boş kapasitenizi düzenli kontrol ederek gelir potansiyelinizi artırın</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
