export async function lookupWord(word) {
  if (!word?.trim()) throw new Error('Empty word');
  
  const cleanWord = word.trim().toLowerCase();
  
  // Direct fetch to Dictionary API (CORS allowed)
  const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`;
  
  let entry = { word: cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1), phonetic: '', audioUrl: '', meanings: [], synonyms: [] };
  try {
    const response = await fetch(apiUrl, { signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      const data = await response.json();
      if (data[0]) {
        entry = data[0];
        entry.synonyms = await getSynonyms(cleanWord);
      }
    }
  } catch (error) {
    console.warn('Dictionary API failed:', error);
    // Continue with translation and suggestions
  }
  
  const transResult = await getTranslations(cleanWord);
  
  return {
    word: entry.word,
    phonetic: entry.phonetic || '',
    audioUrl: entry.phonetics?.find(p => p.audio)?.audio || '',
    translation: transResult.translation,
    meanings: entry.meanings || [],
    synonyms: entry.synonyms || [],
    ...(transResult.suggestions && { suggestions: transResult.suggestions })
  };
}

async function getTranslations(word) {
  let translations = [];
  let suggestions = [];

  // Try Lingva.ml first
  try {
    const lingvaUrl = `https://lingva.ml/api/v1/en/ru/${encodeURIComponent(word)}`;
    const lingvaRes = await fetch(lingvaUrl, { signal: AbortSignal.timeout(5000) });
    if (lingvaRes.ok) {
      const lingvaData = await lingvaRes.json();
      translations.push(lingvaData.translation);
      if (lingvaData.info && lingvaData.info.extraTranslations) {
        translations = translations.concat(lingvaData.info.extraTranslations.slice(0, 2));
      }
      return { translation: translations };
    }
  } catch (error) {
    console.warn('Lingva.ml failed:', error);
  }

  // Fallback to MyMemory
  try {
    const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|ru`;
    const myMemoryRes = await fetch(myMemoryUrl, { signal: AbortSignal.timeout(5000) });
    if (myMemoryRes.ok) {
      const myMemoryData = await myMemoryRes.json();
      translations.push(myMemoryData.responseData.translatedText);
      if (myMemoryData.matches) {
        myMemoryData.matches.slice(0, 2).forEach(match => {
          if (match.translation) translations.push(match.translation);
        });
      }
      return { translation: translations };
    }
  } catch (error) {
    console.warn('MyMemory failed:', error);
  }

  // If no translation, get suggestions from Datamuse
  try {
    const spUrl = `https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&max=3`;
    const spRes = await fetch(spUrl);
    const spData = await spRes.json();
    suggestions = suggestions.concat(spData.map(item => item.word));
  } catch (e) {}
  
  try {
    const mlUrl = `https://api.datamuse.com/words?ml=${encodeURIComponent(word)}&max=3`;
    const mlRes = await fetch(mlUrl);
    const mlData = await mlRes.json();
    suggestions = suggestions.concat(mlData.map(item => item.word));
  } catch (e) {}

  return { translation: translations, suggestions: suggestions.filter((v, i, a) => a.indexOf(v) === i) }; // Unique suggestions
}

export async function getSynonyms(word) {
  try {
    const response = await fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(word)}`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.slice(0, 5).map(item => item.word);
  } catch (e) {
    return [];
  }
}
