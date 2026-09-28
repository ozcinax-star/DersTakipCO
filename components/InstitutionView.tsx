import React, { useState, useMemo } from 'react';
import { Teacher, Student, Lesson, Institution, LessonStatus } from '../types';
import { dbService } from '../services/db';
import { getMonthStart, getNextMonthStart } from './dateUtils';
import { Building2, Users, UserPlus, Edit2, Trash2, X, CheckCircle, AlertCircle, TrendingUp, Calendar, DollarSign, Search, Crown } from 'lucide-react';

interface InstitutionViewProps {
  currentTeacher: Teacher;
  teachers: Teacher[];
  students: Student[];
  lessons: Lesson[];
  onUpdate: () => void;
  onSwitchTeacher: (teacher: Teacher) => void;
}

export const InstitutionView: React.FC<InstitutionViewProps> = ({
  currentTeacher,
  teachers,
  students,
  lessons,
  onUpdate,
  onSwitchTeacher
}) => {
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherSubject, setNewTeacherSubject] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Teacher | null>(null);

  // Öğretmen istatistikleri
  const teacherStats = useMemo(() => {
    const startOfMonth = getMonthStart();
    const startOfNextMonth = getNextMonthStart();
    return teachers.map(teacher => {
      const teacherStudents = students.filter(s => s.teacherId === teacher.id);
      const teacherLessons = lessons.filter(l => l.teacherId === teacher.id);
      const completedLessons = teacherLessons.filter(l => l.status === LessonStatus.COMPLETED);
      const monthlyLessons = completedLessons.filter(l => {
        const date = new Date(l.start);
        return date >= startOfMonth && date < startOfNextMonth;
      });
      const monthlyEarnings = monthlyLessons.reduce((sum, l) => sum + l.price, 0);
      const totalEarnings = completedLessons.reduce((sum, l) => sum + l.price, 0);

      return {
        teacher,
        studentCount: teacherStudents.length,
        totalLessons: teacherLessons.length,
        completedLessons: completedLessons.length,
        monthlyEarnings,
        totalEarnings,
        isAdmin: teacher.role === 'admin' || teacher.id === currentTeacher.id
      };
    });
  }, [teachers, students, lessons, currentTeacher]);

  // Genel istatistikler — öğretmen satırlarının toplamı. Hiçbir öğretmene bağlı
  // olmayan (silinmiş öğretmenden kalan) kayıtlar sayılmaz, böylece toplamlar
  // satırlarla her zaman tutarlıdır.
  const overallStats = useMemo(() => {
    return teacherStats.reduce(
      (acc, stat) => ({
        ...acc,
        totalStudents: acc.totalStudents + stat.studentCount,
        totalLessons: acc.totalLessons + stat.totalLessons,
        totalEarnings: acc.totalEarnings + stat.totalEarnings,
        monthlyEarnings: acc.monthlyEarnings + stat.monthlyEarnings
      }),
      { totalTeachers: teachers.length, totalStudents: 0, totalLessons: 0, totalEarnings: 0, monthlyEarnings: 0 }
    );
  }, [teacherStats, teachers]);

  // Yeni öğretmen ekle
  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim() || !newTeacherSubject.trim()) return;

    dbService.createTeacher(newTeacherName, newTeacherSubject);
    setNewTeacherName('');
    setNewTeacherSubject('');
    setShowAddTeacher(false);
    onUpdate();
  };

  // Öğretmen sil
  const handleDeleteTeacher = () => {
    if (!deleteConfirm) return;
    
    // Mevcut öğretmeni silemezsin
    if (deleteConfirm.id === currentTeacher.id) {
      alert('Şu an aktif olan öğretmeni silemezsiniz!');
      setDeleteConfirm(null);
      return;
    }

    dbService.deleteTeacher(deleteConfirm.id);
    setDeleteConfirm(null);
    onUpdate();
  };

  // Öğretmenin silinebilir olup olmadığını kontrol et
  const canDeleteTeacher = (teacherId: string): boolean => {
    return teacherId !== currentTeacher.id;
  };

  // Filtrelenmiş öğretmenler
  const normalizedQuery = searchQuery.toLocaleLowerCase('tr-TR');
  const filteredStats = teacherStats.filter(stat =>
    stat.teacher.name.toLocaleLowerCase('tr-TR').includes(normalizedQuery) ||
    (stat.teacher.subject || '').toLocaleLowerCase('tr-TR').includes(normalizedQuery)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-orange-500" />
            Kurum Yönetimi
          </h1>
          <p className="text-slate-500 mt-1">Tüm öğretmen ve öğrencileri tek panelden yönetin</p>
        </div>
        <button
          onClick={() => setShowAddTeacher(true)}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Öğretmen Ekle
        </button>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 w-10 h-10 rounded-lg flex items-center justify-center text-white">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{overallStats.totalTeachers}</p>
              <p className="text-sm text-slate-500">Öğretmen</p>
            </div>
          </div>
        </div>
        
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 w-10 h-10 rounded-lg flex items-center justify-center text-white">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{overallStats.totalStudents}</p>
              <p className="text-sm text-slate-500">Öğrenci</p>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
          <div className="flex items-center gap-3">
            <div className="bg-purple-500 w-10 h-10 rounded-lg flex items-center justify-center text-white">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{overallStats.totalLessons}</p>
              <p className="text-sm text-slate-500">Toplam Ders</p>
            </div>
          </div>
        </div>
        
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 w-10 h-10 rounded-lg flex items-center justify-center text-white">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">₺{overallStats.monthlyEarnings.toLocaleString('tr-TR')}</p>
              <p className="text-sm text-slate-500">Bu Ay</p>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-slate-500 w-10 h-10 rounded-lg flex items-center justify-center text-white">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">₺{overallStats.totalEarnings.toLocaleString('tr-TR')}</p>
              <p className="text-sm text-slate-500">Toplam Kazanç</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Öğretmen ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
        />
      </div>

      {/* Teachers List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="font-bold text-slate-800">Öğretmenler</h2>
        </div>
        
        <div className="divide-y divide-slate-100">
          {filteredStats.map(({ teacher, studentCount, totalLessons, monthlyEarnings }) => (
            <div 
              key={teacher.id}
              className={`p-4 hover:bg-slate-50 transition-colors ${
                teacher.id === currentTeacher.id ? 'bg-orange-50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg">
                    {teacher.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800">{teacher.name}</h3>
                      {teacher.id === currentTeacher.id && (
                        <span className="flex items-center gap-1 text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                          <Crown className="w-3 h-3" />
                          Siz
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">{teacher.subject}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center hidden md:block">
                    <p className="text-lg font-bold text-slate-800">{studentCount}</p>
                    <p className="text-xs text-slate-500">Öğrenci</p>
                  </div>
                  <div className="text-center hidden md:block">
                    <p className="text-lg font-bold text-slate-800">{totalLessons}</p>
                    <p className="text-xs text-slate-500">Ders</p>
                  </div>
                  <div className="text-center hidden md:block">
                    <p className="text-lg font-bold text-orange-600">₺{monthlyEarnings.toLocaleString('tr-TR')}</p>
                    <p className="text-xs text-slate-500">Bu Ay</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {teacher.id !== currentTeacher.id && (
                      <>
                        <button
                          onClick={() => onSwitchTeacher(teacher)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors"
                        >
                          Geçiş Yap
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(teacher)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Öğretmeni Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile Stats */}
              <div className="md:hidden mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="font-bold text-slate-800">{studentCount}</p>
                  <p className="text-xs text-slate-500">Öğrenci</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="font-bold text-slate-800">{totalLessons}</p>
                  <p className="text-xs text-slate-500">Ders</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-2">
                  <p className="font-bold text-orange-600">₺{monthlyEarnings.toLocaleString('tr-TR')}</p>
                  <p className="text-xs text-slate-500">Bu Ay</p>
                </div>
              </div>
            </div>
          ))}

          {filteredStats.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              {searchQuery ? 'Aramayla eşleşen öğretmen bulunamadı' : 'Henüz öğretmen eklenmemiş'}
            </div>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800">Kurum Modu Hakkında</h3>
            <ul className="text-sm text-blue-700 mt-1 space-y-1">
              <li>• Her öğretmen kendi öğrenci ve derslerini bağımsız yönetir</li>
              <li>• Bu panelden tüm öğretmenlerin istatistiklerini görüntüleyebilirsiniz</li>
              <li>• "Geçiş Yap" ile başka bir öğretmenin profiline geçebilirsiniz</li>
              <li>• Toplam istatistikler tüm öğretmenlerin verilerini içerir</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Add Teacher Modal */}
      {showAddTeacher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Yeni Öğretmen Ekle</h2>
              <button
                onClick={() => setShowAddTeacher(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddTeacher} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Ad Soyad <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Öğretmen adı"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Branş <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={newTeacherSubject}
                  onChange={(e) => setNewTeacherSubject(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Örn: Matematik, İngilizce"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddTeacher(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
                >
                  Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Öğretmeni Sil</h3>
                <p className="text-sm text-slate-500">{deleteConfirm.name}</p>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-700">
                <strong>⚠️ Dikkat:</strong> Bu işlem geri alınamaz!
              </p>
              <ul className="text-sm text-red-600 mt-2 space-y-1">
                <li>• Öğretmenin tüm öğrencileri silinecek</li>
                <li>• Öğretmenin tüm dersleri silinecek</li>
                <li>• Öğretmenin tüm grupları silinecek</li>
              </ul>
            </div>

            {/* Silinecek veri özeti */}
            {(() => {
              const stats = teacherStats.find(s => s.teacher.id === deleteConfirm.id);
              if (!stats) return null;
              return (
                <div className="bg-slate-50 rounded-lg p-3 mb-4">
                  <p className="text-sm font-medium text-slate-700 mb-2">Silinecek Veriler:</p>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <p className="font-bold text-slate-800">{stats.studentCount}</p>
                      <p className="text-xs text-slate-500">Öğrenci</p>
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{stats.totalLessons}</p>
                      <p className="text-xs text-slate-500">Ders</p>
                    </div>
                    <div>
                      <p className="font-bold text-orange-600">₺{stats.totalEarnings.toLocaleString('tr-TR')}</p>
                      <p className="text-xs text-slate-500">Kazanç</p>
                    </div>
                  </div>
                </div>
              );
            })()}
            
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium"
              >
                İptal
              </button>
              <button
                onClick={handleDeleteTeacher}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
