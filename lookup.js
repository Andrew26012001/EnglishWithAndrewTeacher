export async function lookupWord(word) {
  if (!word?.trim()) throw new Error('Empty word');
  
  const cleanWord = word.trim().toLowerCase();
  
  // Используем CORS-прокси
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`)}`;
  
  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error('Network error');
    }
    
    const data = await response.json();
    const rawContent = data.contents;
    
    if (!rawContent) {
      throw new Error('No content received');
    }
    
    const dictData = JSON.parse(rawContent); // Распарсим JSON из contents
    const entry = dictData[0];
    
    // Перевод через Google (unofficial)
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
    throw new Error('Не удалось найти слово. Проверьте интернет или попробуйте другое слово.');
  }
}
