// lookup.js — модуль для поиска слова в словаре

export async function lookupWord(word) {
  if (!word || typeof word !== 'string') return null;

  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Слово не найдено');
      } else {
        throw new Error('Ошибка сети');
      }
    }
    const data = await response.json();
    return data[0]; // берем первый результат
  } catch (error) {
    console.error('Ошибка поиска:', error);
    throw error;
  }
}

// Воспроизведение аудио
export function playAudio(audioUrl) {
  if (audioUrl) {
    const audio = new Audio(audioUrl);
    audio.play().catch(e => {
      // fallback: Web Speech API
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(wordFromContext);
        utterance.lang = 'en-US';
        speechSynthesis.speak(utterance);
      }
    });
  }
}
