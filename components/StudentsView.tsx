import React, { useState } from 'react';
import { Teacher, Student, Group, Lesson, EducationLevel, EducationLevelLabels, EducationLevelDefaults } from '../types';
import { dbService } from '../services/db';
import { getDefaultPricing } from './SettingsView';
import { StudentCard } from './StudentCard';
import { ParentCard } from './ParentCard';
import { Plus, Edit2, Trash2, X, Users, Phone, User, FileText, Search, GraduationCap, Sparkles, Eye, Image } from 'lucide-react';

interface StudentsViewProps {
  teacher: Teacher;
  students: Student[];
  groups: Group[];
  lessons: Lesson[];
  onUpdate: () => void;
}

const STUDENT_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e'
];

export const StudentsView: React.FC<StudentsViewProps> = ({ teacher, students, groups, lessons, onUpdate }) => {
  const [showForm, setShowForm] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  // StudentCard ve Veli Kartı state
  const [selectedStudentForCard, setSelectedStudentForCard] = useState<Student | null>(null);
  const [selectedStudentForQR, setSelectedStudentForQR] = useState<Student | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    educationLevel: '' as EducationLevel | '',
    gradeLevel: '',
    parentName: '',
    contactNumber: '',
    notes: '',
    hourlyRate: 500,
    color: STUDENT_COLORS[0],
  });

  const resetForm = () => {
    setFormData({
      name: '',
      educationLevel: '',
      gradeLevel: '',
      parentName: '',
      contactNumber: '',
      notes: '',
      hourlyRate: 500,
      color: STUDENT_COLORS[Math.floor(Math.random() * STUDENT_COLORS.length)],
    });
    setEditingStudent(null);
    setShowForm(false);
    setShowTemplateSelector(false);
  };

  // Get default pricing from settings
  const defaultPricing = getDefaultPricing();

  // Şablon seçildiğinde varsayılan değerleri doldur (ayarlardan gelen ücretleri kullan)
  const applyTemplate = (level: EducationLevel) => {
    // Ayarlardan gelen ücreti kullan
    const priceFromSettings = defaultPricing[level] || EducationLevelDefaults[level].hourlyRate;
    
    setFormData(prev => ({
      ...prev,
      educationLevel: level,
      gradeLevel: EducationLevelLabels[level],
      hourlyRate: priceFromSettings,
    }));
    setShowTemplateSelector(false);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingStudent) {
      dbService.updateStudent(editingStudent.id, formData);
    } else {
      dbService.createStudent(teacher.id, formData);
    }
    
    resetForm();
    onUpdate();
  };

  const handleEdit = (student: Student) => {
    setFormData({
      name: student.name,
      educationLevel: student.educationLevel || '',
      gradeLevel: student.gradeLevel || '',
      parentName: student.parentName || '',
      contactNumber: student.contactNumber || '',
      notes: student.notes || '',
      hourlyRate: student.hourlyRate,
      color: student.color,
    });
    setEditingStudent(student);
    setShowForm(true);
  };

  // FIXED: Actually delete student from database
  const handleDelete = (studentId: string) => {
    const success = dbService.deleteStudent(studentId);
    if (success) {
      setDeleteConfirm(null);
      onUpdate(); // Refresh data from database
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.gradeLevel?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Öğrenciler</h1>
          <p className="text-slate-500">Toplam {students.length} öğrenci</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplateSelector(true)}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Şablondan Ekle
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            Yeni Öğrenci
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Öğrenci ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
        />
      </div>

      {/* Students Grid */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">
            {searchQuery ? 'Aramanızla eşleşen öğrenci bulunamadı' : 'Henüz öğrenci eklenmemiş'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-orange-600 hover:text-orange-700 font-medium"
            >
              İlk öğrencinizi ekleyin
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map(student => (
            <div 
              key={student.id}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: student.color }}
                  >
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{student.name}</h3>
                    {student.gradeLevel && (
                      <p className="text-sm text-slate-500">{student.gradeLevel}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setSelectedStudentForCard(student)}
                    className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                    title="Öğrenci Kartı"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedStudentForQR(student)}
                    className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Veli Kartı Oluştur"
                  >
                    <Image className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(student)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Düzenle"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(student.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                {student.parentName && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <User className="w-4 h-4 text-slate-400" />
                    {student.parentName}
                  </div>
                )}
                {student.contactNumber && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {student.contactNumber}
                  </div>
                )}
                {student.notes && (
                  <div className="flex items-start gap-2 text-slate-600">
                    <FileText className="w-4 h-4 text-slate-400 mt-0.5" />
                    <span className="line-clamp-2">{student.notes}</span>
                  </div>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-sm text-slate-500">Ders Ücreti</span>
                <span className="font-bold text-orange-600">₺{student.hourlyRate}/saat</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Öğrenciyi Sil</h3>
            <p className="text-slate-600 mb-6">
              Bu öğrenciyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve öğrenciye ait tüm dersler de silinecektir.
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

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                {editingStudent ? 'Öğrenci Düzenle' : 'Yeni Öğrenci'}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Ad Soyad <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Öğrenci adı"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Sınıf / Seviye
                  </label>
                  <input
                    value={formData.gradeLevel}
                    onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="Örn: 6. Sınıf"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Ders Ücreti (₺/saat)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Veli Adı
                </label>
                <input
                  value={formData.parentName}
                  onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Veli adı"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Telefon
                </label>
                <input
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="0532 123 4567"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notlar
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                  placeholder="Öğrenci hakkında notlar..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Renk
                </label>
                <div className="flex flex-wrap gap-2">
                  {STUDENT_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        formData.color === color ? 'scale-125 ring-2 ring-offset-2 ring-slate-400' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
                >
                  {editingStudent ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Education Level Template Selector Modal */}
      {showTemplateSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Eğitim Seviyesi Seçin</h2>
                <p className="text-sm text-slate-500 mt-1">Şablon seçerek hızlıca öğrenci ekleyin</p>
              </div>
              <button
                onClick={() => setShowTemplateSelector(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.values(EducationLevel).map((level) => {
                const defaults = EducationLevelDefaults[level];
                const priceFromSettings = defaultPricing[level] || defaults.hourlyRate;
                const icons: Record<EducationLevel, string> = {
                  [EducationLevel.ELEMENTARY]: '🎒',
                  [EducationLevel.MIDDLE_SCHOOL]: '📚',
                  [EducationLevel.HIGH_SCHOOL]: '🎓',
                  [EducationLevel.UNIVERSITY]: 'ðŸ›ï¸',
                  [EducationLevel.ADULT]: '💼',
                };
                const colors: Record<EducationLevel, string> = {
                  [EducationLevel.ELEMENTARY]: 'bg-pink-50 border-pink-200 hover:border-pink-400',
                  [EducationLevel.MIDDLE_SCHOOL]: 'bg-blue-50 border-blue-200 hover:border-blue-400',
                  [EducationLevel.HIGH_SCHOOL]: 'bg-purple-50 border-purple-200 hover:border-purple-400',
                  [EducationLevel.UNIVERSITY]: 'bg-emerald-50 border-emerald-200 hover:border-emerald-400',
                  [EducationLevel.ADULT]: 'bg-orange-50 border-orange-200 hover:border-orange-400',
                };
                
                return (
                  <button
                    key={level}
                    onClick={() => applyTemplate(level)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${colors[level]}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{icons[level]}</span>
                      <div>
                        <h3 className="font-bold text-slate-800">{EducationLevelLabels[level]}</h3>
                        <p className="text-sm text-slate-500">
                          <span className="font-medium text-orange-600">₺{priceFromSettings}</span>/saat
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {defaults.subjects.slice(0, 4).map((subject, i) => (
                        <span key={i} className="text-xs bg-white/80 px-2 py-0.5 rounded-full text-slate-600">
                          {subject}
                        </span>
                      ))}
                      {defaults.subjects.length > 4 && (
                        <span className="text-xs text-slate-400">+{defaults.subjects.length - 4}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700">
                💡 Ücretleri <span className="font-medium">Ayarlar → Varsayılan Ders Ücretleri</span> bölümünden değiştirebilirsiniz.
              </p>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-200">
              <button
                onClick={() => { setShowTemplateSelector(false); setShowForm(true); }}
                className="w-full py-3 text-slate-600 hover:text-slate-800 font-medium"
              >
                Şablonsuz devam et →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Card Modal */}
      {selectedStudentForCard && (
        <StudentCard
          student={selectedStudentForCard}
          lessons={lessons}
          onClose={() => setSelectedStudentForCard(null)}
          onShowQR={() => {
            setSelectedStudentForQR(selectedStudentForCard);
            setSelectedStudentForCard(null);
          }}
        />
      )}

      {/* Parent Card Modal */}
      {selectedStudentForQR && (
        <ParentCard
          student={selectedStudentForQR}
          lessons={lessons}
          teacherName={teacher.name}
          onClose={() => setSelectedStudentForQR(null)}
        />
      )}
    </div>
  );
};
