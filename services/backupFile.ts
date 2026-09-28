import { BackupData, FullBackupData } from '../types';
import { dbService } from './db';

export interface ParsedBackup {
  data: BackupData | FullBackupData;
  kind: 'full' | 'single';
  teachers: number;
  students: number;
  lessons: number;
  createdAt: string | null;
  teacherName: string | null;
}

// Yedek dosyasını okur ve doğrular. Desteklenenler: tam yedek (v3, otomatik yedekler dahil),
// Google Drive kopyası ve eski sürümün tek profilli yedeği (v2).
export function parseBackupText(text: string): ParsedBackup {
  let data: any;
  try {
    data = JSON.parse(text.replace(/^﻿/, ''));
  } catch {
    throw new Error('Dosya okunamadı. Lütfen DersTakipCO\'dan indirdiğiniz .json yedek dosyasını seçin.');
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Bu dosya bir DersTakipCO yedeği değil.');
  }

  if (Array.isArray(data.teachers) && Array.isArray(data.students) && Array.isArray(data.lessons)) {
    return {
      data: data as FullBackupData,
      kind: 'full',
      teachers: data.teachers.length,
      students: data.students.length,
      lessons: data.lessons.length,
      createdAt: data.uploadedAt || data.createdAt || null,
      teacherName: null,
    };
  }

  if (data.teacher && data.teacher.id && Array.isArray(data.students) && Array.isArray(data.lessons)) {
    return {
      data: data as BackupData,
      kind: 'single',
      teachers: 1,
      students: data.students.length,
      lessons: data.lessons.length,
      createdAt: data.createdAt || null,
      teacherName: data.teacher.name || null,
    };
  }

  throw new Error('Bu dosya bir DersTakipCO yedeği değil.');
}

export const readBackupFile = (file: File): Promise<ParsedBackup> =>
  new Promise((resolve, reject) => {
    if (file.size > 50 * 1024 * 1024) {
      reject(new Error('Dosya çok büyük. Lütfen DersTakipCO yedek dosyasını seçin.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(parseBackupText(String(reader.result || '')));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Dosya okunamadı.'));
    reader.readAsText(file, 'utf-8');
  });

// Geri yüklemeden önce mevcut verinin kopyasını Yedekler klasörüne yazar (veri varsa)
export async function snapshotBeforeRestore(label: string): Promise<void> {
  if (dbService.getTeachers().length === 0 || !window.derstakip?.snapshotBackup) return;
  await window.derstakip.snapshotBackup(JSON.stringify(dbService.exportAll(), null, 2), label);
}

export const formatBackupDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;

export function describeBackup(p: ParsedBackup): string {
  const date = formatBackupDate(p.createdAt);
  const what = p.kind === 'single'
    ? `"${p.teacherName || 'Profil'}" profili: ${p.students} öğrenci, ${p.lessons} ders`
    : `${p.teachers} profil, ${p.students} öğrenci, ${p.lessons} ders`;
  return date ? `${date} tarihli yedek — ${what}.` : `${what}.`;
}
