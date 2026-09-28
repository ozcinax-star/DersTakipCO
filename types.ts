export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  STUDENTS = 'STUDENTS',
  CALENDAR = 'CALENDAR',
  LESSON_LIST = 'LESSON_LIST',
  FINANCE = 'FINANCE',
  PROFILE = 'PROFILE',
  SMART_PLANNER = 'SMART_PLANNER',
  GOALS = 'GOALS',
  REPORTS = 'REPORTS',
  SETTINGS = 'SETTINGS'
}

export enum LessonStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum EducationLevel {
  ELEMENTARY = 'ELEMENTARY',      // İlkokul
  MIDDLE_SCHOOL = 'MIDDLE_SCHOOL', // Ortaokul
  HIGH_SCHOOL = 'HIGH_SCHOOL',    // Lise
  UNIVERSITY = 'UNIVERSITY',      // Üniversite
  ADULT = 'ADULT'                 // Yetişkin
}

export const EducationLevelLabels: Record<EducationLevel, string> = {
  [EducationLevel.ELEMENTARY]: 'İlkokul (1-4. Sınıf)',
  [EducationLevel.MIDDLE_SCHOOL]: 'Ortaokul (5-8. Sınıf)',
  [EducationLevel.HIGH_SCHOOL]: 'Lise (9-12. Sınıf)',
  [EducationLevel.UNIVERSITY]: 'Üniversite',
  [EducationLevel.ADULT]: 'Yetişkin Eğitimi'
};

export const EducationLevelDefaults: Record<EducationLevel, { subjects: string[], hourlyRate: number, duration: number }> = {
  [EducationLevel.ELEMENTARY]: { subjects: ['Matematik', 'Türkçe', 'Fen Bilgisi', 'İngilizce'], hourlyRate: 300, duration: 45 },
  [EducationLevel.MIDDLE_SCHOOL]: { subjects: ['Matematik', 'Türkçe', 'Fen Bilimleri', 'İngilizce', 'Sosyal Bilgiler'], hourlyRate: 400, duration: 60 },
  [EducationLevel.HIGH_SCHOOL]: { subjects: ['Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'İngilizce', 'Edebiyat', 'Tarih', 'Coğrafya'], hourlyRate: 500, duration: 60 },
  [EducationLevel.UNIVERSITY]: { subjects: ['Calculus', 'Lineer Cebir', 'Fizik', 'Programlama', 'İstatistik'], hourlyRate: 600, duration: 90 },
  [EducationLevel.ADULT]: { subjects: ['İngilizce', 'Almanca', 'Bilgisayar', 'Excel', 'Muhasebe'], hourlyRate: 500, duration: 60 }
};

export interface Teacher {
  id: string;
  name: string;
  subject: string;
  email?: string;
  phone?: string;
  createdAt: number;
  // Availability - haftalık uygunluk
  availability?: WeeklyAvailability;
  // Monthly goal
  monthlyGoal?: number;
  defaultHourlyRate?: number;
  role?: 'admin' | 'teacher'; // Kurum modu için
  institutionId?: string;
}

export interface Institution {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  createdAt: number;
  ownerId: string; // Admin teacher
}

export interface WeeklyAvailability {
  // Her gün için saat aralıkları
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

export interface TimeSlot {
  start: string; // "09:00"
  end: string;   // "12:00"
}

export interface Group {
  id: string;
  teacherId: string;
  name: string;
  color: string;
  studentIds: string[];
}

export interface Student {
  id: string;
  teacherId: string;
  name: string;
  educationLevel?: EducationLevel;
  gradeLevel?: string;
  parentName?: string;
  contactNumber?: string;
  email?: string;
  notes?: string;
  hourlyRate: number;
  color: string;
  groupIds: string[];
  createdAt?: number;
  // Performance tracking
  performanceNotes?: PerformanceNote[];
}

export interface PerformanceNote {
  id: string;
  date: string;
  score: number; // 0-100
  category: 'homework' | 'participation' | 'exam' | 'general';
  note?: string;
}

export interface Lesson {
  id: string;
  teacherId: string;
  studentId: string;
  start: string; // ISO string
  end: string; // ISO string
  status: LessonStatus;
  subject?: string;
  notes?: string;
  homework?: string;
  price: number;
  paid: boolean;
  // Performance
  attendanceStatus?: 'present' | 'absent' | 'late';
  participationScore?: number; // 1-5
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color: string;
  original: Lesson;
}

export interface ReportTemplate {
  id: string;
  teacherId: string;
  name: string;
  sections: string[]; // 'summary', 'attendance', 'financial', 'history', 'charts'
}

export interface Attachment {
  id: string;
  lessonId: string;
  name: string;
  type: string;
  data: string; // Base64
  size: number;
  createdAt: number;
}

// Akıllı Planlama için önerilen ders
export interface SuggestedLesson {
  studentId: string;
  studentName: string;
  suggestedDay: string;
  suggestedTime: string;
  duration: number;
  reason: string;
}

// Kazanç hedefi
export interface EarningsGoal {
  id: string;
  teacherId: string;
  month: number; // 0-11
  year: number;
  targetAmount: number;
  currentAmount: number;
}

// Performans skoru hesaplama
export interface StudentPerformance {
  studentId: string;
  totalLessons: number;
  completedLessons: number;
  cancelledLessons: number;
  attendanceRate: number;
  averageParticipation: number;
  continuityScore: number; // Devamlılık
  performanceScore: number; // 0-100 final skor
}

// Yedekleme
export interface BackupData {
  version: string;
  createdAt: string;
  teacher: Teacher;
  students: Student[];
  lessons: Lesson[];
  groups: Group[];
  institutions?: Institution[];
}