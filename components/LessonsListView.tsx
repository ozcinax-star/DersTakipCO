import React, { useState } from 'react';
import { Lesson, Student, LessonStatus } from '../types';
import { dbService } from '../services/db';
import { Trash2, Check, Clock, XCircle, Filter, Search, ChevronDown } from 'lucide-react';

interface LessonsListViewProps {
  lessons: Lesson[];
  students: Student[];
  onUpdate: () => void;
}

export const LessonsListView: React.FC<LessonsListViewProps> = ({ lessons, students, onUpdate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LessonStatus | 'ALL'>('ALL');
  const [selectedLessons, setSelectedLessons] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | string[] | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const getStudentName = (studentId: string) => {
    return students.find(s => s.id === studentId)?.name || 'Bilinmeyen';
  };

  const getStudentColor = (studentId: string) => {
    return students.find(s => s.id === studentId)?.color || '#6b7280';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  // Filter and sort lessons
  const normalizedQuery = searchQuery.toLocaleLowerCase('tr-TR');
  const filteredLessons = lessons
    .filter(lesson => {
      const matchesSearch = getStudentName(lesson.studentId)
        .toLocaleLowerCase('tr-TR')
        .includes(normalizedQuery);
      const matchesStatus = statusFilter === 'ALL' || lesson.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());

  // Arama/filtre ile gizlenen dersler toplu silmeye dahil edilmesin
  const visibleSelectedIds = filteredLessons
    .filter(l => selectedLessons.has(l.id))
    .map(l => l.id);

  const toggleSelect = (lessonId: string) => {
    const newSelected = new Set(selectedLessons);
    if (newSelected.has(lessonId)) {
      newSelected.delete(lessonId);
    } else {
      newSelected.add(lessonId);
    }
    setSelectedLessons(newSelected);
  };

  const toggleSelectAll = () => {
    if (visibleSelectedIds.length === filteredLessons.length) {
      setSelectedLessons(new Set());
    } else {
      setSelectedLessons(new Set(filteredLessons.map(l => l.id)));
    }
  };

  const updateLessonStatus = (lessonId: string, status: LessonStatus) => {
    dbService.updateLesson(lessonId, { status });
    onUpdate();
  };

  const togglePaid = (lessonId: string, currentPaid: boolean) => {
    dbService.updateLesson(lessonId, { paid: !currentPaid });
    onUpdate();
  };

  // FIXED: Actually delete lesson(s)
  const handleDelete = (lessonIds: string | string[]) => {
    if (Array.isArray(lessonIds)) {
      dbService.deleteLessons(lessonIds);
      setSelectedLessons(new Set());
    } else {
      dbService.deleteLesson(lessonIds);
    }
    setDeleteConfirm(null);
    onUpdate();
  };

  const getStatusBadge = (status: LessonStatus) => {
    switch (status) {
      case LessonStatus.COMPLETED:
        return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">Tamamlandı</span>;
      case LessonStatus.CANCELLED:
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">İptal</span>;
      default:
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Planlandı</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ders Listesi</h1>
          <p className="text-slate-500">Toplam {lessons.length} ders</p>
        </div>
        {visibleSelectedIds.length > 0 && (
          <button
            onClick={() => setDeleteConfirm(visibleSelectedIds)}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Seçilenleri Sil ({visibleSelectedIds.length})
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Öğrenci ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <Filter className="w-4 h-4" />
            <span>Filtre</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          {showFilters && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
              <div className="p-2 space-y-1">
                {[
                  { value: 'ALL', label: 'Tümü' },
                  { value: LessonStatus.SCHEDULED, label: 'Planlandı' },
                  { value: LessonStatus.COMPLETED, label: 'Tamamlandı' },
                  { value: LessonStatus.CANCELLED, label: 'İptal' },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => { setStatusFilter(option.value as any); setShowFilters(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                      statusFilter === option.value 
                        ? 'bg-orange-50 text-orange-700' 
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lessons Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={visibleSelectedIds.length === filteredLessons.length && filteredLessons.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Öğrenci</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Tarih</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Saat</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Durum</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Ücret</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Ödeme</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLessons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    {searchQuery || statusFilter !== 'ALL' 
                      ? 'Filtreye uygun ders bulunamadı' 
                      : 'Henüz ders eklenmemiş'}
                  </td>
                </tr>
              ) : (
                filteredLessons.map(lesson => (
                  <tr key={lesson.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedLessons.has(lesson.id)}
                        onChange={() => toggleSelect(lesson.id)}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                          style={{ backgroundColor: getStudentColor(lesson.studentId) }}
                        >
                          {getStudentName(lesson.studentId).charAt(0)}
                        </div>
                        <span className="font-medium text-slate-800">{getStudentName(lesson.studentId)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatDate(lesson.start)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {formatTime(lesson.start)} - {formatTime(lesson.end)}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(lesson.status)}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">₺{(lesson.price || 0).toLocaleString('tr-TR')}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => togglePaid(lesson.id, lesson.paid)}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          lesson.paid 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {lesson.paid ? 'Ödendi' : 'Bekliyor'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => updateLessonStatus(lesson.id, LessonStatus.SCHEDULED)}
                          title="Planlandı"
                          className={`p-1.5 rounded ${
                            lesson.status === LessonStatus.SCHEDULED 
                              ? 'bg-blue-100 text-blue-600' 
                              : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                          }`}
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updateLessonStatus(lesson.id, LessonStatus.COMPLETED)}
                          title="Tamamlandı"
                          className={`p-1.5 rounded ${
                            lesson.status === LessonStatus.COMPLETED 
                              ? 'bg-emerald-100 text-emerald-600' 
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updateLessonStatus(lesson.id, LessonStatus.CANCELLED)}
                          title="İptal"
                          className={`p-1.5 rounded ${
                            lesson.status === LessonStatus.CANCELLED 
                              ? 'bg-red-100 text-red-600' 
                              : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(lesson.id)}
                          title="Sil"
                          className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              {Array.isArray(deleteConfirm) ? 'Seçili Dersleri Sil' : 'Dersi Sil'}
            </h3>
            <p className="text-slate-600 mb-6">
              {Array.isArray(deleteConfirm) 
                ? `${deleteConfirm.length} ders silinecek. Bu işlem geri alınamaz.`
                : 'Bu dersi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.'
              }
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium"
              >
                İptal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
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
