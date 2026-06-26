import React, { createContext, useContext, useState, useCallback } from 'react';
import { getSetting, setSetting, getCalendarSystem, setCalendarSystem } from '@/data/repository';
import { setLangCache, setCalendarCache } from '@/utils/date';
import { STRINGS } from './strings';

export type CalendarSystem = 'gregorian' | 'ethiopian';

export const LANGS = ['en', 'am', 'om', 'sw'] as const;
export type Lang = (typeof LANGS)[number];

// Display names shown in the picker (each in its own script).
export const LANG_NAMES: Record<Lang, string> = {
  en: 'English',
  am: 'አማርኛ',
  om: 'Afaan Oromoo',
  sw: 'Kiswahili',
};

const LANG_KEY = 'app_language';

export function isLang(v: unknown): v is Lang {
  return typeof v === 'string' && (LANGS as readonly string[]).includes(v);
}

/** Look up a key for a language, falling back to English then the key itself. */
export function translate(lang: Lang, key: string, params?: Record<string, string | number>): string {
  const row = STRINGS[key];
  let s = (row && (row[lang] ?? row.en)) ?? key;
  if (params) {
    for (const k of Object.keys(params)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(params[k]));
    }
  }
  return s;
}

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  calendar: CalendarSystem;
  setCalendar: (c: CalendarSystem) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const Ctx = createContext<LangCtx>({ lang: 'en', setLang: () => {}, calendar: 'gregorian', setCalendar: () => {}, t: (k) => k });

export function LanguageProvider({
  children,
  initialLang = 'en',
  initialCalendar = 'gregorian',
}: { children: React.ReactNode; initialLang?: Lang; initialCalendar?: CalendarSystem }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const [calendar, setCalState] = useState<CalendarSystem>(initialCalendar);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    setLangCache(l); // keep date.ts label formatter in sync
    void setSetting(LANG_KEY, l);
  }, []);

  const setCalendar = useCallback((c: CalendarSystem) => {
    setCalState(c);
    setCalendarCache(c);
    void setCalendarSystem(c);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(lang, key, params),
    [lang],
  );

  return <Ctx.Provider value={{ lang, setLang, calendar, setCalendar, t }}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  return useContext(Ctx);
}

/** Convenience: just the t() function. */
export function useT() {
  return useContext(Ctx).t;
}

/**
 * Localize a stored name if it matches a default seeded name; otherwise return
 * it unchanged (so user-renamed categories/items keep their custom text).
 */
export function useLocalizeName() {
  const { t } = useContext(Ctx);
  return (name: string) => {
    const key = `def.${name}`;
    return STRINGS[key] ? t(key) : name;
  };
}

/** Read the stored language at startup (before the provider mounts). */
export async function getStoredLang(): Promise<Lang> {
  const v = await getSetting(LANG_KEY);
  return isLang(v) ? v : 'en';
}

/** Read the stored calendar system at startup. */
export async function getStoredCalendar(): Promise<CalendarSystem> {
  return getCalendarSystem();
}
