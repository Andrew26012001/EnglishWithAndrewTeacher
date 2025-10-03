export class Dictionary {
  constructor(db) {
    this.db = db;
    this.storageKey = 'english_dict_v1'; // Для локального бэкапа, если нужно
    this.words = [];
    this.gistId = null; // Для GitHub Gist
    this.githubToken = localStorage.getItem('github_token') || null;
  }

  async load(uid) {
    try {
      const wordsRef = collection(this.db, `users/${uid}/words`);
      const snapshot = await getDocs(wordsRef);
      this.words = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Загрузка gistId из user settings
      const userRef = doc(this.db, `users/${uid}`);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        this.gistId = userDoc.data().gistId || null;
      }
      console.log('Loaded words:', this.words.length);
    } catch (e) {
      console.error('Load error:', e);
      this.words = [];
    }
  }

  async save(uid) {
    try {
      const batch = writeBatch(this.db);
      this.words.forEach(word => {
        const docRef = doc(this.db, `users/${uid}/words`, word.id);
        batch.set(docRef, word);
      });
      await batch.commit();
      // Сохраняем gistId, если есть
      if (this.gistId) {
        const userRef = doc(this.db, `users/${uid}`);
        await setDoc(userRef, { gistId: this.gistId }, { merge: true });
      }
      console.log('Saved words:', this.words.length);
    } catch (e) {
      console.error('Save error:', e);
    }
  }

  addWord(wordData, uid) {
    const existing = this.words.find(w => w.word.toLowerCase() === wordData.word.toLowerCase());
    if (existing) return; // Prevent duplicates

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
    this.save(uid);
  }

  removeWord(id, uid) {
    this.words = this.words.filter(w => w.id !== id);
    this.save(uid);
  }

  updateTranslation(id, newTranslation, uid) {
    const word = this.words.find(w => w.id === id);
    if (word) {
      word.translation = newTranslation;
      this.save(uid);
    }
  }

  getWords(sortedBy = 'createdAt') {
    let sorted = [...this.words];
    if (sortedBy === 'createdAt') {
      sorted.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortedBy === 'word') {
      sorted.sort((a, b) => a.word.localeCompare(b.word));
    } else if (sortedBy === 'ease') {
      sorted.sort((a, b) => a.ease - b.ease);
    } else if (sortedBy === 'interval') {
      sorted.sort((a, b) => a.interval - b.interval);
    }
    return sorted;
  }

  getWordsDue() {
    const now = Date.now();
    return this.words.filter(w => w.nextReview <= now);
  }

  updateSRS(id, grade, uid) {
    const word = this.words.find(w => w.id === id);
    if (!word) return;

    const day = 24 * 60 * 60 * 1000;
    const now = Date.now();

    if (grade <= 0) { // Wrong or hard wrong
      word.interval = 1;
      word.ease = Math.max(1.3, word.ease - 0.2);
      word.repetitions = 0;
    } else {
      if (word.repetitions === 0) word.interval = 1;
      else if (word.repetitions === 1) word.interval = 6;
      else word.interval = Math.round(word.interval * word.ease);
      
      word.ease += (grade === 2 ? 0.15 : 0); // +0.15 for easy, 0 for hard correct
      word.repetitions += 1;
    }

    word.nextReview = now + word.interval * day;
    this.save(uid);
  }

  export() {
    return JSON.stringify({ words: this.words }, null, 2);
  }

  import(jsonString, uid) {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.words)) {
        // Merge: add new, skip duplicates
        data.words.forEach(newWord => {
          if (!this.words.find(w => w.word.toLowerCase() === newWord.word.toLowerCase())) {
            this.words.push(newWord);
          }
        });
        this.save(uid);
        return true;
      }
    } catch (e) {
      console.error('Import error:', e);
    }
    return false;
  }

  async exportToGist(uid) {
    if (!this.githubToken) {
      this.githubToken = prompt('Введите GitHub Personal Access Token (с scope "gist"):');
      if (!this.githubToken) return;
      localStorage.setItem('github_token', this.githubToken);
    }

    const json = this.export();
    const body = {
      description: 'English Dictionary Backup',
      public: false,
      files: { 'dictionary.json': { content: json } }
    };

    try {
      let response;
      if (this.gistId) {
        // Update existing Gist
        response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
          method: 'PATCH',
          headers: { 'Authorization': `token ${this.githubToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      } else {
        // Create new Gist
        response = await fetch('https://api.github.com/gists', {
          method: 'POST',
          headers: { 'Authorization': `token ${this.githubToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }

      if (response.ok) {
        const data = await response.json();
        this.gistId = data.id;
        this.save(uid); // Save gistId to Firestore
        alert(`Экспорт успешен! Gist URL: ${data.html_url}`);
      } else {
        alert('Ошибка экспорта в Gist. Проверьте токен.');
      }
    } catch (e) {
      console.error('Gist export error:', e);
      alert('Ошибка соединения.');
    }
  }

  async importFromGist(uid) {
    let gistId = this.gistId;
    if (!gistId) {
      const gistUrlOrId = prompt('Введите ID или URL GitHub Gist:');
      if (!gistUrlOrId) return;
      gistId = gistUrlOrId.split('/').pop(); // Extract ID from URL if needed
      this.gistId = gistId;
      this.save(uid);
    }

    try {
      const headers = {};
      if (this.githubToken) {
        headers['Authorization'] = `token ${this.githubToken}`;
      }
      const response = await fetch(`https://api.github.com/gists/${gistId}`, { headers });

      if (response.ok) {
        const data = await response.json();
        const fileContent = data.files['dictionary.json']?.content;
        if (fileContent) {
          this.import(fileContent, uid);
          alert('Импорт из Gist успешен!');
        } else {
          alert('Нет файла dictionary.json в Gist.');
        }
      } else {
        alert('Ошибка импорта из Gist. Проверьте ID/токен.');
      }
    } catch (e) {
      console.error('Gist import error:', e);
      alert('Ошибка соединения.');
    }
  }

  async syncWithGist(uid) {
    if (!this.githubToken) {
      this.githubToken = prompt('Введите GitHub Personal Access Token (с scope "gist"):');
      if (!this.githubToken) return;
      localStorage.setItem('github_token', this.githubToken);
    }

    // Импорт (merge) из Gist
    await this.importFromGist(uid);
    // Экспорт обратно в Gist для синхронизации
    await this.exportToGist(uid);
    alert('Синхронизация с Gist завершена!');
  }
}
