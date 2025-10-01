export class Dictionary {
  constructor() {
    this.storageKey = 'english_dict_v1';
    this.words = [];
    this.load();
  }

  load() {
    try {
      const data = localStorage.getItem(this.storageKey);
      this.words = data ? JSON.parse(data) : [];
    } catch (e) {
      this.words = [];
    }
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.words));
  }

  addWord(wordData) {
    const now = Date.now();
    const word = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      ...wordData,
      createdAt: now,
      nextReview: now,
      interval: 0,
      ease: 2.5,
      repetitions: 0
    };
    this.words.push(word);
    this.save();
  }

  getWords() {
    return [...this.words];
  }

  getWordsDue() {
    const now = Date.now();
    return this.words.filter(w => w.nextReview <= now);
  }

  updateSRS(id, grade) {
    const word = this.words.find(w => w.id === id);
    if (!word) return;

    const day = 24 * 60 * 60 * 1000;
    const now = Date.now();

    if (grade === 0) {
      word.interval = 1;
      word.ease = Math.max(1.3, word.ease - 0.2);
      word.repetitions = 0;
    } else {
      if (word.repetitions === 0) word.interval = 1;
      else if (word.repetitions === 1) word.interval = 6;
      else word.interval = Math.round(word.interval * word.ease);
      
      if (grade === 2) word.ease += 0.1;
      word.repetitions += 1;
    }

    word.nextReview = now + word.interval * day;
    this.save();
  }

  export() {
    return JSON.stringify({ words: this.words }, null, 2);
  }

  import(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.words)) {
        this.words = data.words;
        this.save();
        return true;
      }
    } catch (e) {
      console.error('Import error:', e);
    }
    return false;
  }
}
