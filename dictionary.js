// dictionary.js

import { DB } from './db.js';
import { SyncManager } from './sync.js';

export class Dictionary {
  constructor() {
    this.db = new DB();
    this.syncManager = new SyncManager();
    this.words = [];
  }

  async init() {
    await this.db.open();
    await this.load();
    
    // Настройка синхронизации
    this.syncManager.init();
    this.syncManager.setOnRemoteUpdateCallback(this.handleRemoteUpdate.bind(this));
  }

  async load() {
    this.words = await this.db.getAll();
    this.words.sort((a, b) => (a.word > b.word) ? 1 : -1); // Сортируем слова
  }

  async addWord(wordData) {
    const existing = this.words.find(w => w.word.toLowerCase() === wordData.word.toLowerCase());
    if (existing) {
        console.log('Слово уже существует:', wordData.word);
        return; 
    }

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

    await this.db.put(word);
    await this.load(); // Перезагружаем и сортируем
    await this.syncManager.syncAll(this.words);
    console.log('Слово добавлено и синхронизировано:', word);
  }

  async removeWord(id) {
    await this.db.delete(id);
    await this.load();
    await this.syncManager.syncAll(this.words);
  }

  getWords() {
    return [...this.words];
  }

  getWordsDue() {
    const now = Date.now();
    return this.words.filter(w => w.nextReview <= now);
  }

  async updateSRS(id, grade) {
    const word = this.words.find(w => w.id === id);
    if (!word) return;

    const day = 24 * 60 * 60 * 1000;
    const now = Date.now();

    if (grade <= 0) { // Неправильно
      word.interval = 1;
      word.ease = Math.max(1.3, word.ease - 0.2);
      word.repetitions = 0;
    } else { // Правильно
      if (word.repetitions === 0) word.interval = 1;
      else if (word.repetitions === 1) word.interval = 6;
      else word.interval = Math.round(word.interval * word.ease);
      
      word.ease += (grade === 2 ? 0.15 : 0);
      word.repetitions += 1;
    }

    word.nextReview = now + word.interval * day;
    await this.db.put(word);
    await this.syncManager.syncAll(this.words);
  }
  
  export() {
    return JSON.stringify({ words: this.words }, null, 2);
  }

  async import(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.words)) {
        let addedCount = 0;
        for (const newWord of data.words) {
          if (!this.words.find(w => w.word.toLowerCase() === newWord.word.toLowerCase())) {
            const mergedWord = {
              id: newWord.id || (Date.now().toString(36) + Math.random().toString(36).substr(2)),
              nextReview: newWord.nextReview || Date.now(),
              interval: newWord.interval || 0,
              ease: newWord.ease || 2.5,
              repetitions: newWord.repetitions || 0,
              createdAt: newWord.createdAt || Date.now(),
              ...newWord
            };
            await this.db.put(mergedWord);
            addedCount++;
          }
        }
        await this.load();
        await this.syncManager.syncAll(this.words);
        console.log(`Импортировано ${addedCount} новых слов.`);
        return true;
      }
    } catch (e) {
      console.error('Ошибка импорта:', e);
    }
    return false;
  }

  async handleRemoteUpdate(remoteWords) {
    console.log("Обработка удаленного обновления...");
    const localWords = this.words;
    const localWordMap = new Map(localWords.map(w => [w.id, w]));
    const remoteWordMap = new Map(remoteWords.map(w => [w.id, w]));

    let changesMade = false;

    // Обновляем или добавляем слова из облака
    for (const [id, remoteWord] of remoteWordMap) {
      const localWord = localWordMap.get(id);
      if (!localWord || new Date(remoteWord.createdAt) > new Date(localWord.createdAt)) {
        await this.db.put(remoteWord);
        changesMade = true;
      }
    }

    // Удаляем слова, которых нет в облаке
    for (const [id] of localWordMap) {
      if (!remoteWordMap.has(id)) {
        await this.db.delete(id);
        changesMade = true;
      }
    }
    
    if (changesMade) {
      await this.load(); 
      if (window.renderApp) {
        window.renderApp();
      }
    }
  }
}
