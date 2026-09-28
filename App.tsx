import React, { useEffect, useState } from 'react';
import { Teacher, Student, Lesson, Group, ReportTemplate, BackupData, FullBackupData } from './types';
import { dbService, MigrationInfo, RestoreResult } from './services/db';
import { Dashboard } from './components/Dashboard';
import { StudentsView } from './components/StudentsView';
import { CalendarView } from './components/CalendarView';
import { FinanceView } from './components/FinanceView';
import { LessonsListView } from './components/LessonsListView';
import { CreateLessonView } from './components/CreateLessonView';
import { SmartPlannerView } from './components/SmartPlannerView';
import { GoalsView } from './components/GoalsView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { InstitutionView } from './components/InstitutionView';
import { LayoutDashboard, Users, Calendar, PieChart, LogOut, PlusCircle, List, Plus, Sparkles, Target, FileText, Settings, Building2, CheckCircle, X, Loader2, RefreshCw } from 'lucide-react';

// Extended ViewState enum with all new views
enum ExtendedViewState {
  DASHBOARD = 'DASHBOARD',
  STUDENTS = 'STUDENTS',
  CALENDAR = 'CALENDAR',
  LESSON_LIST = 'LESSON_LIST',
  FINANCE = 'FINANCE',
  CREATE_LESSON = 'CREATE_LESSON',
  SMART_PLANNER = 'SMART_PLANNER',
  GOALS = 'GOALS',
  REPORTS = 'REPORTS',
  INSTITUTION = 'INSTITUTION',
  SETTINGS = 'SETTINGS',
  PROFILE = 'PROFILE'
}

const App: React.FC = () => {
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const [view, setView] = useState<ExtendedViewState>(ExtendedViewState.DASHBOARD);
  
  // Data State
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  
  // Login/Signup Form State
  const [loginName, setLoginName] = useState('');
  const [loginSubject, setLoginSubject] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Açılış ve eski uygulamadan aktarım durumu
  const [isStarting, setIsStarting] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [migrationNotice, setMigrationNotice] = useState<MigrationInfo | null>(null);
  const [scanMessage, setScanMessage] = useState('');
  const [appVersion, setAppVersion] = useState('');

  // Eski DersTakipCO (Mağaza sürümü) verilerini arar; bulursa aktarır
  const importFromOldApp = async (): Promise<MigrationInfo | null> => {
    if (!window.derstakip) return null;
    const results = await window.derstakip.scanOldAppData();
    const best = results.find(r => r.data && r.counts);
    if (!best || !best.data) {
      const failed = results.find(r => r.error);
      if (failed) console.error('Eski veri okunamadı:', failed.path, failed.error);
      return null;
    }
    return dbService.importFromOldApp(best.data, best.source);
  };

  // İlk açılış: veri yoksa demo veri oluşturmak yerine eski uygulamadan otomatik aktar
  useEffect(() => {
    const init = async () => {
      window.derstakip?.getVersion().then(setAppVersion).catch(() => undefined);
      if (dbService.getTeachers().length === 0 && !dbService.getMigrationInfo()) {
        try {
          const info = await importFromOldApp();
          if (info) {
            setMigrationNotice(info);
          } else {
            dbService.markMigrationChecked();
          }
        } catch (err) {
          console.error('Eski veri aktarımı başarısız', err);
        }
      }
      dbService.repairOrphans();
      refreshData();
      setIsStarting(false);
    };
    init();
  }, []);

  // Profil ekranındaki "Eski verileri ara" düğmesi
  const handleManualScan = async () => {
    setIsScanning(true);
    setScanMessage('');
    try {
      const info = await importFromOldApp();
      if (info) {
        setMigrationNotice(info);
      } else {
        setScanMessage('Bu bilgisayarda eski DersTakipCO verisi bulunamadı.');
      }
    } catch {
      setScanMessage('Eski veriler okunurken bir hata oluştu.');
    } finally {
      refreshData();
      setIsScanning(false);
    }
  };

  // Ayarlar ekranından tüm verileri eski uygulamadakilerle değiştirir
  const handleImportFromSettings = async (): Promise<MigrationInfo | null> => {
    const info = await importFromOldApp();
    if (info) {
      setCurrentTeacher(null);
      setMigrationNotice(info);
      refreshData();
    }
    return info;
  };

  const refreshData = () => {
    const t = dbService.getTeachers();
    setTeachers(t);
    if (currentTeacher) {
      // Refresh teacher data in case it was updated
      const updatedTeacher = t.find(teacher => teacher.id === currentTeacher.id);
      if (updatedTeacher) {
        setCurrentTeacher(updatedTeacher);
      }
      setStudents(dbService.getStudents(currentTeacher.id));
      setLessons(dbService.getLessons(currentTeacher.id));
      setGroups(dbService.getGroups(currentTeacher.id));
      setTemplates(dbService.getTemplates(currentTeacher.id));
    }
  };

  // Refresh when teacher changes
  useEffect(() => {
    if (currentTeacher) {
      refreshData();
    }
  }, [currentTeacher?.id]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistering) {
       if (!loginName || !loginSubject) return;
       const newTeacher = dbService.createTeacher(loginName, loginSubject);
       setCurrentTeacher(newTeacher);
    } 
    setLoginName('');
    setLoginSubject('');
  };

  const selectProfile = (t: Teacher) => {
    setCurrentTeacher(t);
    setView(ExtendedViewState.DASHBOARD);
  };

  const logout = () => {
    setCurrentTeacher(null);
  };

  // Handler for updating teacher
  const handleUpdateTeacher = (updatedTeacher: Teacher) => {
    dbService.updateTeacher(updatedTeacher);
    setCurrentTeacher(updatedTeacher);
    refreshData();
  };

  // Handler for creating a lesson
  const handleCreateLesson = (lessonData: Omit<Lesson, 'id'>) => {
    dbService.createLesson(lessonData.teacherId, lessonData);
    refreshData();
  };

  // Yedek geri yükleme: kayıt kimlikleri korunur, öğretmen profili listede kalıcı olur
  const handleRestoreBackup = (data: BackupData | FullBackupData): RestoreResult => {
    const result = dbService.restoreBackup(data);
    const restoredTeachers = dbService.getTeachers();
    const stillCurrent = currentTeacher && restoredTeachers.find(t => t.id === currentTeacher.id);
    const next = stillCurrent || restoredTeachers.find(t => t.id === result.teacherIds[0]) || null;
    setCurrentTeacher(next);
    setTeachers(restoredTeachers);
    if (next) {
      setStudents(dbService.getStudents(next.id));
      setLessons(dbService.getLessons(next.id));
      setGroups(dbService.getGroups(next.id));
      setTemplates(dbService.getTemplates(next.id));
    }
    return result;
  };

  // Handler for clearing all data
  const handleClearAllData = () => {
    if (currentTeacher) {
      // Delete all lessons
      const allLessons = dbService.getLessons(currentTeacher.id);
      allLessons.forEach(l => dbService.deleteLesson(l.id));
      
      // Delete all students (this also cascades to lessons)
      const allStudents = dbService.getStudents(currentTeacher.id);
      allStudents.forEach(s => dbService.deleteStudent(s.id));
      
      // Delete all groups
      const allGroups = dbService.getGroups(currentTeacher.id);
      allGroups.forEach(g => dbService.deleteGroup(g.id));
      
      refreshData();
    }
  };

  if (isStarting) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-slate-500">
        <Loader2 className="animate-spin text-orange-600 mb-4" size={36} />
        <p className="font-medium">Verileriniz hazırlanıyor...</p>
      </div>
    );
  }

  if (!currentTeacher) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6 animate-in fade-in duration-500">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-orange-600 mb-2">DersTakipCO</h1>
            <p className="text-slate-500">Öğretmenler için Çevrimdışı Ders Takibi</p>
            {appVersion && <p className="text-xs text-slate-400 mt-1">v{appVersion}</p>}
          </div>

          {migrationNotice && (
            <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800">
              <CheckCircle className="flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1 text-sm">
                <p className="font-bold">Eski verileriniz aktarıldı</p>
                <p>
                  {migrationNotice.counts.teachers} profil, {migrationNotice.counts.students} öğrenci, {migrationNotice.counts.lessons} ders
                  {migrationNotice.counts.groups > 0 && `, ${migrationNotice.counts.groups} grup`} önceki DersTakipCO uygulamasından alındı.
                </p>
                {!!migrationNotice.recoveredProfiles && (
                  <p className="mt-1">
                    Eski sürümdeki yedek yükleme hatası yüzünden görünmeyen kayıtlar "Kurtarılan Profil" adıyla geri getirildi.
                  </p>
                )}
              </div>
              <button onClick={() => setMigrationNotice(null)} className="text-emerald-600 hover:text-emerald-800" aria-label="Kapat">
                <X size={18} />
              </button>
            </div>
          )}

          {!isRegistering ? (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-800 text-center">Profil Seçiniz</h2>
              {teachers.length === 0 && (
                <div className="text-center text-sm text-slate-500 space-y-3">
                  <p>Henüz bir profil yok. Başlamak için yeni bir profil oluşturun.</p>
                  {window.derstakip && (
                    <button
                      onClick={handleManualScan}
                      disabled={isScanning}
                      className="inline-flex items-center gap-2 px-4 py-2 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg font-medium disabled:opacity-60"
                    >
                      <RefreshCw size={16} className={isScanning ? 'animate-spin' : ''} />
                      {isScanning ? 'Aranıyor...' : 'Eski DersTakipCO verilerini ara'}
                    </button>
                  )}
                  {scanMessage && <p className="text-slate-400">{scanMessage}</p>}
                </div>
              )}
              <div className="grid gap-3">
                {teachers.map(t => (
                  <button 
                    key={t.id}
                    onClick={() => selectProfile(t)}
                    className="flex items-center justify-between w-full p-4 bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-200 rounded-xl transition-all group"
                  >
                     <div className="text-left">
                       <div className="font-bold text-slate-800 group-hover:text-orange-700">{t.name}</div>
                       <div className="text-sm text-slate-500">{t.subject}</div>
                     </div>
                     <div className="w-8 h-8 rounded-full bg-slate-200 group-hover:bg-orange-200 flex items-center justify-center text-slate-400 group-hover:text-orange-600">
                       →
                     </div>
                  </button>
                ))}
              </div>
              <div className="pt-4 border-t border-slate-100">
                <button 
                  onClick={() => setIsRegistering(true)}
                  className="w-full py-3 border-2 border-dashed border-slate-300 text-slate-500 rounded-xl hover:border-orange-300 hover:text-orange-600 font-medium flex items-center justify-center transition-colors"
                >
                  <PlusCircle className="mr-2" size={20} /> Yeni Profil Oluştur
                </button>
              </div>
            </div>
          ) : (
             <form onSubmit={handleLogin} className="space-y-4">
               <h2 className="text-xl font-bold text-slate-800 text-center">Yeni Öğretmen Profili</h2>
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Ad Soyad</label>
                 <input 
                   required
                   value={loginName}
                   onChange={e => setLoginName(e.target.value)}
                   className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none"
                   placeholder="Örn: Ayşe Yılmaz"
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Branş / Uzmanlık</label>
                 <input 
                   required
                   value={loginSubject}
                   onChange={e => setLoginSubject(e.target.value)}
                   className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none"
                   placeholder="Örn: Piyano, Matematik"
                 />
               </div>
               <div className="flex gap-3 pt-2">
                 <button 
                   type="button" 
                   onClick={() => setIsRegistering(false)}
                   className="flex-1 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium"
                 >
                   İptal
                 </button>
                 <button 
                   type="submit"
                   className="flex-1 py-2 bg-orange-600 text-white hover:bg-orange-700 rounded-lg font-medium"
                 >
                   Profil Oluştur
                 </button>
               </div>
             </form>
          )}
        </div>
      </div>
    );
  }

  // Main App Layout
  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* Sidebar (Light Theme) */}
      <aside className="w-64 bg-white border-r border-slate-200 flex-col hidden md:flex shadow-sm z-10">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-extrabold text-orange-600 tracking-tight">DersTakipCO</h1>
          <div className="mt-2 flex items-center text-sm text-slate-400">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div>
            Çevrimdışı Mod
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavButton 
            active={view === ExtendedViewState.DASHBOARD} 
            onClick={() => setView(ExtendedViewState.DASHBOARD)} 
            icon={<LayoutDashboard size={20}/>} 
            label="Özet" 
          />
          <NavButton 
            active={view === ExtendedViewState.CREATE_LESSON} 
            onClick={() => setView(ExtendedViewState.CREATE_LESSON)} 
            icon={<Plus size={20}/>} 
            label="Ders Oluştur"
            highlight
          />
          <NavButton 
            active={view === ExtendedViewState.CALENDAR} 
            onClick={() => setView(ExtendedViewState.CALENDAR)} 
            icon={<Calendar size={20}/>} 
            label="Takvim" 
          />
          <NavButton 
            active={view === ExtendedViewState.LESSON_LIST} 
            onClick={() => setView(ExtendedViewState.LESSON_LIST)} 
            icon={<List size={20}/>} 
            label="Ders Listesi" 
          />
          <NavButton 
            active={view === ExtendedViewState.STUDENTS} 
            onClick={() => setView(ExtendedViewState.STUDENTS)} 
            icon={<Users size={20}/>} 
            label="Öğrenciler" 
          />
          <NavButton 
            active={view === ExtendedViewState.SMART_PLANNER} 
            onClick={() => setView(ExtendedViewState.SMART_PLANNER)} 
            icon={<Sparkles size={20}/>} 
            label="Akıllı Planlama"
          />
          <NavButton 
            active={view === ExtendedViewState.GOALS} 
            onClick={() => setView(ExtendedViewState.GOALS)} 
            icon={<Target size={20}/>} 
            label="Hedefler"
          />
          <NavButton 
            active={view === ExtendedViewState.REPORTS} 
            onClick={() => setView(ExtendedViewState.REPORTS)} 
            icon={<FileText size={20}/>} 
            label="Raporlar"
          />
          <NavButton 
            active={view === ExtendedViewState.FINANCE} 
            onClick={() => setView(ExtendedViewState.FINANCE)} 
            icon={<PieChart size={20}/>} 
            label="Finans" 
          />
          <NavButton 
            active={view === ExtendedViewState.INSTITUTION} 
            onClick={() => setView(ExtendedViewState.INSTITUTION)} 
            icon={<Building2 size={20}/>} 
            label="Kurum Yönetimi"
          />
          <NavButton 
            active={view === ExtendedViewState.SETTINGS} 
            onClick={() => setView(ExtendedViewState.SETTINGS)} 
            icon={<Settings size={20}/>} 
            label="Ayarlar" 
          />
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold mr-3 shadow-sm">
              {currentTeacher.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-slate-800 text-sm font-bold truncate">{currentTeacher.name}</p>
              <p className="text-xs text-slate-500 truncate">{currentTeacher.subject}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-sm transition-colors text-slate-600"
          >
            <LogOut size={16} className="mr-2" /> Profili Değiştir
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-slate-200 text-slate-800 p-4 flex justify-between items-center shadow-sm">
           <h1 className="font-bold text-orange-600">DersTakipCO</h1>
           <button onClick={logout} className="text-slate-500"><LogOut size={20} /></button>
        </div>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
           {view === ExtendedViewState.DASHBOARD && (
             <Dashboard 
               teacher={currentTeacher} 
               lessons={lessons} 
               students={students} 
               onNavigate={(viewName) => setView(viewName as ExtendedViewState)}
             />
           )}
           {view === ExtendedViewState.STUDENTS && (
             <StudentsView 
               teacher={currentTeacher} 
               students={students} 
               groups={groups} 
               lessons={lessons}
               onUpdate={refreshData} 
             />
           )}
           {view === ExtendedViewState.CALENDAR && (
             <CalendarView teacher={currentTeacher} lessons={lessons} students={students} groups={groups} onUpdate={refreshData} />
           )}
           {view === ExtendedViewState.LESSON_LIST && (
             <LessonsListView lessons={lessons} students={students} onUpdate={refreshData} />
           )}
           {view === ExtendedViewState.CREATE_LESSON && (
             <CreateLessonView 
               teacher={currentTeacher} 
               students={students} 
               groups={groups} 
               onUpdate={refreshData}
             />
           )}
           {view === ExtendedViewState.SMART_PLANNER && (
             <SmartPlannerView 
               teacher={currentTeacher}
               students={students}
               lessons={lessons}
               onUpdateTeacher={handleUpdateTeacher}
               onCreateLesson={handleCreateLesson}
             />
           )}
           {view === ExtendedViewState.GOALS && (
             <GoalsView 
               teacher={currentTeacher}
               students={students}
               lessons={lessons}
               onUpdateTeacher={handleUpdateTeacher}
             />
           )}
           {view === ExtendedViewState.REPORTS && (
             <ReportsView 
               teacher={currentTeacher}
               students={students}
               lessons={lessons}
             />
           )}
           {view === ExtendedViewState.FINANCE && (
             <FinanceView lessons={lessons} students={students} groups={groups} templates={templates} teacher={currentTeacher} />
           )}
           {view === ExtendedViewState.SETTINGS && (
             <SettingsView 
               teacher={currentTeacher}
               students={students}
               lessons={lessons}
               groups={groups}
               onRestoreBackup={handleRestoreBackup}
               onClearAllData={handleClearAllData}
               onImportFromOldApp={window.derstakip ? handleImportFromSettings : undefined}
             />
           )}
           {view === ExtendedViewState.INSTITUTION && (
             <InstitutionView 
               currentTeacher={currentTeacher}
               teachers={teachers}
               students={dbService.getAllStudents()}
               lessons={dbService.getAllLessons()}
               onUpdate={refreshData}
               onSwitchTeacher={(teacher) => {
                 setCurrentTeacher(teacher);
                 setView(ExtendedViewState.DASHBOARD);
               }}
             />
           )}
        </div>
        
        {/* Mobile Nav Bar */}
        <div className="md:hidden bg-white border-t border-slate-200 flex justify-around p-2 text-[10px] font-medium text-slate-500 z-20">
           <button onClick={() => setView(ExtendedViewState.DASHBOARD)} className={`flex flex-col items-center p-2 ${view === ExtendedViewState.DASHBOARD ? 'text-orange-600' : ''}`}>
             <LayoutDashboard size={20} />
             <span>Özet</span>
           </button>
           <button onClick={() => setView(ExtendedViewState.CREATE_LESSON)} className={`flex flex-col items-center p-2 ${view === ExtendedViewState.CREATE_LESSON ? 'text-orange-600' : ''}`}>
             <div className="w-10 h-10 -mt-6 bg-orange-600 rounded-full flex items-center justify-center text-white shadow-lg">
               <Plus size={24} />
             </div>
             <span className="mt-1">Ders Ekle</span>
           </button>
           <button onClick={() => setView(ExtendedViewState.CALENDAR)} className={`flex flex-col items-center p-2 ${view === ExtendedViewState.CALENDAR ? 'text-orange-600' : ''}`}>
             <Calendar size={20} />
             <span>Takvim</span>
           </button>
           <button onClick={() => setView(ExtendedViewState.STUDENTS)} className={`flex flex-col items-center p-2 ${view === ExtendedViewState.STUDENTS ? 'text-orange-600' : ''}`}>
             <Users size={20} />
             <span>Öğrenci</span>
           </button>
           <button onClick={() => setView(ExtendedViewState.SETTINGS)} className={`flex flex-col items-center p-2 ${view === ExtendedViewState.SETTINGS ? 'text-orange-600' : ''}`}>
             <Settings size={20} />
             <span>Ayarlar</span>
           </button>
        </div>
      </main>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label, highlight, badge }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center px-4 py-2.5 rounded-lg transition-all duration-200 group
      ${highlight && !active
        ? 'bg-orange-600 text-white hover:bg-orange-700'
        : active 
          ? 'bg-orange-50 text-orange-700 shadow-sm border border-orange-100' 
          : 'hover:bg-slate-50 text-slate-500 hover:text-slate-800'
      }`}
  >
    <span className={`${
      highlight && !active
        ? 'text-white'
        : active 
          ? 'text-orange-600' 
          : 'text-slate-400 group-hover:text-slate-600'
    } mr-3`}>
      {icon}
    </span>
    <span className="font-medium flex-1 text-left">{label}</span>
  </button>
);

export default App;
