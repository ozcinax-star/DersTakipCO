import React, { useState, useMemo } from 'react';
import { Teacher, Student, Lesson, Group, LessonStatus } from '../types';
import { dbService } from '../services/db';
import { ChevronLeft, ChevronRight, Plus, X, Edit2, Trash2, Check, Clock, XCircle } from 'lucide-react';

interface CalendarViewProps {
  teacher: Teacher;
  lessons: Lesson[];
  students: Student[];
  groups: Group[];
  onUpdate: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ teacher, lessons, students, groups, onUpdate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Get week days
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    return days;
  }, [currentDate]);

  const goToToday = () => setCurrentDate(new Date());
  
  const goToPrevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };
  
  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const getLessonsForDay = (date: Date) => {
    return lessons.filter(lesson => {
      const lessonDate = new Date(lesson.start);
      return lessonDate.toDateString() === date.toDateString();
    }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  };

  const getStudentName = (studentId: string) => {
    return students.find(s => s.id === studentId)?.name || 'Bilinmeyen';
  };

  const getStudentColor = (studentId: string) => {
    return students.find(s => s.id === studentId)?.color || '#6b7280';
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setShowLessonModal(true);
  };

  const updateLessonStatus = (lessonId: string, status: LessonStatus) => {
    dbService.updateLesson(lessonId, { status });
    setShowLessonModal(false);
    setSelectedLesson(null);
    onUpdate();
  };

  const togglePaid = (lessonId: string, currentPaid: boolean) => {
    dbService.updateLesson(lessonId, { paid: !currentPaid });
    onUpdate();
    if (selectedLesson && selectedLesson.id === lessonId) {
      setSelectedLesson({ ...selectedLesson, paid: !currentPaid });
    }
  };

  // FIXED: Actually delete lesson
  const handleDeleteLesson = (lessonId: string) => {
    const success = dbService.deleteLesson(lessonId);
    if (success) {
      setDeleteConfirm(null);
      setShowLessonModal(false);
      setSelectedLesson(null);
      onUpdate();
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const dayNames = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Takvim</h1>
          <p className="text-slate-500">
            {weekDays[0].toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} - {weekDays[6].toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
          >
            Bugün
          </button>
          <div className="flex items-center bg-white border border-slate-200 rounded-lg">
            <button
              onClick={goToPrevWeek}
              className="p-2 hover:bg-slate-50 rounded-l-lg"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <button
              onClick={goToNextWeek}
              className="p-2 hover:bg-slate-50 rounded-r-lg"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-slate-200">
          {weekDays.map((date, i) => (
            <div
              key={i}
              className={`p-3 text-center border-r border-slate-100 last:border-r-0 ${
                isToday(date) ? 'bg-orange-50' : ''
              }`}
            >
              <p className="text-xs text-slate-500 uppercase">{dayNames[i]}</p>
              <p className={`text-lg font-bold ${
                isToday(date) ? 'text-orange-600' : 'text-slate-800'
              }`}>
                {date.getDate()}
              </p>
            </div>
          ))}
        </div>
        
        {/* Day Content */}
        <div className="grid grid-cols-7 min-h-[400px]">
          {weekDays.map((date, i) => {
            const dayLessons = getLessonsForDay(date);
            return (
              <div
                key={i}
                className={`p-2 border-r border-slate-100 last:border-r-0 ${
                  isToday(date) ? 'bg-orange-50/30' : ''
                }`}
              >
                <div className="space-y-2">
                  {dayLessons.map(lesson => (
                    <button
                      key={lesson.id}
                      onClick={() => handleLessonClick(lesson)}
                      className={`w-full text-left p-2 rounded-lg text-xs transition-all hover:scale-[1.02] ${
                        lesson.status === LessonStatus.CANCELLED 
                          ? 'bg-red-100 text-red-700 line-through opacity-60'
                          : lesson.status === LessonStatus.COMPLETED
                          ? 'bg-emerald-100 text-emerald-700'
                          : ''
                      }`}
                      style={lesson.status === LessonStatus.SCHEDULED ? {
                        backgroundColor: `${getStudentColor(lesson.studentId)}20`,
                        borderLeft: `3px solid ${getStudentColor(lesson.studentId)}`
                      } : {}}
                    >
                      <p className="font-medium truncate">{getStudentName(lesson.studentId)}</p>
                      <p className="text-[10px] opacity-70">{formatTime(lesson.start)}</p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-slate-200 border-l-2 border-slate-400"></div>
          <span className="text-slate-600">Planlandı</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-100"></div>
          <span className="text-slate-600">Tamamlandı</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-100"></div>
          <span className="text-slate-600">İptal</span>
        </div>
      </div>

      {/* Lesson Detail Modal */}
      {showLessonModal && selectedLesson && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">Ders Detayı</h2>
              <button
                onClick={() => { setShowLessonModal(false); setSelectedLesson(null); }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: getStudentColor(selectedLesson.studentId) }}
                >
                  {getStudentName(selectedLesson.studentId).charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-slate-800">{getStudentName(selectedLesson.studentId)}</p>
                  <p className="text-sm text-slate-500">
                    {new Date(selectedLesson.start).toLocaleDateString('tr-TR', { 
                      weekday: 'long', day: 'numeric', month: 'long' 
                    })}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-100">
                <div>
                  <p className="text-sm text-slate-500">Saat</p>
                  <p className="font-medium">{formatTime(selectedLesson.start)} - {formatTime(selectedLesson.end)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Ücret</p>
                  <p className="font-medium">₺{selectedLesson.price}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-600">Ödeme Durumu</span>
                <button
                  onClick={() => togglePaid(selectedLesson.id, selectedLesson.paid)}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedLesson.paid 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {selectedLesson.paid ? 'Ödendi ✓' : 'Ödenmedi'}
                </button>
              </div>
              
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-600">Durum</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedLesson.status === LessonStatus.COMPLETED 
                    ? 'bg-emerald-100 text-emerald-700'
                    : selectedLesson.status === LessonStatus.CANCELLED
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {selectedLesson.status === LessonStatus.COMPLETED ? 'Tamamlandı' : 
                   selectedLesson.status === LessonStatus.CANCELLED ? 'İptal Edildi' : 'Planlandı'}
                </span>
              </div>
              
              {selectedLesson.notes && (
                <div className="pt-2">
                  <p className="text-sm text-slate-500 mb-1">Notlar</p>
                  <p className="text-slate-700">{selectedLesson.notes}</p>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="space-y-2 pt-4">
                <p className="text-sm text-slate-500 mb-2">Durumu Değiştir</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => updateLessonStatus(selectedLesson.id, LessonStatus.SCHEDULED)}
                    disabled={selectedLesson.status === LessonStatus.SCHEDULED}
                    className={`flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedLesson.status === LessonStatus.SCHEDULED
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    Plan
                  </button>
                  <button
                    onClick={() => updateLessonStatus(selectedLesson.id, LessonStatus.COMPLETED)}
                    disabled={selectedLesson.status === LessonStatus.COMPLETED}
                    className={`flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedLesson.status === LessonStatus.COMPLETED
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    Tamam
                  </button>
                  <button
                    onClick={() => updateLessonStatus(selectedLesson.id, LessonStatus.CANCELLED)}
                    disabled={selectedLesson.status === LessonStatus.CANCELLED}
                    className={`flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedLesson.status === LessonStatus.CANCELLED
                        ? 'bg-red-100 text-red-700'
                        : 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    İptal
                  </button>
                </div>
              </div>
              
              {/* Delete Button */}
              <button
                onClick={() => setDeleteConfirm(selectedLesson.id)}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Dersi Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Dersi Sil</h3>
            <p className="text-slate-600 mb-6">
              Bu dersi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium"
              >
                İptal
              </button>
              <button
                onClick={() => handleDeleteLesson(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
