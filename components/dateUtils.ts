// Tarih yardımcıları — tümü yerel saat dilimine göre çalışır (Türkiye: UTC+3).
// Not: toISOString() UTC döndürdüğü için yerel tarih anahtarı üretmekte kullanılmamalı.

// Bu haftanın Pazartesi 00:00'ı (Türkiye'de hafta Pazartesi başlar)
export const getWeekStart = (ref: Date = new Date()): Date => {
  const start = new Date(ref);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
};

// Ayın ilk günü 00:00
export const getMonthStart = (ref: Date = new Date()): Date =>
  new Date(ref.getFullYear(), ref.getMonth(), 1);

// Bir sonraki ayın ilk günü 00:00 (aralık sonu olarak "<" ile kullanılır)
export const getNextMonthStart = (ref: Date = new Date()): Date =>
  new Date(ref.getFullYear(), ref.getMonth() + 1, 1);

// Yerel tarihi YYYY-MM-DD biçiminde döndürür (<input type="date"> için)
export const toLocalDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// "YYYY-MM-DD" metnini yerel gece yarısı olarak çözer (new Date('YYYY-MM-DD') UTC kabul eder)
export const parseLocalDate = (value: string): Date => {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
