export async function lookupWord(word) {
  if (!word?.trim()) throw new Error('Empty word');
  
  const cleanWord = word.trim().toLowerCase();
  
  // Dictionary API
  const dictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`);
  if (!dictRes.ok) throw new Error('Word not found');
  
  const dictData = await dictRes.json();
  const entry = dictData[0];
  
  // Translate via Google (unofficial)
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
}
