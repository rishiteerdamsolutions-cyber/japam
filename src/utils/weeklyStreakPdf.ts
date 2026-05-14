import { jsPDF } from 'jspdf';
import type { DeityId } from '../data/deities';
import { getDeity } from '../data/deities';
import { istWeekdayLongFromYmd, istWeekdayShortFromYmd } from '../lib/weeklyStreakIst';
import { downloadMantraPdf } from './pdfExport';

export async function downloadWeeklyStreakDayJapaPdf(opts: {
  deityId: DeityId;
  ymd: string;
  /** Shown in PDF subtitle line */
  streakNote: string;
}): Promise<void> {
  const d = getDeity(opts.deityId);
  const day = istWeekdayLongFromYmd(opts.ymd);
  await downloadMantraPdf(d.mantra, 108, d.name, undefined, null, {
    matchTierNote: `${opts.streakNote} · IST ${opts.ymd} (${day})`,
    fileStem: `weekly-streak-${opts.deityId}-${opts.ymd}`,
  });
}

export function downloadWeeklyStreakWeekCardPdf(opts: {
  weekMondayIst: string;
  rows: { ymd: string; deityId: DeityId; done: boolean }[];
  footer?: string;
}): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 48;
  let y = margin;
  doc.setFontSize(18);
  doc.setTextColor(180, 120, 40);
  doc.text('Weekly streak — complete (IST)', margin, y);
  y += 28;
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(`Week starting Monday ${opts.weekMondayIst} (Asia/Kolkata)`, margin, y);
  y += 22;
  doc.setFontSize(10);
  for (const r of opts.rows) {
    const deity = getDeity(r.deityId);
    const line = `${istWeekdayShortFromYmd(r.ymd)} ${r.ymd}: ${deity.name} — ${r.done ? '108 japas done' : '—'}`;
    const parts = doc.splitTextToSize(line, 520);
    for (const p of parts) {
      if (y > 760) {
        doc.addPage();
        y = margin;
      }
      doc.text(p, margin, y);
      y += 15;
    }
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    const mantraParts = doc.splitTextToSize(`Mantra: ${deity.mantra}`, 520);
    for (const p of mantraParts) {
      if (y > 760) {
        doc.addPage();
        y = margin;
      }
      doc.text(p, margin + 8, y);
      y += 13;
    }
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    y += 6;
  }
  if (opts.footer) {
    y += 10;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    for (const p of doc.splitTextToSize(opts.footer, 520)) {
      if (y > 760) {
        doc.addPage();
        y = margin;
      }
      doc.text(p, margin, y);
      y += 14;
    }
  }
  doc.save(`japam-weekly-streak-week-${opts.weekMondayIst}.pdf`);
}
