class Dictionary {
  constructor() {
    this.storageKey = 'wordDictionary_v2';
    this.words = [];
    this.loadFromStorage();
  }

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

  saveToStorage() {
    const data = { words: this.words };
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  addWord(wordData) {
    const word = {
      id: this.generateId(),
      word: wordData.word.trim(),
      explanation: wordData.explanation?.trim() || '',
      examples: Array.isArray(wordData.examples) 
        ? wordData.examples.map(e => e.trim()).filter(e => e) 
        : [],
      audioUrl: wordData.audioUrl?.trim() || '',
      createdAt: Date.now(),
      nextReview: Date.now(),
      interval: 0,
      ease: 2.5,
      repetitions: 0
    };

    this.words.push(word);
    this.saveToStorage();
    return word;
  }

  getWords() {
    return [...this.words];
  }

  getWordById(id) {
    return this.words.find(w => w.id === id);
  }

  deleteWord(id) {
    this.words = this.words.filter(w => w.id !== id);
    this.saveToStorage();
  }

  getWordsDueForReview() {
    const now = Date.now();
    return this.words.filter(word => word.nextReview <= now);
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

const dictionary = new Dictionary();
export default dictionary;
