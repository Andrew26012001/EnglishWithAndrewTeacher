export async function lookupWord(word) {
  if (!word?.trim()) throw new Error('Empty word');
  
  const cleanWord = word.trim().toLowerCase();
  
  // Dictionary API через CORS-прокси
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`)}`;
  
  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error('Network error');
    
    const data = await response.json();
    const rawContent = data.contents;
    if (!rawContent) throw new Error('No content');
    
    const dictData = JSON.parse(rawContent);
    const entry = dictData[0];
    
    // Перевод
    const transRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ru&dt=t&q=${encodeURIComponent(cleanWord)}`);
    const transData = await transRes.json();
    const translation = transData?.[0]?.[0]?.[0] || '';
    
    return {
      word: entry.word,
      phonetic: entry.phonetic || '',
      audioUrl: entry.phonetics?.find(p => p.audio)?.audio || '',
      translation,
      meanings: entry.meanings || []
    };
  } catch (error) {
    console.error('Lookup error:', error);
    throw new Error('Не удалось найти слово.');
  }
}

export async function getSynonyms(word) {
  try {
    const response = await fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(word)}`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.slice(0, 10).map(item => item.word);
  } catch (e) {
    return [];
  }
}
