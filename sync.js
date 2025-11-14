// sync.js

// Импортируем нужные функции из библиотеки Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

// Ваши ключи для подключения к Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBdlddXUFKoK3zTtg04mC6HsJ800mtUcKA",
  authDomain: "myenglishdictionary-c1bc0.firebaseapp.com",
  databaseURL: "https://myenglishdictionary-c1bc0-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "myenglishdictionary-c1bc0",
  storageBucket: "myenglishdictionary-c1bc0.firebasestorage.app",
  messagingSenderId: "590368673474",
  appId: "1:590368673474:web:4c09f0ee0b13f382ca755b"
};

export class SyncManager {
  constructor(userId = 'defaultUser') {
    this.userId = userId;
    this.db = null;
    this.userWordsRef = null;
    this.onRemoteUpdate = null; // Callback для обновления локальных данных
    this.isRemoteUpdateInProgress = false; // Флаг, чтобы избежать зацикливания
  }

  init() {
    try {
      const app = initializeApp(firebaseConfig);
      this.db = getDatabase(app);
      this.userWordsRef = ref(this.db, `users/${this.userId}/words`);
      console.log('Firebase Sync инициализирован.');
      this.listenForRemoteChanges();
    } catch (e) {
      console.error("Ошибка инициализации Firebase:", e);
    }
  }

  // Слушаем изменения из облака
  listenForRemoteChanges() {
    if (!this.userWordsRef) return;

    onValue(this.userWordsRef, (snapshot) => {
      if (snapshot.exists() && !this.isRemoteUpdateInProgress) {
        const remoteData = snapshot.val();
        // Firebase может вернуть объект или массив, приводим к массиву
        const remoteWords = Array.isArray(remoteData) ? remoteData : Object.values(remoteData);
        console.log('Получено обновление из облака:', remoteWords);
        
        if (this.onRemoteUpdate) {
          this.onRemoteUpdate(remoteWords);
        }
      }
    });
  }

  // Выгружаем все локальные слова в облако
  async syncAll(localWords) {
    if (!this.userWordsRef) return;
    
    this.isRemoteUpdateInProgress = true; 
    console.log('Отправляем все слова в облако...');
    try {
      await set(this.userWordsRef, localWords); 
      console.log('Полная синхронизация завершена.');
    } catch (error) {
      console.error('Ошибка полной синхронизации:', error);
    } finally {
      setTimeout(() => { this.isRemoteUpdateInProgress = false; }, 500); 
    }
  }

  // Устанавливаем функцию, которая будет вызвана при получении данных из облака
  setOnRemoteUpdateCallback(callback) {
    this.onRemoteUpdate = callback;
  }
}
