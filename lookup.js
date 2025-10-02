export async function lookupWord(word) {
  if (!word?.trim()) throw new Error('Empty word');
  
  const cleanWord = word.trim().toLowerCase();
  
  // Dictionary API through new CORS proxy (api.codetabs.com/v1/proxy?quest=...)
  const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`)}`;
  
  try {
    const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('Network error');
    
    const data = await response.json();
    if (!data[0]) throw new Error('Word not found');
    const entry = data[0];
    
    // Translation
    const transRes = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      body: JSON.stringify({
        q: cleanWord,
        source: 'en',
        target: 'ru',
        format: 'text'
      }),
      headers: { 'Content-Type': 'application/json' }
    });
    const transData = await transRes.json();
    const translation = transData.translatedText || '';
    
    // Synonyms
    const synonyms = await getSynonyms(cleanWord);

    return {
      word: entry.word,
      phonetic: entry.phonetic || '',
      audioUrl: entry.phonetics?.find(p => p.audio)?.audio || '',
      translation,
      meanings: entry.meanings || [],
      synonyms
    };
  } catch (error) {
    console.error('Lookup error:', error);
    throw new Error('Не удалось найти слово или фразу.');
  }
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
