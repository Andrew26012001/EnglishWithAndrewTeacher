// lookup.js
/**
 * lookup.js — надёжный модуль для получения данных о слове:
 * - основной словарь: https://api.dictionaryapi.dev
 * - перевод: lingva.ml -> MyMemory -> предложения (Datamuse)
 * - синонимы: Datamuse
 *
 * Возвращаемая структура:
 * {
 *   word: string,
 *   phonetic: string,
 *   audioUrl: string,
 *   translation: string[],        // всегда массив
 *   meanings: Array,             // как приходит из Dictionary API
 *   synonyms: string[],          // массив (max 5)
 *   suggestions?: string[]       // опционально — suggestions от Datamuse
 * }
 */

async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Извлечь audio url из поля phonetics (если есть)
 */
function extractAudioUrl(entry) {
  if (!entry) return '';
  // entry.phonetics может быть строкой или массивом
  if (Array.isArray(entry.phonetics)) {
    const phon = entry.phonetics.find(p => p.audio && p.audio.trim());
    return phon ? phon.audio : '';
  }
  return '';
}

/**
 * Извлечь фонетику из entry
 */
function extractPhonetic(entry) {
  if (!entry) return '';
  if (entry.phonetic) return entry.phonetic;
  if (Array.isArray(entry.phonetics)) {
    const phon = entry.phonetics.find(p => p.text && p.text.trim());
    return phon ? phon.text : '';
  }
  return '';
}

/**
 * Нормализация строки/массивов переводов в массив
 */
function normalizeTranslations(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.filter(Boolean);
  if (typeof input === 'string') return input ? [input] : [];
  return [];
}

/**
 * Основная функция поиска слова
 */
export async function lookupWord(word) {
  if (!word || !String(word).trim()) throw new Error('Empty word');

  const cleanWord = String(word).trim().toLowerCase();

  // Начальный "пустой" результат
  let entry = {
    word: cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1),
    phonetic: '',
    phonetics: [],
    meanings: [],
    synonyms: []
  };

  // 1) Попробуем Dictionary API
  try {
    const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`;
    const res = await fetchWithTimeout(apiUrl, {}, 5000);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        // Берём первый результат как основной
        entry = data[0];
        // В некоторых случаях API возвращает word в нижнем регистре
        if (!entry.word) entry.word = cleanWord;
        // Подтянем синонимы отдельно (Datamuse)
        try {
          entry.synonyms = await getSynonyms(cleanWord);
        } catch (e) {
          entry.synonyms = entry.synonyms || [];
        }
      }
    } else {
      // non-ok — просто логируем и продолжим (будем пытаться перевести)
      console.warn(`Dictionary API responded with status ${res.status} for ${cleanWord}`);
    }
  } catch (err) {
    console.warn('Dictionary API failed:', err);
  }

  // 2) Переводы и предложения
  const transResult = await getTranslations(cleanWord);

  // Подготовка финального объекта (нормализуем типы)
  const final = {
    word: entry.word || (cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1)),
    phonetic: extractPhonetic(entry) || '',
    audioUrl: extractAudioUrl(entry) || '',
    translation: normalizeTranslations(transResult.translation),
    meanings: Array.isArray(entry.meanings) ? entry.meanings : [],
    synonyms: Array.isArray(entry.synonyms) ? entry.synonyms : [],
  };

  if (Array.isArray(transResult.suggestions) && transResult.suggestions.length) {
    final.suggestions = transResult.suggestions;
  }

  return final;
}

/**
 * Попытки получить перевод:
 * 1) lingva.ml (если доступен)
 * 2) MyMemory
 * 3) если перевод не найден — предложения из Datamuse (sp + ml)
 *
 * Возвращаем { translation: string[], suggestions: string[] }
 */
async function getTranslations(word) {
  const translations = [];
  let suggestions = [];

  // 1) Lingva.ml
  try {
    const lingvaUrl = `https://lingva.ml/api/v1/en/ru/${encodeURIComponent(word)}`;
    const lingvaRes = await fetchWithTimeout(lingvaUrl, {}, 5000);
    if (lingvaRes.ok) {
      const lingvaData = await lingvaRes.json();
      if (lingvaData && lingvaData.translation) {
        translations.push(lingvaData.translation);
        if (lingvaData.info && Array.isArray(lingvaData.info.extraTranslations)) {
          translations.push(...lingvaData.info.extraTranslations.slice(0, 2));
        }
        return { translation: normalizeTranslations(translations), suggestions: [] };
      }
    }
  } catch (e) {
    console.warn('Lingva.ml failed:', e);
  }

  // 2) MyMemory fallback
  try {
    const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|ru`;
    const myMemoryRes = await fetchWithTimeout(myMemoryUrl, {}, 5000);
    if (myMemoryRes.ok) {
      const myMemoryData = await myMemoryRes.json();
      if (myMemoryData && myMemoryData.responseData && myMemoryData.responseData.translatedText) {
        translations.push(myMemoryData.responseData.translatedText);
      }
      if (myMemoryData && Array.isArray(myMemoryData.matches)) {
        myMemoryData.matches.slice(0, 2).forEach(match => {
          if (match.translation) translations.push(match.translation);
        });
      }
      if (translations.length) return { translation: normalizeTranslations(translations), suggestions: [] };
    }
  } catch (e) {
    console.warn('MyMemory failed:', e);
  }

  // 3) Если перевод не найден, собираем предложения/похожее из Datamuse
  try {
    const spUrl = `https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&max=3`;
    const spRes = await fetchWithTimeout(spUrl, {}, 5000);
    if (spRes.ok) {
      const spData = await spRes.json();
      suggestions = suggestions.concat(Array.isArray(spData) ? spData.map(i => i.word) : []);
    }
  } catch (e) {
    // silent
  }

  try {
    const mlUrl = `https://api.datamuse.com/words?ml=${encodeURIComponent(word)}&max=3`;
    const mlRes = await fetchWithTimeout(mlUrl, {}, 5000);
    if (mlRes.ok) {
      const mlData = await mlRes.json();
      suggestions = suggestions.concat(Array.isArray(mlData) ? mlData.map(i => i.word) : []);
    }
  } catch (e) {
    // silent
  }

  // unique suggestions
  suggestions = suggestions.filter((v, i, a) => a.indexOf(v) === i && !!v);

  return { translation: normalizeTranslations(translations), suggestions };
}

/**
 * Получить синонимы через Datamuse (макс 5)
 */
export async function getSynonyms(word) {
  try {
    const url = `https://api.datamuse.com/words?rel_syn=${encodeURIComponent(word)}&max=10`;
    const res = await fetchWithTimeout(url, {}, 5000);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    const words = data.map(item => item.word).filter(Boolean);
    // Возвращаем максимум 5 наиболее релевантных
    return words.slice(0, 5);
  } catch (e) {
    return [];
  }
}
