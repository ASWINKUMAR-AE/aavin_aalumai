import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../constants/Config';
import enDict from '../locales/en.json';
import taDict from '../locales/ta.json';
import {
  IndicTransLang,
  toIndicTransCode,
  toAppLangCode,
  loadIndicTransCache,
  translateWithIndicTrans2,
  translateInstant as fastTranslateInstant,
  INDICTRANS2_MODELS,
  IndicTransResult,
} from '../services/indicTrans2Service';

export type LanguageCode = 'en' | 'ta';

interface LanguageContextType {
  language: LanguageCode;
  indicTransCode: IndicTransLang;
  modelName: string;
  isTranslating: boolean;
  setLanguage: (lang: LanguageCode | IndicTransLang) => Promise<void>;
  toggleLanguage: () => Promise<void>;
  t: (keyPath: string, fallback?: string) => string;
  translateDynamic: (text: string, targetLang?: LanguageCode | IndicTransLang) => Promise<IndicTransResult>;
  translateInstant: (text: string, targetLang?: LanguageCode | IndicTransLang) => string;
}

const dictionaries: Record<LanguageCode, any> = {
  en: enDict,
  ta: taDict,
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  indicTransCode: 'eng_Latn',
  modelName: INDICTRANS2_MODELS.EN_TO_INDIC_DISTILLED,
  isTranslating: false,
  setLanguage: async () => {},
  toggleLanguage: async () => {},
  t: (keyPath: string, fallback?: string) => fallback || keyPath,
  translateDynamic: async (text: string) => ({
    originalText: text,
    translatedText: text,
    sourceLang: 'eng_Latn',
    targetLang: 'tam_Taml',
    model: INDICTRANS2_MODELS.EN_TO_INDIC_DISTILLED,
    fromCache: false,
    engine: 'IndicTrans2-FastJS',
  }),
  translateInstant: (text: string) => text,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>('en');
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    loadLanguagePreference();
    loadIndicTransCache();
  }, []);

  const loadLanguagePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem(Config.STORAGE_KEYS.LANGUAGE);
      if (saved === 'en' || saved === 'ta' || saved === 'eng_Latn' || saved === 'tam_Taml') {
        setLanguageState(toAppLangCode(saved));
      }
    } catch (e) {
      console.warn('Failed to load language preference:', e);
    }
  };

  const setLanguage = async (newLang: LanguageCode | IndicTransLang) => {
    const appCode = toAppLangCode(newLang);
    setLanguageState(appCode);
    try {
      await AsyncStorage.setItem(Config.STORAGE_KEYS.LANGUAGE, appCode);
    } catch (e) {
      console.warn('Failed to save language preference:', e);
    }
  };

  const toggleLanguage = async () => {
    const next = language === 'en' ? 'ta' : 'en';
    await setLanguage(next);
  };

  // Structured key translation (from locales JSON)
  const t = (keyPath: string, fallback?: string): string => {
    const dict = dictionaries[language] || dictionaries.en;
    const parts = keyPath.split('.');
    let current: any = dict;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        // Fallback to English if translation is missing in Tamil
        let enCurrent: any = dictionaries.en;
        for (const p of parts) {
          if (enCurrent && typeof enCurrent === 'object' && p in enCurrent) {
            enCurrent = enCurrent[p];
          } else {
            // Also try IndicTrans2 fast translator before giving up
            return fallback || fastTranslateInstant(keyPath, language) || keyPath;
          }
        }
        if (typeof enCurrent === 'string') {
          return language === 'ta' ? fastTranslateInstant(enCurrent, 'tam_Taml') : enCurrent;
        }
        return fallback || keyPath;
      }
    }

    return typeof current === 'string' ? current : (fallback || keyPath);
  };

  // Dynamic sentence / phrase translation powered by IndicTrans2
  const translateDynamic = async (
    text: string,
    targetLang?: LanguageCode | IndicTransLang
  ): Promise<IndicTransResult> => {
    const tgt = targetLang ? toIndicTransCode(targetLang) : toIndicTransCode(language);
    const src = tgt === 'tam_Taml' ? 'eng_Latn' : 'tam_Taml';

    setIsTranslating(true);
    try {
      return await translateWithIndicTrans2(text, {
        sourceLang: src,
        targetLang: tgt,
      });
    } finally {
      setIsTranslating(false);
    }
  };

  // Synchronous translation for fast UI inline rendering
  const translateInstant = (
    text: string,
    targetLang?: LanguageCode | IndicTransLang
  ): string => {
    const tgt = targetLang ? toIndicTransCode(targetLang) : toIndicTransCode(language);
    return fastTranslateInstant(text, tgt);
  };

  const indicTransCode = toIndicTransCode(language);
  const modelName = language === 'ta'
    ? INDICTRANS2_MODELS.EN_TO_INDIC_DISTILLED
    : INDICTRANS2_MODELS.INDIC_TO_EN_DISTILLED;

  return (
    <LanguageContext.Provider
      value={{
        language,
        indicTransCode,
        modelName,
        isTranslating,
        setLanguage,
        toggleLanguage,
        t,
        translateDynamic,
        translateInstant,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => useContext(LanguageContext);
