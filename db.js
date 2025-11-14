export class DB {
  constructor(dbName = 'EnglishDictDB', storeName = 'words') {
    this.dbName = dbName;
    this.storeName = storeName;
    this.db = null;
  }

  async open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onerror = () => reject(new Error('Ошибка открытия БД'));
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this);
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('word_idx', 'word', { unique: true });
          store.createIndex('nextReview_idx', 'nextReview', { unique: false });
        }
      };
    });
  }

  async getAll() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.getAll();
      request.onerror = () => reject(new Error('Ошибка чтения всех слов'));
      request.onsuccess = () => resolve(request.result);
    });
  }

  async put(item) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.put(item);
      request.onerror = () => reject(new Error('Ошибка сохранения слова'));
      request.onsuccess = () => resolve(request.result);
    });
  }

  async delete(id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.delete(id);
      request.onerror = () => reject(new Error('Ошибка удаления слова'));
      request.onsuccess = () => resolve(request.result);
    });
  }
}
