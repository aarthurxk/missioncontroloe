/**
 * Feriados nacionais (BR), estaduais (PE) e municipais (Recife).
 * Feriados móveis calculados via algoritmo de Meeus/Jones/Butcher.
 */

export interface HolidayInfo {
  holiday: boolean;
  name?: string;
  scope?: "nacional" | "estadual" | "municipal";
}

export interface HolidayEntry {
  date: Date;
  name: string;
  scope: "nacional" | "estadual" | "municipal";
}

// ── Easter (Meeus/Jones/Butcher) ──
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
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=Mar, 4=Apr
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

type Scope = "nacional" | "estadual" | "municipal";

function getHolidaysForYear(year: number): HolidayEntry[] {
  const easter = easterDate(year);
  const mk = (m: number, d: number, name: string, scope: Scope): HolidayEntry => ({
    date: new Date(year, m - 1, d),
    name,
    scope,
  });
  const mkFromEaster = (offset: number, name: string, scope: Scope): HolidayEntry => {
    const d = addDays(easter, offset);
    return { date: d, name, scope };
  };

  return [
    // ── Nacionais fixos ──
    mk(1, 1, "Confraternização Universal", "nacional"),
    mk(4, 21, "Tiradentes", "nacional"),
    mk(5, 1, "Dia do Trabalho", "nacional"),
    mk(9, 7, "Independência do Brasil", "nacional"),
    mk(10, 12, "Nossa Sra. Aparecida", "nacional"),
    mk(11, 2, "Finados", "nacional"),
    mk(11, 15, "Proclamação da República", "nacional"),
    mk(11, 20, "Dia da Consciência Negra", "nacional"),
    mk(12, 25, "Natal", "nacional"),

    // ── Nacionais móveis ──
    mkFromEaster(-48, "Segunda de Carnaval", "nacional"),
    mkFromEaster(-47, "Terça de Carnaval", "nacional"),
    mkFromEaster(-46, "Quarta de Cinzas", "nacional"),
    mkFromEaster(-2, "Sexta-feira Santa", "nacional"),
    mkFromEaster(0, "Páscoa", "nacional"),
    mkFromEaster(60, "Corpus Christi", "nacional"),

    // ── Estaduais (PE) ──
    mk(3, 6, "Revolução Pernambucana", "estadual"),
    mk(6, 24, "São João", "estadual"),

    // ── Municipais (Recife) ──
    mk(7, 16, "Nossa Sra. do Carmo", "municipal"),
    mk(12, 8, "N. Sra. da Conceição", "municipal"),
  ];
}

// Cache per year
const cache = new Map<number, Map<string, HolidayEntry>>();

function ensureYear(year: number): Map<string, HolidayEntry> {
  if (!cache.has(year)) {
    const map = new Map<string, HolidayEntry>();
    for (const h of getHolidaysForYear(year)) {
      map.set(dateKey(h.date), h);
    }
    cache.set(year, map);
  }
  return cache.get(year)!;
}

/**
 * Check if a date (in Recife local time components: year, month, day) is a holiday.
 * Pass a Date whose getFullYear/getMonth/getDate reflect Recife local date.
 */
export function isHoliday(date: Date): HolidayInfo {
  const map = ensureYear(date.getFullYear());
  const entry = map.get(dateKey(date));
  if (entry) return { holiday: true, name: entry.name, scope: entry.scope };
  return { holiday: false };
}

/**
 * Get the next N holidays from today (Recife time).
 */
export function getNextHolidays(count: number): HolidayEntry[] {
  const now = new Date();
  // Recife = UTC-3
  const recifeNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const todayKey = dateKey(new Date(recifeNow.getUTCFullYear(), recifeNow.getUTCMonth(), recifeNow.getUTCDate()));

  const results: HolidayEntry[] = [];
  const startYear = recifeNow.getUTCFullYear();

  for (let y = startYear; y <= startYear + 2 && results.length < count; y++) {
    const holidays = getHolidaysForYear(y).sort((a, b) => a.date.getTime() - b.date.getTime());
    for (const h of holidays) {
      if (dateKey(h.date) >= todayKey) {
        // Avoid duplicates (same date key)
        if (!results.some((r) => dateKey(r.date) === dateKey(h.date))) {
          results.push(h);
        }
      }
      if (results.length >= count) break;
    }
  }
  return results;
}

/**
 * Check if a date (year, month 0-indexed, day) is a holiday.
 * Convenience for checking from year/month/day numbers.
 */
export function isHolidayYMD(year: number, month: number, day: number): HolidayInfo {
  return isHoliday(new Date(year, month, day));
}

/**
 * Scope label in PT-BR
 */
export function scopeLabel(scope: "nacional" | "estadual" | "municipal"): string {
  switch (scope) {
    case "nacional": return "Nacional";
    case "estadual": return "PE";
    case "municipal": return "Recife";
  }
}
