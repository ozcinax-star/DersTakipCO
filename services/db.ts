import { Teacher, Student, Lesson, Group, ReportTemplate, LessonStatus } from '../types';

const STORAGE_KEYS = {
  TEACHERS: 'derstakipco_teachers',
  STUDENTS: 'derstakipco_students',
  LESSONS: 'derstakipco_lessons',
  GROUPS: 'derstakipco_groups',
  TEMPLATES: 'derstakipco_templates',
};

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

const STUDENT_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e'
];

class DBService {
  // ============ TEACHERS ============
  getTeachers(): Teacher[] {
    const data = localStorage.getItem(STORAGE_KEYS.TEACHERS);
    return data ? JSON.parse(data) : [];
  }

  saveTeachers(teachers: Teacher[]): void {
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
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

  updateTeacher(teacher: Teacher): Teacher {
    const teachers = this.getTeachers();
    const index = teachers.findIndex(t => t.id === teacher.id);
    if (index !== -1) {
      teachers[index] = teacher;
      this.saveTeachers(teachers);
    }
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
    const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    const students: Student[] = data ? JSON.parse(data) : [];
    return students.filter(s => s.teacherId === teacherId);
  }

  getAllStudents(): Student[] {
    const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    return data ? JSON.parse(data) : [];
  }

  saveStudents(students: Student[]): void {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }

  createStudent(teacherId: string, data: Partial<Student>): Student {
    const allStudents = this.getAllStudents();
    const newStudent: Student = {
      id: generateId(),
      teacherId,
      name: data.name || 'Yeni Öğrenci',
      gradeLevel: data.gradeLevel,
      parentName: data.parentName,
      contactNumber: data.contactNumber,
      notes: data.notes,
      hourlyRate: data.hourlyRate || 500,
      color: data.color || STUDENT_COLORS[Math.floor(Math.random() * STUDENT_COLORS.length)],
      groupIds: data.groupIds || [],
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

  // FIXED: Actually delete student from localStorage
  deleteStudent(studentId: string): boolean {
    const allStudents = this.getAllStudents();
    const filteredStudents = allStudents.filter(s => s.id !== studentId);
    
    if (filteredStudents.length === allStudents.length) {
      return false; // Student not found
    }
    
    // Save the filtered list (without the deleted student)
    this.saveStudents(filteredStudents);
    
    // Also delete all lessons associated with this student
    const allLessons = this.getAllLessons();
    const filteredLessons = allLessons.filter(l => l.studentId !== studentId);
    this.saveLessons(filteredLessons);
    
    // Remove student from any groups
    const allGroups = this.getAllGroups();
    const updatedGroups = allGroups.map(g => ({
      ...g,
      studentIds: g.studentIds.filter(id => id !== studentId)
    }));
    this.saveGroups(updatedGroups);
    
    return true;
  }

  // ============ LESSONS ============
  getLessons(teacherId: string): Lesson[] {
    const data = localStorage.getItem(STORAGE_KEYS.LESSONS);
    const lessons: Lesson[] = data ? JSON.parse(data) : [];
    return lessons.filter(l => l.teacherId === teacherId);
  }

  getAllLessons(): Lesson[] {
    const data = localStorage.getItem(STORAGE_KEYS.LESSONS);
    return data ? JSON.parse(data) : [];
  }

  saveLessons(lessons: Lesson[]): void {
    localStorage.setItem(STORAGE_KEYS.LESSONS, JSON.stringify(lessons));
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

  // FIXED: Actually delete lesson from localStorage
  deleteLesson(lessonId: string): boolean {
    const allLessons = this.getAllLessons();
    const filteredLessons = allLessons.filter(l => l.id !== lessonId);
    
    if (filteredLessons.length === allLessons.length) {
      return false; // Lesson not found
    }
    
    // Save the filtered list (without the deleted lesson)
    this.saveLessons(filteredLessons);
    return true;
  }

  // Bulk delete lessons
  deleteLessons(lessonIds: string[]): number {
    const allLessons = this.getAllLessons();
    const filteredLessons = allLessons.filter(l => !lessonIds.includes(l.id));
    const deletedCount = allLessons.length - filteredLessons.length;
    
    this.saveLessons(filteredLessons);
    return deletedCount;
  }

  // ============ GROUPS ============
  getGroups(teacherId: string): Group[] {
    const data = localStorage.getItem(STORAGE_KEYS.GROUPS);
    const groups: Group[] = data ? JSON.parse(data) : [];
    return groups.filter(g => g.teacherId === teacherId);
  }

  getAllGroups(): Group[] {
    const data = localStorage.getItem(STORAGE_KEYS.GROUPS);
    return data ? JSON.parse(data) : [];
  }

  saveGroups(groups: Group[]): void {
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
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
    
    // Remove group from students
    const allStudents = this.getAllStudents();
    const updatedStudents = allStudents.map(s => ({
      ...s,
      groupIds: s.groupIds.filter(id => id !== groupId)
    }));
    this.saveStudents(updatedStudents);
    
    return true;
  }

  // ============ TEMPLATES ============
  getTemplates(teacherId: string): ReportTemplate[] {
    const data = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    const templates: ReportTemplate[] = data ? JSON.parse(data) : [];
    return templates.filter(t => t.teacherId === teacherId);
  }

  // ============ SEED DATA ============
  seedData(): void {
    const teachers = this.getTeachers();
    if (teachers.length > 0) return;

    // Create demo teacher
    const teacher = this.createTeacher('Ayşe Yılmaz', 'Piyano');
    
    // Create demo students
    const student1 = this.createStudent(teacher.id, {
      name: 'Ali Demir',
      gradeLevel: '6. Sınıf',
      hourlyRate: 600,
      parentName: 'Mehmet Demir',
      contactNumber: '0532 111 2233',
    });
    
    const student2 = this.createStudent(teacher.id, {
      name: 'Zeynep Kaya',
      gradeLevel: '8. Sınıf',
      hourlyRate: 650,
      parentName: 'Fatma Kaya',
      contactNumber: '0533 222 3344',
    });
    
    const student3 = this.createStudent(teacher.id, {
      name: 'Cem Özkan',
      gradeLevel: '5. Sınıf',
      hourlyRate: 550,
      parentName: 'Aysel Özkan',
      contactNumber: '0534 333 4455',
    });

    // Create demo lessons for the past week and next week
    const now = new Date();
    const lessons = [
      // Past lessons (completed)
      { studentId: student1.id, dayOffset: -5, hour: 14, status: LessonStatus.COMPLETED, paid: true },
      { studentId: student2.id, dayOffset: -4, hour: 16, status: LessonStatus.COMPLETED, paid: true },
      { studentId: student3.id, dayOffset: -3, hour: 10, status: LessonStatus.COMPLETED, paid: false },
      { studentId: student1.id, dayOffset: -2, hour: 15, status: LessonStatus.COMPLETED, paid: true },
      { studentId: student2.id, dayOffset: -1, hour: 11, status: LessonStatus.CANCELLED, paid: false },
      // Future lessons (scheduled)
      { studentId: student1.id, dayOffset: 1, hour: 14, status: LessonStatus.SCHEDULED, paid: false },
      { studentId: student2.id, dayOffset: 2, hour: 16, status: LessonStatus.SCHEDULED, paid: false },
      { studentId: student3.id, dayOffset: 3, hour: 10, status: LessonStatus.SCHEDULED, paid: false },
      { studentId: student1.id, dayOffset: 5, hour: 15, status: LessonStatus.SCHEDULED, paid: false },
      { studentId: student2.id, dayOffset: 6, hour: 11, status: LessonStatus.SCHEDULED, paid: false },
    ];

    lessons.forEach(lesson => {
      const start = new Date(now);
      start.setDate(start.getDate() + lesson.dayOffset);
      start.setHours(lesson.hour, 0, 0, 0);
      
      const end = new Date(start);
      end.setHours(lesson.hour + 1);
      
      const student = [student1, student2, student3].find(s => s.id === lesson.studentId);
      
      this.createLesson(teacher.id, {
        studentId: lesson.studentId,
        start: start.toISOString(),
        end: end.toISOString(),
        status: lesson.status,
        price: student?.hourlyRate || 500,
        paid: lesson.paid,
        subject: 'Piyano Dersi',
      });
    });

    // Create a demo group
    this.createGroup(teacher.id, 'Başlangıç Grubu', '#3b82f6');
  }

  // ============ UTILITY ============
  clearAllData(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
}

export const dbService = new DBService();