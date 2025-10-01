export async function lookupWord(word) {
  if (!word || typeof word !== 'string') {
    throw new Error('Некорректное слово');
  }

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
    return data[0];
  } catch (error) {
    console.error('Ошибка поиска:', error);
    throw error;
  }
}
