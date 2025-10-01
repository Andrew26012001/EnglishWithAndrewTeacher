// dictionary.js — наш внутренний API для работы со словарём

class Dictionary {
  constructor() {
    this.storageKey = 'wordDictionary_v2';
    this.words = [];
    this.loadFromStorage();
  }

  // Загрузить из localStorage
  loadFromStorage() {
    const data = localStorage.getItem(this.storageKey);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        this.words = Array.isArray(parsed.words) ? parsed.words : [];
      } catch (e) {
        console.error('Ошибка загрузки словаря', e);
        this.words = [];
      }
    }
  }

  // Сохранить в localStorage
  saveToStorage() {
    const data = { words: this.words };
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  // Добавить слово
  addWord(wordData) {
    const word = {
      id: this.generateId(),
      word: wordData.word.trim(),
      translation: wordData.translation?.trim() || '',
      explanation: wordData.explanation?.trim() || '',
      examples: Array.isArray(wordData.examples) 
        ? wordData.examples.map(e => e.trim()).filter(e => e) 
        : [],
      audioUrl: wordData.audioUrl?.trim() || '',
      createdAt: Date.now(),
      
      // Параметры SRS (Spaced Repetition System)
      nextReview: Date.now(), // повторить сразу
      interval: 0,            // 0 дней — первый раз
      ease: 2.5,
      repetitions: 0
    };

    this.words.push(word);
    this.saveToStorage();
    return word;
  }

  // Получить все слова
  getWords() {
    return [...this.words]; // возвращаем копию
  }

  // Получить слово по ID
  getWordById(id) {
    return this.words.find(w => w.id === id);
  }

  // Обновить слово
  updateWord(id, updates) {
    const index = this.words.findIndex(w => w.id === id);
    if (index !== -1) {
      this.words[index] = { ...this.words[index], ...updates };
      this.saveToStorage();
      return this.words[index];
    }
    return null;
  }

  // Удалить слово
  deleteWord(id) {
    this.words = this.words.filter(w => w.id !== id);
    this.saveToStorage();
  }

  // Получить слова, которые пора повторить (для квиза)
  getWordsDueForReview() {
    const now = Date.now();
    return this.words.filter(word => word.nextReview <= now);
  }

  // Обновить SRS-параметры после ответа в квизе
  updateSRS(id, grade) {
    // grade: 0 = сложно, 1 = нормально, 2 = легко
    const word = this.getWordById(id);
    if (!word) return;

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000; // миллисекунд в дне

    if (grade === 0) {
      // Сложно — сброс
      word.interval = 1;
      word.ease = Math.max(1.3, word.ease - 0.2);
      word.repetitions = 0;
    } else {
      if (word.repetitions === 0) {
        word.interval = 1;
      } else if (word.repetitions === 1) {
        word.interval = 6;
      } else {
        word.interval = Math.round(word.interval * word.ease);
      }
      word.ease = grade === 2 ? word.ease + 0.1 : word.ease;
      word.repetitions += 1;
    }

    word.nextReview = now + word.interval * day;
    this.saveToStorage();
  }

  // Вспомогательная функция генерации ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Очистить весь словарь (для отладки)
  clear() {
    this.words = [];
    this.saveToStorage();
  }
}

// Экспортируем один экземпляр (singleton)
const dictionary = new Dictionary();
export default dictionary;
