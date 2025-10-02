// dictionary.js
export class Dictionary {
  constructor() {
    this.storageKey = 'english_dict_v1';
    this.schemaVersion = 1;
    this.words = [];
    this.load();
  }

  load() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) {
        this.words = [];
        return;
      }
      const parsed = JSON.parse(data);
      if (parsed && parsed.schemaVersion === this.schemaVersion && Array.isArray(parsed.words)) {
        this.words = parsed.words;
      } else if (parsed && Array.isArray(parsed.words)) {
        // If schemaVersion mismatched — try to migrate later; for now load words
        this.words = parsed.words;
      } else {
        this.words = [];
      }
    } catch (e) {
      console.error('Failed to load dictionary:', e);
      this.words = [];
    }
  }

  save() {
    try {
      const payload = {
        schemaVersion: this.schemaVersion,
        words: this.words
      };
      localStorage.setItem(this.storageKey, JSON.stringify(payload));
    } catch (e) {
      console.error('Failed to save dictionary:', e);
    }
  }

  _generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  _normalizeTranslation(input) {
    if (!input) return [];
    if (Array.isArray(input)) return input.filter(Boolean);
    if (typeof input === 'string') {
      // if comma-separated string, split; otherwise keep as single
      if (input.includes(',')) return input.split(',').map(s => s.trim()).filter(Boolean);
      return [input.trim()];
    }
    return [];
  }

  addWord(wordData = {}) {
    if (!wordData.word) return null;
    const wordLower = String(wordData.word).trim().toLowerCase();

    const existing = this.words.find(w => String(w.word).trim().toLowerCase() === wordLower);
    if (existing) {
      // Already exists — update some fields (merge) but keep id and SRS stats
      existing.meanings = wordData.meanings || existing.meanings;
      existing.phonetic = wordData.phonetic || existing.phonetic;
      existing.audioUrl = wordData.audioUrl || existing.audioUrl;
      existing.translation = this._normalizeTranslation(wordData.translation || existing.translation);
      existing.translationStr = (existing.translation || []).join(', ');
      this.save();
      return existing;
    }

    const now = Date.now();
    const translationArr = this._normalizeTranslation(wordData.translation);
    const word = {
      id: this._generateId(),
      word: String(wordData.word).trim(),
      phonetic: wordData.phonetic || '',
      audioUrl: wordData.audioUrl || '',
      meanings: Array.isArray(wordData.meanings) ? wordData.meanings : [],
      translation: translationArr,
      translationStr: translationArr.join(', '),
      createdAt: now,
      nextReview: now,    // immediately due
      interval: 0,
      ease: 2.5,
      repetitions: 0,
      history: [],        // {date, grade}
      lastGrade: null
    };

    this.words.push(word);
    this.save();
    return word;
  }

  removeWord(id) {
    this.words = this.words.filter(w => w.id !== id);
    this.save();
  }

  getWords() {
    return [...this.words];
  }

  getWordsDue() {
    const now = Date.now();
    return this.words.filter(w => (w.nextReview || 0) <= now);
  }

  /**
   * updateSRS(id, grade)
   * grade: 0 (wrong), 1 (hard), 2 (correct), 3 (easy)
   */
  updateSRS(id, grade) {
    const word = this.words.find(w => w.id === id);
    if (!word) return;

    const day = 24 * 60 * 60 * 1000;
    const now = Date.now();

    // Normalize grade
    let g = Number.isFinite(grade) ? Math.max(0, Math.min(3, Math.floor(grade))) : 0;

    // Record history
    word.history = word.history || [];
    word.history.push({ date: now, grade: g });
    word.lastGrade = g;

    if (g < 2) {
      // wrong or hard: reset repetitions, set small interval, reduce ease
      word.repetitions = 0;
      word.interval = 1;
      word.ease = Math.max(1.3, (word.ease || 2.5) - 0.2);
    } else {
      // correct answers
      // increment repetitions first (so reps=1 is second state)
      word.repetitions = (word.repetitions || 0) + 1;

      if (word.repetitions === 1) {
        // first successful repetition after learning
        word.interval = 1;
      } else if (word.repetitions === 2) {
        word.interval = 6;
      } else {
        // subsequent intervals multiplied by ease
        const prevInterval = word.interval > 0 ? word.interval : 6;
        word.interval = Math.round(prevInterval * (word.ease || 2.5));
      }

      // ease adjustment: +0.15 for easy (3), leave for normal correct (2)
      if (g === 3) {
        word.ease = Math.min(3.5, (word.ease || 2.5) + 0.15);
      }
    }

    // next review timestamp
    word.nextReview = now + Math.max(1, word.interval) * day;

    this.save();
  }

  export() {
    const payload = {
      schemaVersion: this.schemaVersion,
      exportedAt: Date.now(),
      words: this.words
    };
    return JSON.stringify(payload, null, 2);
  }

  import(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data) return false;

      // Accept both {words: [...]} and full payload with schemaVersion
      const incomingWords = Array.isArray(data.words) ? data.words : (Array.isArray(data) ? data : null);
      if (!incomingWords) return false;

      // Merge: add new, update existing by word (case-insensitive)
      incomingWords.forEach(newWord => {
        if (!newWord || !newWord.word) return;
        const wordLower = String(newWord.word).trim().toLowerCase();
        const existing = this.words.find(w => String(w.word).trim().toLowerCase() === wordLower);
        // Normalize translations
        let translations = [];
        if (newWord.translation !== undefined) {
          if (Array.isArray(newWord.translation)) translations = newWord.translation.filter(Boolean);
          else if (typeof newWord.translation === 'string') translations = newWord.translation.split(',').map(s => s.trim()).filter(Boolean);
        } else if (newWord.translationStr) {
          translations = String(newWord.translationStr).split(',').map(s => s.trim()).filter(Boolean);
        }

        if (existing) {
          // merge non-destructively
          existing.meanings = newWord.meanings || existing.meanings;
          existing.phonetic = newWord.phonetic || existing.phonetic;
          existing.audioUrl = newWord.audioUrl || existing.audioUrl;
          if (translations.length) {
            existing.translation = translations;
            existing.translationStr = translations.join(', ');
          }
          // optionally merge SRS fields if present
          existing.interval = newWord.interval !== undefined ? newWord.interval : existing.interval;
          existing.ease = newWord.ease !== undefined ? newWord.ease : existing.ease;
          existing.repetitions = newWord.repetitions !== undefined ? newWord.repetitions : existing.repetitions;
        } else {
          const now = Date.now();
          const id = newWord.id || this._generateId();
          const w = {
            id,
            word: String(newWord.word).trim(),
            phonetic: newWord.phonetic || '',
            audioUrl: newWord.audioUrl || '',
            meanings: Array.isArray(newWord.meanings) ? newWord.meanings : [],
            translation: translations,
            translationStr: translations.join(', '),
            createdAt: newWord.createdAt || now,
            nextReview: newWord.nextReview || now,
            interval: newWord.interval || 0,
            ease: newWord.ease || 2.5,
            repetitions: newWord.repetitions || 0,
            history: Array.isArray(newWord.history) ? newWord.history : [],
            lastGrade: newWord.lastGrade || null
          };
          this.words.push(w);
        }
      });

      this.save();
      return true;
    } catch (e) {
      console.error('Import error:', e);
      return false;
    }
  }
}
