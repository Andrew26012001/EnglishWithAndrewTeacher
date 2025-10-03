import { Dictionary } from './dictionary.js';
import { lookupWord } from './lookup.js';
import { downloadJSON, generateQR } from './utils.js';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, getDoc, writeBatch, setDoc } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBPRhzr9tXeD6xKhIxBrzzOaf_IR9pcPpE",
  authDomain: "clindan-e064c.firebaseapp.com",
  projectId: "clindan-e064c",
  storageBucket: "clindan-e064c.firebasestorage.app",
  messagingSenderId: "425082439193",
  appId: "1:425082439193:web:c2e23a4cef0b8d04d20c88",
  measurementId: "G-WF2ZW9MQLQ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const dict = new Dictionary(db);

const themeToggle = document.getElementById('theme-toggle');
const lookupInput = document.getElementById('lookup-input');
const searchBtn = document.getElementById('search-btn');
const lookupLoader = document.getElementById('lookup-loader');
const wordCardResult = document.getElementById('word-card-result');
const wordsList = document.getElementById('words-list');
const emptyDict = document.getElementById('empty-dict');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');
const exportGistBtn = document.getElementById('export-gist-btn');
const importGistBtn = document.getElementById('import-gist-btn');
const syncGistBtn = document.getElementById('sync-gist-btn');
const shareQrBtn = document.getElementById('share-qr-btn');
const qrModal = document.getElementById('qr-modal');
const qrCode = document.getElementById('qr-code');
const closeQr = document.getElementById('close-qr');
const quizContainer = document.getElementById('quiz-container');
const quizStart = document.getElementById('quiz-start');
const quizQuestion = document.getElementById('quiz-question');
const quizAnswers = document.getElementById('quiz-answers');
const nextQuizBtn = document.getElementById('next-quiz-btn');
const startQuizBtn = document.getElementById('start-quiz-btn');
const quizProgressBar = document.getElementById('quiz-progress-bar');
const navBtns = document.querySelectorAll('.nav-btn');
const loginBtn = document.getElementById('login-btn');
const userInfo = document.getElementById('user-info');
const sortSelect = document.getElementById('sort-select');

let currentQuizWord = null;
let quizWords = [];
let currentUser = null;

function initTheme() {
  if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light');
    themeToggle.querySelector('.icon').textContent = '☀️';
  }
}

function toggleTheme() {
  document.body.classList.toggle('light');
  const isLight = document.body.classList.contains('light');
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
  themeToggle.querySelector('.icon').textContent = isLight ? '☀️' : '🌙';
}

function switchView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`${view}-view`).classList.add('active');
  navBtns.forEach(btn => btn.classList.remove('active'));
  document.querySelector(`[data-view="${view}"]`).classList.add('active');

  if (view === 'dictionary') renderWordsList();
  if (view === 'quiz') loadQuiz();
}

async function handleLookup() {
  const word = lookupInput.value.trim();
  if (!word) return;

  lookupLoader.style.display = 'block';
  wordCardResult.style.display = 'none';

  try {
    const data = await lookupWord(word);
    renderWordCard(data);
  } catch (error) {
    console.error('Lookup error:', error);
    wordCardResult.innerHTML = `<p style="color: red;">${error.message}</p>`;
    wordCardResult.style.display = 'block';
  } finally {
    lookupLoader.style.display = 'none';
  }
}

function renderWordCard(data) {
  let meaningsHtml = '';
  data.meanings.forEach(meaning => {
    meaningsHtml += `
      <div class="meaning">
        <div class="meaning-type">${meaning.partOfSpeech}</div>
        ${meaning.definitions.map(def => `
          <div class="definition">${def.definition}</div>
          ${def.example ? `<div class="example">"${def.example}"</div>` : ''}
        `).join('')}
      </div>
    `;
  });

  let synonymsHtml = '';
  if (data.synonyms.length) {
    synonymsHtml = `
      <div class="synonyms">
        <h4>Синонимы:</h4>
        <div class="synonyms-list">
          ${data.synonyms.map(syn => `<span class="synonym">${syn}</span>`).join('')}
        </div>
      </div>
    `;
  }

  wordCardResult.innerHTML = `
    <div class="word-header">
      <div>
        <div class="word-title">${data.word}</div>
        <div class="phonetic">${data.phonetic} (${data.translation})</div>
      </div>
      ${data.audioUrl ? `<button class="audio-btn" onclick="new Audio('${data.audioUrl}').play()">🔊</button>` : ''}
    </div>
    ${meaningsHtml}
    ${synonymsHtml}
    <button class="add-to-dict">Добавить в словарь</button>
  `;

  wordCardResult.querySelector('.add-to-dict').addEventListener('click', () => {
    if (currentUser) {
      dict.addWord(data, currentUser.uid);
    } else {
      alert('Залогиньтесь для добавления.');
    }
  });
  wordCardResult.style.display = 'block';
}

function renderWordsList() {
  if (!currentUser) {
    wordsList.innerHTML = '<p>Залогиньтесь для просмотра словаря.</p>';
    return;
  }

  const sortedBy = sortSelect.value;
  const words = dict.getWords(sortedBy);
  wordsList.innerHTML = '';
  if (!words.length) {
    emptyDict.style.display = 'block';
    return;
  }
  emptyDict.style.display = 'none';

  words.forEach(word => {
    const item = document.createElement('div');
    item.className = 'word-item';
    item.innerHTML = `
      <div class="word-item-title">${word.word}</div>
      <div class="word-item-translation">${word.translation}</div>
      <button class="edit-btn" style="background: none; border: none; cursor: pointer; color: blue;">✏️</button>
      <button class="delete-btn" style="background: none; border: none; cursor: pointer; color: red;">🗑️</button>
    `;
    item.querySelector('.delete-btn').addEventListener('click', () => {
      if (confirm(`Удалить слово "${word.word}"?`)) {
        dict.removeWord(word.id, currentUser.uid);
        renderWordsList();
      }
    });
    item.querySelector('.edit-btn').addEventListener('click', () => {
      const newTrans = prompt('Новый перевод:', word.translation);
      if (newTrans) {
        dict.updateTranslation(word.id, newTrans, currentUser.uid);
        renderWordsList();
      }
    });
    item.addEventListener('click', (e) => {
      if (!e.target.classList.contains('edit-btn') && !e.target.classList.contains('delete-btn')) {
        lookupInput.value = word.word;
        handleLookup();
        switchView('lookup');
      }
    });
    wordsList.appendChild(item);
  });
}

function setupImportExport() {
  exportBtn.addEventListener('click', () => {
    if (!currentUser) return alert('Залогиньтесь.');
    const json = dict.export();
    downloadJSON(json, 'dictionary.json');
  });

  importBtn.addEventListener('click', () => {
    if (!currentUser) return alert('Залогиньтесь.');
    importFile.click();
  });
  importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const success = dict.import(ev.target.result, currentUser.uid);
      if (success) {
        renderWordsList();
        alert('Импорт успешен!');
      } else {
        alert('Ошибка импорта.');
      }
    };
    reader.readAsText(file);
  });

  exportGistBtn.addEventListener('click', async () => {
    if (!currentUser) return alert('Залогиньтесь.');
    await dict.exportToGist(currentUser.uid);
    renderWordsList();
  });

  importGistBtn.addEventListener('click', async () => {
    if (!currentUser) return alert('Залогиньтесь.');
    await dict.importFromGist(currentUser.uid);
    renderWordsList();
  });

  syncGistBtn.addEventListener('click', async () => {
    if (!currentUser) return alert('Залогиньтесь.');
    await dict.syncWithGist(currentUser.uid);
    renderWordsList();
  });
}

function setupQR() {
  shareQrBtn.addEventListener('click', () => {
    if (!currentUser) return alert('Залогиньтесь.');
    const json = dict.export();
    if (json.length > 2000) {
      alert('Словарь слишком большой для QR. Используйте экспорт в файл.');
      return;
    }
    qrCode.innerHTML = '';
    qrCode.appendChild(generateQR(json));
    qrModal.style.display = 'flex';
  });

  closeQr.addEventListener('click', () => {
    qrModal.style.display = 'none';
  });
}

function loadQuiz() {
  if (!currentUser) {
    quizContainer.style.display = 'none';
    quizStart.innerHTML = '<p>Залогиньтесь для тренировки.</p>';
    quizStart.style.display = 'block';
    return;
  }

  const allWords = dict.getWords();
  if (!allWords.length) {
    quizContainer.style.display = 'none';
    quizStart.innerHTML = '<p>Нет слов для повторения.</p><button id="start-quiz-btn" class="btn">🔄 Обновить</button>';
    quizStart.style.display = 'block';
    document.getElementById('start-quiz-btn').addEventListener('click', loadQuiz);
    return;
  }

  quizContainer.style.display = 'none';
  quizStart.innerHTML = '<button id="start-quiz-btn" class="btn">Начать тренировку</button>';
  quizStart.style.display = 'block';
  document.getElementById('start-quiz-btn').addEventListener('click', () => {
    quizWords = [...allWords].sort(() => 0.5 - Math.random());
    quizStart.style.display = 'none';
    quizContainer.style.display = 'block';
    nextQuizBtn.style.display = 'block';
    nextQuizBtn.disabled = true;
    showNextQuizQuestion();
  });
}

function showNextQuizQuestion() {
  if (!quizWords.length) {
    quizQuestion.textContent = 'Тренировка завершена!';
    quizAnswers.innerHTML = '';
    nextQuizBtn.style.display = 'none';
    return;
  }
  
  const word = quizWords.shift();
  currentQuizWord = word;
  
  quizQuestion.textContent = `Что означает "${word.word}"?`;
  quizAnswers.innerHTML = '';
  
  const allWords = dict.getWords().filter(w => w.id !== word.id);
  const wrongWords = allWords.sort(() => 0.5 - Math.random()).slice(0, 3);
  const fallbackDef = word.meanings[0]?.definitions[0]?.definition?.substring(0, 50) || '';
  const options = [
    { text: word.translation || fallbackDef, correct: true },
    ...wrongWords.map(w => {
      const wFallback = w.meanings[0]?.definitions[0]?.definition?.substring(0, 50) || w.word;
      return { text: w.translation || wFallback, correct: false };
    })
  ].sort(() => 0.5 - Math.random());
  
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    btn.textContent = opt.text;
    btn.dataset.correct = opt.correct;
    btn.addEventListener('click', handleQuizAnswer);
    quizAnswers.appendChild(btn);
  });
}

function handleQuizAnswer(e) {
  const isCorrect = e.target.dataset.correct === 'true';
  const buttons = document.querySelectorAll('.answer-btn');
  
  buttons.forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.correct === 'true') {
      btn.classList.add('correct');
    } else if (btn === e.target && !isCorrect) {
      btn.classList.add('incorrect');
    }
  });
  
  const grade = isCorrect ? 2 : 0;
  dict.updateSRS(currentQuizWord.id, grade, currentUser.uid);
  nextQuizBtn.disabled = false;
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  console.log('App loaded');
  initTheme();
  themeToggle.addEventListener('click', toggleTheme);
  
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
  
  searchBtn.addEventListener('click', handleLookup);
  lookupInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLookup();
  });
  
  setupImportExport();
  setupQR();
  
  nextQuizBtn.addEventListener('click', () => {
    nextQuizBtn.disabled = true;
    showNextQuizQuestion();
  });
  
  sortSelect.addEventListener('change', renderWordsList);

  // Auth
  loginBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error('Login error:', e);
      alert('Ошибка логина: ' + e.message);
    }
  });

  onAuthStateChanged(auth, async user => {
    currentUser = user;
    if (user) {
      loginBtn.style.display = 'none';
      userInfo.textContent = `Logged in as ${user.displayName}`;
      try {
        await dict.load(user.uid);
        if (dict.gistId) {
          await dict.importFromGist(user.uid);
        }
      } catch (e) {
        console.error('Auth load error:', e);
      }
      renderWordsList();
    } else {
      loginBtn.style.display = 'block';
      userInfo.textContent = '';
      dict.words = [];
      renderWordsList();
    }
  });
});
