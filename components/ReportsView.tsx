import React, { useState, useMemo } from 'react';
import { Teacher, Student, Lesson, LessonStatus } from '../types';
import { FileText, Download, User, Users, Calendar, TrendingUp, Filter, Printer, CheckCircle } from 'lucide-react';

interface ReportsViewProps {
  teacher: Teacher;
  students: Student[];
  lessons: Lesson[];
}

type ReportType = 'student' | 'period' | 'financial';
type ReportPeriod = 'month' | 'quarter' | 'year' | 'custom';

export const ReportsView: React.FC<ReportsViewProps> = ({
  teacher,
  students,
  lessons
}) => {
  const [reportType, setReportType] = useState<ReportType>('student');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [includeSections, setIncludeSections] = useState({
    summary: true,
    lessonHistory: true,
    attendance: true,
    financial: true,
    notes: true
  });

  // Tarih aralığını hesapla
  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date, end: Date;

    switch (period) {
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        end = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      case 'custom':
        start = customStartDate ? new Date(customStartDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        end = customEndDate ? new Date(customEndDate) : now;
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = now;
    }

    return { start, end };
  }, [period, customStartDate, customEndDate]);

  // Filtrelenmiş dersler
  const filteredLessons = useMemo(() => {
    return lessons.filter(l => {
      const lessonDate = new Date(l.start);
      const inDateRange = lessonDate >= dateRange.start && lessonDate <= dateRange.end;
      const matchesStudent = !selectedStudent || l.studentId === selectedStudent;
      return inDateRange && matchesStudent;
    });
  }, [lessons, dateRange, selectedStudent]);

  // İstatistikler
  const stats = useMemo(() => {
    const completed = filteredLessons.filter(l => l.status === LessonStatus.COMPLETED);
    const cancelled = filteredLessons.filter(l => l.status === LessonStatus.CANCELLED);
    const totalEarnings = completed.reduce((sum, l) => sum + l.price, 0);
    const paidEarnings = completed.filter(l => l.paid).reduce((sum, l) => sum + l.price, 0);

    return {
      totalLessons: filteredLessons.length,
      completedLessons: completed.length,
      cancelledLessons: cancelled.length,
      totalEarnings,
      paidEarnings,
      pendingEarnings: totalEarnings - paidEarnings,
      attendanceRate: filteredLessons.length > 0 
        ? ((completed.length / filteredLessons.length) * 100).toFixed(1)
        : '0'
    };
  }, [filteredLessons]);

  // PDF oluştur (HTML olarak yazdır)
  const generateReport = () => {
    const student = selectedStudent ? students.find(s => s.id === selectedStudent) : null;
    
    const reportHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>DersTakipCO Raporu</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; }
          .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #f97316; }
          .header h1 { color: #f97316; font-size: 28px; margin-bottom: 8px; }
          .header p { color: #64748b; }
          .section { margin-bottom: 30px; }
          .section h2 { color: #334155; font-size: 18px; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
          .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
          .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center; }
          .stat-box .value { font-size: 24px; font-weight: bold; color: #f97316; }
          .stat-box .label { font-size: 12px; color: #64748b; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
          th { background: #f8fafc; font-weight: 600; color: #475569; }
          .status-completed { color: #059669; }
          .status-cancelled { color: #dc2626; }
          .status-scheduled { color: #d97706; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px; }
          .student-info { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .student-info h3 { color: #334155; margin-bottom: 10px; }
          .student-info p { color: #64748b; margin: 4px 0; }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>DersTakipCO</h1>
          <p>${reportType === 'student' && student ? `${student.name} - Öğrenci Raporu` : 'Dönemsel Rapor'}</p>
          <p>${dateRange.start.toLocaleDateString('tr-TR')} - ${dateRange.end.toLocaleDateString('tr-TR')}</p>
        </div>

        ${student && includeSections.summary ? `
          <div class="student-info">
            <h3>${student.name}</h3>
            <p><strong>Sınıf:</strong> ${student.gradeLevel || 'Belirtilmemiş'}</p>
            <p><strong>Veli:</strong> ${student.parentName || 'Belirtilmemiş'}</p>
            <p><strong>İletişim:</strong> ${student.contactNumber || 'Belirtilmemiş'}</p>
            <p><strong>Saat Ücreti:</strong> ₺${student.hourlyRate}</p>
          </div>
        ` : ''}

        ${includeSections.summary ? `
          <div class="section">
            <h2>📊 Özet İstatistikler</h2>
            <div class="stats-grid">
              <div class="stat-box">
                <div class="value">${stats.totalLessons}</div>
                <div class="label">Toplam Ders</div>
              </div>
              <div class="stat-box">
                <div class="value">${stats.completedLessons}</div>
                <div class="label">Tamamlanan</div>
              </div>
              <div class="stat-box">
                <div class="value">${stats.cancelledLessons}</div>
                <div class="label">İptal Edilen</div>
              </div>
              <div class="stat-box">
                <div class="value">%${stats.attendanceRate}</div>
                <div class="label">Katılım Oranı</div>
              </div>
              <div class="stat-box">
                <div class="value">₺${stats.totalEarnings.toLocaleString('tr-TR')}</div>
                <div class="label">Toplam Tutar</div>
              </div>
              <div class="stat-box">
                <div class="value">₺${stats.paidEarnings.toLocaleString('tr-TR')}</div>
                <div class="label">Ödenen</div>
              </div>
            </div>
          </div>
        ` : ''}

        ${includeSections.lessonHistory ? `
          <div class="section">
            <h2>📚 Ders Geçmişi</h2>
            <table>
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Saat</th>
                  ${!selectedStudent ? '<th>Öğrenci</th>' : ''}
                  <th>Konu</th>
                  <th>Durum</th>
                  <th>Ücret</th>
                </tr>
              </thead>
              <tbody>
                ${filteredLessons
                  .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
                  .slice(0, 50)
                  .map(lesson => {
                    const lessonStudent = students.find(s => s.id === lesson.studentId);
                    const date = new Date(lesson.start);
                    return `
                      <tr>
                        <td>${date.toLocaleDateString('tr-TR')}</td>
                        <td>${date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</td>
                        ${!selectedStudent ? `<td>${lessonStudent?.name || 'Bilinmiyor'}</td>` : ''}
                        <td>${lesson.subject || '-'}</td>
                        <td class="status-${lesson.status.toLowerCase()}">${
                          lesson.status === 'COMPLETED' ? 'Tamamlandı' :
                          lesson.status === 'CANCELLED' ? 'İptal' : 'Planlandı'
                        }</td>
                        <td>₺${lesson.price}</td>
                      </tr>
                    `;
                  }).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${includeSections.financial ? `
          <div class="section">
            <h2>💰 Finansal Özet</h2>
            <table>
              <tr>
                <td><strong>Toplam Kazanç</strong></td>
                <td>₺${stats.totalEarnings.toLocaleString('tr-TR')}</td>
              </tr>
              <tr>
                <td><strong>Tahsil Edilen</strong></td>
                <td>₺${stats.paidEarnings.toLocaleString('tr-TR')}</td>
              </tr>
              <tr>
                <td><strong>Bekleyen Ödeme</strong></td>
                <td>₺${stats.pendingEarnings.toLocaleString('tr-TR')}</td>
              </tr>
              <tr>
                <td><strong>Ortalama Ders Ücreti</strong></td>
                <td>₺${stats.completedLessons > 0 ? Math.round(stats.totalEarnings / stats.completedLessons) : 0}</td>
              </tr>
            </table>
          </div>
        ` : ''}

        ${includeSections.notes && student?.notes ? `
          <div class="section">
            <h2>ðŸ“ Notlar</h2>
            <p>${student.notes}</p>
          </div>
        ` : ''}

        <div class="footer">
          <p>Bu rapor DersTakipCO tarafından ${new Date().toLocaleDateString('tr-TR')} tarihinde oluşturulmuştur.</p>
          <p>${teacher.name} - ${teacher.subject}</p>
        </div>
      </body>
      </html>
    `;

    // Yeni pencerede aç ve yazdır
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(reportHTML);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-7 h-7 text-orange-500" />
            Raporlar
          </h1>
          <p className="text-slate-500 mt-1">Öğrenci ve dönemsel raporlar oluşturun</p>
        </div>
        <button
          onClick={generateReport}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Printer className="w-4 h-4" />
          Rapor Oluştur
        </button>
      </div>

      {/* Report Type Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="font-bold text-slate-800 mb-4">Rapor Türü</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => setReportType('student')}
            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
              reportType === 'student' 
                ? 'border-orange-500 bg-orange-50' 
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <User className={`w-5 h-5 ${reportType === 'student' ? 'text-orange-500' : 'text-slate-400'}`} />
            <div className="text-left">
              <p className={`font-medium ${reportType === 'student' ? 'text-orange-700' : 'text-slate-700'}`}>
                Öğrenci Raporu
              </p>
              <p className="text-sm text-slate-500">Tek öğrenci detayları</p>
            </div>
          </button>
          
          <button
            onClick={() => { setReportType('period'); setSelectedStudent(''); }}
            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
              reportType === 'period' 
                ? 'border-orange-500 bg-orange-50' 
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <Calendar className={`w-5 h-5 ${reportType === 'period' ? 'text-orange-500' : 'text-slate-400'}`} />
            <div className="text-left">
              <p className={`font-medium ${reportType === 'period' ? 'text-orange-700' : 'text-slate-700'}`}>
                Dönemsel Rapor
              </p>
              <p className="text-sm text-slate-500">Tüm öğrenciler</p>
            </div>
          </button>
          
          <button
            onClick={() => { setReportType('financial'); setSelectedStudent(''); }}
            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
              reportType === 'financial' 
                ? 'border-orange-500 bg-orange-50' 
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <TrendingUp className={`w-5 h-5 ${reportType === 'financial' ? 'text-orange-500' : 'text-slate-400'}`} />
            <div className="text-left">
              <p className={`font-medium ${reportType === 'financial' ? 'text-orange-700' : 'text-slate-700'}`}>
                Finansal Rapor
              </p>
              <p className="text-sm text-slate-500">Gelir-gider özeti</p>
            </div>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          Filtreler
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Student Selector */}
          {reportType === 'student' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Öğrenci</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Öğrenci Seçin</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>{student.name}</option>
                ))}
              </select>
            </div>
          )}
          
          {/* Period Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Dönem</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="month">Bu Ay</option>
              <option value="quarter">Bu Çeyrek</option>
              <option value="year">Bu Yıl</option>
              <option value="custom">Özel Tarih</option>
            </select>
          </div>
          
          {/* Custom Date Range */}
          {period === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Başlangıç</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Bitiş</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Include Sections */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="font-bold text-slate-800 mb-4">Rapor İçeriği</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries({
            summary: 'Özet',
            lessonHistory: 'Ders Geçmişi',
            attendance: 'Katılım',
            financial: 'Finansal',
            notes: 'Notlar'
          }).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSections[key as keyof typeof includeSections]}
                onChange={(e) => setIncludeSections(prev => ({
                  ...prev,
                  [key]: e.target.checked
                }))}
                className="w-4 h-4 text-orange-500 border-slate-300 rounded focus:ring-orange-500"
              />
              <span className="text-sm text-slate-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Preview Stats */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <h2 className="font-bold text-slate-800 mb-4">Önizleme</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{stats.totalLessons}</p>
            <p className="text-sm text-slate-500">Toplam Ders</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.completedLessons}</p>
            <p className="text-sm text-slate-500">Tamamlanan</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">%{stats.attendanceRate}</p>
            <p className="text-sm text-slate-500">Katılım Oranı</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-orange-500">₺{stats.totalEarnings.toLocaleString('tr-TR')}</p>
            <p className="text-sm text-slate-500">Toplam Tutar</p>
          </div>
        </div>
        
        {reportType === 'student' && !selectedStudent && (
          <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200 text-amber-700 text-sm">
            âš ï¸ Ã–ÄŸrenci raporu iÃ§in bir Ã¶ÄŸrenci seÃ§in
          </div>
        )}
      </div>
    </div>
  );
};
