/**
 * Brazilian holidays (national, state PE, municipal Recife).
 * Ported from src/lib/holidays.ts for edge function use.
 */

function easterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface HolidayEntry {
  date: Date;
  name: string;
}

function getHolidaysForYear(year: number): HolidayEntry[] {
  const easter = easterDate(year);
  const mk = (m: number, d: number, name: string): HolidayEntry => ({
    date: new Date(year, m - 1, d),
    name,
  });
  const mkE = (offset: number, name: string): HolidayEntry => ({
    date: addDays(easter, offset),
    name,
  });

  return [
    // Nacional fixos
    mk(1, 1, "Confraternização Universal"),
    mk(4, 21, "Tiradentes"),
    mk(5, 1, "Dia do Trabalho"),
    mk(9, 7, "Independência do Brasil"),
    mk(10, 12, "Nossa Sra. Aparecida"),
    mk(11, 2, "Finados"),
    mk(11, 15, "Proclamação da República"),
    mk(11, 20, "Dia da Consciência Negra"),
    mk(12, 25, "Natal"),
    // Nacional móveis
    mkE(-48, "Segunda de Carnaval"),
    mkE(-47, "Terça de Carnaval"),
    mkE(-46, "Quarta de Cinzas"),
    mkE(-2, "Sexta-feira Santa"),
    mkE(0, "Páscoa"),
    mkE(60, "Corpus Christi"),
    // Estadual PE
    mk(3, 6, "Revolução Pernambucana"),
    mk(6, 24, "São João"),
    // Municipal Recife
    mk(7, 16, "Nossa Sra. do Carmo"),
    mk(12, 8, "N. Sra. da Conceição"),
  ];
}

const cache = new Map<number, Map<string, string>>();

function ensureYear(year: number): Map<string, string> {
  if (!cache.has(year)) {
    const map = new Map<string, string>();
    for (const h of getHolidaysForYear(year)) {
      map.set(dateKey(h.date), h.name);
    }
    cache.set(year, map);
  }
  return cache.get(year)!;
}

/**
 * Check if a local date (year, month 0-indexed, day) is a holiday.
 */
export function isHoliday(year: number, month: number, day: number): { holiday: boolean; name?: string } {
  const map = ensureYear(year);
  const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const name = map.get(key);
  if (name) return { holiday: true, name };
  return { holiday: false };
}

/**
 * Convert a UTC Date to Recife local date components (UTC-3).
 */
export function toRecifeLocal(utcDate: Date): { year: number; month: number; day: number; hours: number; minutes: number } {
  const recife = new Date(utcDate.getTime() - 3 * 60 * 60 * 1000);
  return {
    year: recife.getUTCFullYear(),
    month: recife.getUTCMonth(),
    day: recife.getUTCDate(),
    hours: recife.getUTCHours(),
    minutes: recife.getUTCMinutes(),
  };
}
