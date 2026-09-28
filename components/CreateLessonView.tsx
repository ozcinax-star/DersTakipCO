import React, { useState } from 'react';
import { Teacher, Student, Group, LessonStatus, EducationLevel } from '../types';
import { dbService } from '../services/db';
import { getDefaultPricing } from './SettingsView';
import { User, Users, Calendar, Clock, DollarSign, FileText, Check, Plus, X, Repeat, Settings } from 'lucide-react';

interface CreateLessonViewProps {
  teacher: Teacher;
  students: Student[];
  groups: Group[];
  onUpdate: () => void;
  onClose?: () => void;
}

type LessonType = 'individual' | 'group';

interface RecurringSettings {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'biweekly';
  count: number;
}

export const CreateLessonView: React.FC<CreateLessonViewProps> = ({ 
  teacher, 
  students, 
  groups, 
  onUpdate,
  onClose 
}) => {
  const [lessonType, setLessonType] = useState<LessonType>('individual');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [duration, setDuration] = useState(60);
  const [subject, setSubject] = useState(teacher.subject || '');
  const [notes, setNotes] = useState('');
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [useStudentRate, setUseStudentRate] = useState(true);
  const [recurring, setRecurring] = useState<RecurringSettings>({
    enabled: false,
    frequency: 'weekly',
    count: 4
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);

  // Get default pricing from settings
  const defaultPricing = getDefaultPricing();

  // Get selected student for price calculation
  const selectedStudent = students.find(s => s.id === selectedStudentId);
  
  // Calculate price based on student's education level or custom price
  const getPrice = () => {
    // If custom price is set and enabled
    if (!useStudentRate && customPrice !== null) {
      return customPrice;
    }
    
    // If a student is selected
    if (selectedStudent) {
      // Use student's hourly rate
      return Math.round(selectedStudent.hourlyRate * (duration / 60));
    }
    
    // Use default rate from settings
    return Math.round(defaultPricing.defaultRate * (duration / 60));
  };

  // Get price label text
  const getPriceLabel = () => {
    if (!useStudentRate && customPrice !== null) {
      return 'Özel Ücret';
    }
    if (selectedStudent) {
      return `${selectedStudent.name} - ₺${selectedStudent.hourlyRate}/saat`;
    }
    return `Varsayılan - ₺${defaultPricing.defaultRate}/saat`;
  };

  // Get students from selected group
  const groupStudents = selectedGroupId 
    ? students.filter(s => {
        const group = groups.find(g => g.id === selectedGroupId);
        return group?.studentIds.includes(s.id);
      })
    : [];

  // Toggle student selection for group lessons
  const toggleStudentForGroup = (studentId: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Calculate end time
  const getEndTime = () => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    startDate.setMinutes(startDate.getMinutes() + duration);
    return startDate.toTimeString().slice(0, 5);
  };

  // Get dates for recurring lessons
  const getRecurringDates = (): Date[] => {
    const dates: Date[] = [];
    const baseDate = new Date(date);
    
    for (let i = 0; i < recurring.count; i++) {
      const newDate = new Date(baseDate);
      switch (recurring.frequency) {
        case 'daily':
          newDate.setDate(baseDate.getDate() + i);
          break;
        case 'weekly':
          newDate.setDate(baseDate.getDate() + (i * 7));
          break;
        case 'biweekly':
          newDate.setDate(baseDate.getDate() + (i * 14));
          break;
      }
      dates.push(newDate);
    }
    
    return dates;
  };

  // Create lesson(s)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let studentsToCreate: string[] = [];
    
    if (lessonType === 'individual') {
      if (!selectedStudentId) return;
      studentsToCreate = [selectedStudentId];
    } else {
      if (selectedStudentIds.length === 0) return;
      studentsToCreate = selectedStudentIds;
    }
    
    const dates = recurring.enabled ? getRecurringDates() : [new Date(date)];
    let totalCreated = 0;
    
    dates.forEach(lessonDate => {
      studentsToCreate.forEach(studentId => {
        const student = students.find(s => s.id === studentId);
        const price = useStudentRate && student 
          ? Math.round(student.hourlyRate * (duration / 60))
          : (customPrice || 500);
        
        const [hours, minutes] = startTime.split(':').map(Number);
        const start = new Date(lessonDate);
        start.setHours(hours, minutes, 0, 0);
        
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + duration);
        
        dbService.createLesson(teacher.id, {
          studentId,
          start: start.toISOString(),
          end: end.toISOString(),
          status: LessonStatus.SCHEDULED,
          subject,
          notes,
          price,
          paid: false
        });
        
        totalCreated++;
      });
    });
    
    setCreatedCount(totalCreated);
    setShowSuccess(true);
    onUpdate();
    
    // Reset form after success
    setTimeout(() => {
      setShowSuccess(false);
      setSelectedStudentId('');
      setSelectedStudentIds([]);
      setNotes('');
      setRecurring({ enabled: false, frequency: 'weekly', count: 4 });
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ders Oluştur</h1>
          <p className="text-slate-500">Bireysel veya grup dersi ekleyin</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
            <Check className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-medium text-emerald-800">{createdCount} ders başarıyla oluşturuldu!</p>
            <p className="text-sm text-emerald-600">Dersler takviminize eklendi.</p>
          </div>
        </div>
      )}

      {/* Lesson Type Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-sm font-medium text-slate-700 mb-3">Ders Türü</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => { setLessonType('individual'); setSelectedStudentIds([]); }}
            className={`flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
              lessonType === 'individual'
                ? 'border-orange-500 bg-orange-50 text-orange-700'
                : 'border-slate-200 hover:border-slate-300 text-slate-600'
            }`}
          >
            <User className="w-5 h-5" />
            <div className="text-left">
              <p className="font-medium">Bireysel Ders</p>
              <p className="text-xs opacity-70">Tek öğrenci</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => { setLessonType('group'); setSelectedStudentId(''); }}
            className={`flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
              lessonType === 'group'
                ? 'border-orange-500 bg-orange-50 text-orange-700'
                : 'border-slate-200 hover:border-slate-300 text-slate-600'
            }`}
          >
            <Users className="w-5 h-5" />
            <div className="text-left">
              <p className="font-medium">Grup Dersi</p>
              <p className="text-xs opacity-70">Birden fazla öğrenci</p>
            </div>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Student Selection */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            {lessonType === 'individual' ? <User className="w-5 h-5 text-orange-500" /> : <Users className="w-5 h-5 text-orange-500" />}
            {lessonType === 'individual' ? 'Öğrenci Seç' : 'Öğrencileri Seç'}
          </h2>
          
          {lessonType === 'individual' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {students.length === 0 ? (
                <p className="col-span-full text-slate-400 text-center py-4">
                  Henüz öğrenci eklenmemiş
                </p>
              ) : (
                students.map(student => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => setSelectedStudentId(student.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                      selectedStudentId === student.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: student.color }}
                    >
                      {student.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 truncate">{student.name}</p>
                      <p className="text-xs text-slate-500">₺{student.hourlyRate}/saat</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Group selector (optional) */}
              {groups.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Gruptan Seç (Opsiyonel)
                  </label>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => {
                      setSelectedGroupId(e.target.value);
                      if (e.target.value) {
                        const group = groups.find(g => g.id === e.target.value);
                        setSelectedStudentIds(group?.studentIds || []);
                      }
                    }}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  >
                    <option value="">Grup seçmeden devam et</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Student multi-select */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {students.length === 0 ? (
                  <p className="col-span-full text-slate-400 text-center py-4">
                    Henüz öğrenci eklenmemiş
                  </p>
                ) : (
                  students.map(student => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => toggleStudentForGroup(student.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                        selectedStudentIds.includes(student.id)
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="relative">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: student.color }}
                        >
                          {student.name.charAt(0)}
                        </div>
                        {selectedStudentIds.includes(student.id) && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 truncate">{student.name}</p>
                        <p className="text-xs text-slate-500">₺{student.hourlyRate}/saat</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
              
              {selectedStudentIds.length > 0 && (
                <p className="text-sm text-orange-600 font-medium">
                  {selectedStudentIds.length} öğrenci seçildi
                </p>
              )}
            </div>
          )}
        </div>

        {/* Date & Time */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-500" />
            Tarih ve Saat
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tarih</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Başlangıç Saati</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Süre (dakika)</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              >
                <option value={30}>30 dakika</option>
                <option value={45}>45 dakika</option>
                <option value={60}>60 dakika (1 saat)</option>
                <option value={90}>90 dakika (1.5 saat)</option>
                <option value={120}>120 dakika (2 saat)</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
            <Clock className="w-4 h-4" />
            Ders saati: {startTime} - {getEndTime()}
          </div>
        </div>

        {/* Recurring Lessons */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Repeat className="w-5 h-5 text-orange-500" />
              Tekrarlayan Ders
            </h2>
            <button
              type="button"
              onClick={() => setRecurring(prev => ({ ...prev, enabled: !prev.enabled }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                recurring.enabled ? 'bg-orange-500' : 'bg-slate-200'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                recurring.enabled ? 'left-7' : 'left-1'
              }`} />
            </button>
          </div>
          
          {recurring.enabled && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sıklık</label>
                <select
                  value={recurring.frequency}
                  onChange={(e) => setRecurring(prev => ({ ...prev, frequency: e.target.value as any }))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="daily">Her gün</option>
                  <option value="weekly">Haftada bir</option>
                  <option value="biweekly">İki haftada bir</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tekrar Sayısı</label>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={recurring.count}
                  onChange={(e) => setRecurring(prev => ({ ...prev, count: Number(e.target.value) }))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div className="col-span-2 text-sm text-orange-600 bg-orange-50 px-3 py-2 rounded-lg">
                {lessonType === 'individual' 
                  ? `${recurring.count} ders oluşturulacak`
                  : `${recurring.count * selectedStudentIds.length} ders oluşturulacak (${selectedStudentIds.length} öğrenci × ${recurring.count} tekrar)`
                }
              </div>
            </div>
          )}
        </div>

        {/* Price & Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-orange-500" />
            Ücret ve Detaylar
          </h2>
          
          <div className="space-y-4">
            {/* Price Mode Selection */}
            <div className="flex flex-col sm:flex-row gap-3">
              <label className={`flex-1 flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                useStudentRate 
                  ? 'border-orange-500 bg-orange-50' 
                  : 'border-slate-200 hover:border-slate-300'
              }`}>
                <input
                  type="radio"
                  checked={useStudentRate}
                  onChange={() => setUseStudentRate(true)}
                  className="text-orange-500 focus:ring-orange-500"
                />
                <div>
                  <span className="text-sm font-medium text-slate-700">Otomatik Ücret</span>
                  <p className="text-xs text-slate-500">Öğrenci veya varsayılan ücret</p>
                </div>
              </label>
              <label className={`flex-1 flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                !useStudentRate 
                  ? 'border-orange-500 bg-orange-50' 
                  : 'border-slate-200 hover:border-slate-300'
              }`}>
                <input
                  type="radio"
                  checked={!useStudentRate}
                  onChange={() => setUseStudentRate(false)}
                  className="text-orange-500 focus:ring-orange-500"
                />
                <div>
                  <span className="text-sm font-medium text-slate-700">Özel Ücret</span>
                  <p className="text-xs text-slate-500">Bu ders için farklı ücret</p>
                </div>
              </label>
            </div>
            
            {/* Custom Price Input */}
            {!useStudentRate && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-amber-800 mb-2">
                  Bu Ders İçin Özel Ücret (₺)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₺</span>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={customPrice || ''}
                    onChange={(e) => setCustomPrice(Number(e.target.value))}
                    placeholder={`Varsayılan: ${defaultPricing.defaultRate}`}
                    className="w-full pl-8 pr-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <p className="text-xs text-amber-600 mt-2">
                  💡 Bu ücret sadece bu ders için geçerlidir
                </p>
              </div>
            )}
            
            {/* Price Display */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">{getPriceLabel()}</p>
                  <p className="text-xs text-orange-200 mt-1">
                    {duration} dakika • {date}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">₺{getPrice()}</p>
                </div>
              </div>
            </div>
            
            {/* Settings Hint */}
            {useStudentRate && !selectedStudent && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Settings className="w-3 h-3" />
                Varsayılan ücretleri <span className="text-orange-600 font-medium">Ayarlar</span> sayfasından değiştirebilirsiniz
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ders Konusu</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Örn: Piyano Dersi"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notlar (Opsiyonel)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ders hakkında notlar..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={(lessonType === 'individual' && !selectedStudentId) || (lessonType === 'group' && selectedStudentIds.length === 0)}
          className="w-full py-4 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Ders Oluştur
        </button>
      </form>
    </div>
  );
};
