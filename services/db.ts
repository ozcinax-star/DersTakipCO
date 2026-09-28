import { Teacher, Student, Lesson, Group, ReportTemplate, LessonStatus, BackupData, FullBackupData } from '../types';

// Anahtar adları eski (Mağaza v2.x) sürümle aynı kalmalı: aktarım ve eski yedekler bunlara dayanıyor
export const STORAGE_KEYS = {
  TEACHERS: 'derstakipco_teachers',
  STUDENTS: 'derstakipco_students',
  LESSONS: 'derstakipco_lessons',
  GROUPS: 'derstakipco_groups',
  TEMPLATES: 'derstakipco_templates',
};

export const PRICING_STORAGE_KEY = 'derstakipco_default_pricing';
const MIGRATION_KEY = 'derstakipco_migration';

export const APP_DATA_VERSION = '3.0.0';

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

const STUDENT_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e'
];

// Bozuk bir kayıt tüm uygulamayı çökertmesin
const readArray = <T,>(key: string): T[] => {
  const data = localStorage.getItem(key);
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error(`Bozuk kayıt okunamadı: ${key}`);
    return [];
  }
};

const isObjectArray = (value: unknown): value is Record<string, unknown>[] =>
  Array.isArray(value) && value.every(v => v !== null && typeof v === 'object');

export interface MigrationInfo {
  date: string;
  source: string;
  counts: { teachers: number; students: number; lessons: number; groups: number };
  recoveredProfiles?: number;
}

export interface RestoreResult {
  teacherIds: string[];
  teachers: number;
  students: number;
  lessons: number;
  groups: number;
}

class DBService {
  private autoBackupTimer: ReturnType<typeof setTimeout> | null = null;

  // Her kayıttan sonra (birkaç saniye gecikmeyle) Belgeler klasörüne otomatik yedek alınır
  private scheduleAutoBackup(): void {
    if (!window.derstakip?.autoBackup) return;
    if (this.autoBackupTimer) clearTimeout(this.autoBackupTimer);
    this.autoBackupTimer = setTimeout(() => {
      this.autoBackupTimer = null;
      if (this.getTeachers().length === 0) return;
      window.derstakip?.autoBackup(JSON.stringify(this.exportAll(), null, 2)).catch(err => {
        console.error('Otomatik yedek alınamadı', err);
      });
    }, 3000);
  }

  private write(key: string, value: unknown): void {
    localStorage.setItem(key, JSON.stringify(value));
    this.scheduleAutoBackup();
  }

  // ============ TEACHERS ============
  getTeachers(): Teacher[] {
    return readArray<Teacher>(STORAGE_KEYS.TEACHERS);
  }

  saveTeachers(teachers: Teacher[]): void {
    this.write(STORAGE_KEYS.TEACHERS, teachers);
  }

  createTeacher(name: string, subject: string): Teacher {
    const teachers = this.getTeachers();
    const newTeacher: Teacher = {
      id: generateId(),
      name,
      subject,
      createdAt: Date.now(),
    };
    teachers.push(newTeacher);
    this.saveTeachers(teachers);
    return newTeacher;
  }

  // Öğretmen kayıtlı değilse eklenir (eski sürüm bu durumda sessizce hiçbir şey yapmıyordu)
  updateTeacher(teacher: Teacher): Teacher {
    const teachers = this.getTeachers();
    const index = teachers.findIndex(t => t.id === teacher.id);
    if (index !== -1) {
      teachers[index] = teacher;
    } else {
      teachers.push(teacher);
    }
    this.saveTeachers(teachers);
    return teacher;
  }

  // Öğretmeni ve ona ait tüm öğrenci, ders ve grupları siler
  deleteTeacher(teacherId: string): boolean {
    const teachers = this.getTeachers();
    const index = teachers.findIndex(t => t.id === teacherId);
    if (index === -1) return false;

    teachers.splice(index, 1);
    this.saveTeachers(teachers);
    this.saveStudents(this.getAllStudents().filter(s => s.teacherId !== teacherId));
    this.saveLessons(this.getAllLessons().filter(l => l.teacherId !== teacherId));
    this.saveGroups(this.getAllGroups().filter(g => g.teacherId !== teacherId));
    return true;
  }

  // ============ STUDENTS ============
  getStudents(teacherId: string): Student[] {
    return this.getAllStudents().filter(s => s.teacherId === teacherId);
  }

  getAllStudents(): Student[] {
    return readArray<Student>(STORAGE_KEYS.STUDENTS);
  }

  saveStudents(students: Student[]): void {
    this.write(STORAGE_KEYS.STUDENTS, students);
  }

  createStudent(teacherId: string, data: Partial<Student>): Student {
    const allStudents = this.getAllStudents();
    const newStudent: Student = {
      id: generateId(),
      teacherId,
      name: data.name || 'Yeni Öğrenci',
      educationLevel: data.educationLevel,
      gradeLevel: data.gradeLevel,
      parentName: data.parentName,
      contactNumber: data.contactNumber,
      email: data.email,
      notes: data.notes,
      hourlyRate: data.hourlyRate ?? 500,
      color: data.color || STUDENT_COLORS[Math.floor(Math.random() * STUDENT_COLORS.length)],
      groupIds: data.groupIds || [],
      createdAt: Date.now(),
    };
    allStudents.push(newStudent);
    this.saveStudents(allStudents);
    return newStudent;
  }

  updateStudent(studentId: string, data: Partial<Student>): Student | null {
    const allStudents = this.getAllStudents();
    const index = allStudents.findIndex(s => s.id === studentId);
    if (index === -1) return null;

    allStudents[index] = { ...allStudents[index], ...data };
    this.saveStudents(allStudents);
    return allStudents[index];
  }

  deleteStudent(studentId: string): boolean {
    const allStudents = this.getAllStudents();
    const filteredStudents = allStudents.filter(s => s.id !== studentId);

    if (filteredStudents.length === allStudents.length) {
      return false;
    }

    this.saveStudents(filteredStudents);

    // Öğrenciye ait dersleri de sil
    const allLessons = this.getAllLessons();
    this.saveLessons(allLessons.filter(l => l.studentId !== studentId));

    // Öğrenciyi gruplardan çıkar
    const allGroups = this.getAllGroups();
    this.saveGroups(allGroups.map(g => ({
      ...g,
      studentIds: (g.studentIds || []).filter(id => id !== studentId)
    })));

    return true;
  }

  // ============ LESSONS ============
  getLessons(teacherId: string): Lesson[] {
    return this.getAllLessons().filter(l => l.teacherId === teacherId);
  }

  getAllLessons(): Lesson[] {
    return readArray<Lesson>(STORAGE_KEYS.LESSONS);
  }

  saveLessons(lessons: Lesson[]): void {
    this.write(STORAGE_KEYS.LESSONS, lessons);
  }

  createLesson(teacherId: string, data: Partial<Lesson>): Lesson {
    const allLessons = this.getAllLessons();
    const newLesson: Lesson = {
      id: generateId(),
      teacherId,
      studentId: data.studentId || '',
      start: data.start || new Date().toISOString(),
      end: data.end || new Date().toISOString(),
      status: data.status || LessonStatus.SCHEDULED,
      subject: data.subject,
      notes: data.notes,
      homework: data.homework,
      price: data.price || 0,
      paid: data.paid || false,
      attendanceStatus: data.attendanceStatus,
      participationScore: data.participationScore,
    };
    allLessons.push(newLesson);
    this.saveLessons(allLessons);
    return newLesson;
  }

  updateLesson(lessonId: string, data: Partial<Lesson>): Lesson | null {
    const allLessons = this.getAllLessons();
    const index = allLessons.findIndex(l => l.id === lessonId);
    if (index === -1) return null;

    allLessons[index] = { ...allLessons[index], ...data };
    this.saveLessons(allLessons);
    return allLessons[index];
  }

  deleteLesson(lessonId: string): boolean {
    const allLessons = this.getAllLessons();
    const filteredLessons = allLessons.filter(l => l.id !== lessonId);

    if (filteredLessons.length === allLessons.length) {
      return false;
    }

    this.saveLessons(filteredLessons);
    return true;
  }

  deleteLessons(lessonIds: string[]): number {
    const allLessons = this.getAllLessons();
    const filteredLessons = allLessons.filter(l => !lessonIds.includes(l.id));
    const deletedCount = allLessons.length - filteredLessons.length;

    this.saveLessons(filteredLessons);
    return deletedCount;
  }

  // ============ GROUPS ============
  getGroups(teacherId: string): Group[] {
    return this.getAllGroups().filter(g => g.teacherId === teacherId);
  }

  getAllGroups(): Group[] {
    return readArray<Group>(STORAGE_KEYS.GROUPS);
  }

  saveGroups(groups: Group[]): void {
    this.write(STORAGE_KEYS.GROUPS, groups);
  }

  createGroup(teacherId: string, name: string, color: string): Group {
    const allGroups = this.getAllGroups();
    const newGroup: Group = {
      id: generateId(),
      teacherId,
      name,
      color,
      studentIds: [],
    };
    allGroups.push(newGroup);
    this.saveGroups(allGroups);
    return newGroup;
  }

  updateGroup(groupId: string, data: Partial<Group>): Group | null {
    const allGroups = this.getAllGroups();
    const index = allGroups.findIndex(g => g.id === groupId);
    if (index === -1) return null;

    allGroups[index] = { ...allGroups[index], ...data };
    this.saveGroups(allGroups);
    return allGroups[index];
  }

  deleteGroup(groupId: string): boolean {
    const allGroups = this.getAllGroups();
    const filteredGroups = allGroups.filter(g => g.id !== groupId);

    if (filteredGroups.length === allGroups.length) {
      return false;
    }

    this.saveGroups(filteredGroups);

    // Grubu öğrencilerden çıkar
    const allStudents = this.getAllStudents();
    this.saveStudents(allStudents.map(s => ({
      ...s,
      groupIds: (s.groupIds || []).filter(id => id !== groupId)
    })));

    return true;
  }

  // ============ TEMPLATES ============
  getTemplates(teacherId: string): ReportTemplate[] {
    return readArray<ReportTemplate>(STORAGE_KEYS.TEMPLATES).filter(t => t.teacherId === teacherId);
  }

  // ============ YEDEKLEME ============

  // Tüm profilleri kapsayan tam yedek
  exportAll(): FullBackupData {
    let defaultPricing: unknown;
    try {
      const raw = localStorage.getItem(PRICING_STORAGE_KEY);
      defaultPricing = raw ? JSON.parse(raw) : undefined;
    } catch {
      defaultPricing = undefined;
    }
    return {
      app: 'DersTakipCO',
      version: APP_DATA_VERSION,
      createdAt: new Date().toISOString(),
      teachers: this.getTeachers(),
      students: this.getAllStudents(),
      lessons: this.getAllLessons(),
      groups: this.getAllGroups(),
      templates: readArray<ReportTemplate>(STORAGE_KEYS.TEMPLATES),
      defaultPricing,
    };
  }

  // Hem yeni tam yedekleri (v3) hem de eski tek profilli yedekleri (v2) kabul eder.
  // Kayıt kimlikleri korunur; böylece dersler doğru öğrencilere bağlı kalır.
  restoreBackup(data: BackupData | FullBackupData): RestoreResult {
    if ('teachers' in data && Array.isArray(data.teachers)) {
      if (![data.teachers, data.students, data.lessons].every(isObjectArray)) {
        throw new Error('Geçersiz yedek dosyası');
      }
      localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(data.teachers));
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(data.students));
      localStorage.setItem(STORAGE_KEYS.LESSONS, JSON.stringify(data.lessons));
      localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(isObjectArray(data.groups) ? data.groups : []));
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(isObjectArray(data.templates) ? data.templates : []));
      if (data.defaultPricing && typeof data.defaultPricing === 'object') {
        localStorage.setItem(PRICING_STORAGE_KEY, JSON.stringify(data.defaultPricing));
      }
      this.scheduleAutoBackup();
      return {
        teacherIds: data.teachers.map(t => t.id),
        teachers: data.teachers.length,
        students: data.students.length,
        lessons: data.lessons.length,
        groups: isObjectArray(data.groups) ? data.groups.length : 0,
      };
    }

    const single = data as BackupData;
    if (!single.teacher || !single.teacher.id || ![single.students, single.lessons].every(isObjectArray)) {
      throw new Error('Geçersiz yedek dosyası');
    }
    const teacherId = single.teacher.id;
    const groups = isObjectArray(single.groups) ? single.groups : [];

    // Bu profile ait eski kayıtları, yedekteki kayıtlarla değiştir (diğer profillere dokunma)
    this.updateTeacher(single.teacher);
    this.saveStudents([
      ...this.getAllStudents().filter(s => s.teacherId !== teacherId),
      ...single.students.map(s => ({ ...s, teacherId })),
    ]);
    this.saveLessons([
      ...this.getAllLessons().filter(l => l.teacherId !== teacherId),
      ...single.lessons.map(l => ({ ...l, teacherId })),
    ]);
    this.saveGroups([
      ...this.getAllGroups().filter(g => g.teacherId !== teacherId),
      ...groups.map(g => ({ ...g, teacherId })),
    ]);

    return {
      teacherIds: [teacherId],
      teachers: 1,
      students: single.students.length,
      lessons: single.lessons.length,
      groups: groups.length,
    };
  }

  // ============ ESKİ UYGULAMADAN AKTARIM ============

  getMigrationInfo(): MigrationInfo | null {
    try {
      const raw = localStorage.getItem(MIGRATION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  // Eski uygulamanın localStorage kayıtlarını (ham metin) bu uygulamaya yazar
  importFromOldApp(raw: Record<string, string>, source: string): MigrationInfo {
    const parse = (key: string): Record<string, unknown>[] => {
      try {
        const value = JSON.parse(raw[key] || '[]');
        return isObjectArray(value) ? value : [];
      } catch {
        return [];
      }
    };

    const teachers = parse(STORAGE_KEYS.TEACHERS);
    const students = parse(STORAGE_KEYS.STUDENTS);
    const lessons = parse(STORAGE_KEYS.LESSONS);
    const groups = parse(STORAGE_KEYS.GROUPS);

    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    localStorage.setItem(STORAGE_KEYS.LESSONS, JSON.stringify(lessons));
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(parse(STORAGE_KEYS.TEMPLATES)));
    if (raw[PRICING_STORAGE_KEY]) {
      try {
        JSON.parse(raw[PRICING_STORAGE_KEY]);
        localStorage.setItem(PRICING_STORAGE_KEY, raw[PRICING_STORAGE_KEY]);
      } catch {
        // Bozuk ücret ayarı varsayılanlarla devam eder
      }
    }

    const recoveredProfiles = this.repairOrphans();
    const info: MigrationInfo = {
      date: new Date().toISOString(),
      source,
      counts: { teachers: teachers.length + recoveredProfiles, students: students.length, lessons: lessons.length, groups: groups.length },
      recoveredProfiles,
    };
    localStorage.setItem(MIGRATION_KEY, JSON.stringify(info));
    this.scheduleAutoBackup();
    return info;
  }

  // Aktarım denemesi yapıldığını kaydeder (eski veri bulunamasa bile tekrar taranmasın)
  markMigrationChecked(): void {
    if (!localStorage.getItem(MIGRATION_KEY)) {
      localStorage.setItem(MIGRATION_KEY, JSON.stringify({ date: new Date().toISOString(), source: 'yok', counts: { teachers: 0, students: 0, lessons: 0, groups: 0 } }));
    }
  }

  // Eski sürümdeki yedek yükleme hatası, öğretmeni kaydetmeden öğrenci ve dersleri yazıyordu.
  // Profili olmayan bu kayıtlar görünmez kalır; her biri için bir "Kurtarılan Profil" oluşturulur.
  repairOrphans(): number {
    const teachers = this.getTeachers();
    const known = new Set(teachers.map(t => t.id));
    const students = this.getAllStudents();
    const lessons = this.getAllLessons();
    const groups = this.getAllGroups();

    const orphanIds = new Set<string>();
    [...students, ...lessons, ...groups].forEach(r => {
      if (r.teacherId && !known.has(r.teacherId)) orphanIds.add(r.teacherId);
    });
    if (orphanIds.size === 0) return 0;

    let n = 0;
    orphanIds.forEach(id => {
      n++;
      const studentCount = students.filter(s => s.teacherId === id).length;
      const lessonCount = lessons.filter(l => l.teacherId === id).length;
      teachers.push({
        id,
        name: orphanIds.size > 1 ? `Kurtarılan Profil ${n}` : 'Kurtarılan Profil',
        subject: `${studentCount} öğrenci, ${lessonCount} ders`,
        createdAt: Date.now(),
      });
    });
    this.saveTeachers(teachers);
    return orphanIds.size;
  }

  // ============ UTILITY ============
  clearAllData(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
}

export const dbService = new DBService();
