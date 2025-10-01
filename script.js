import { Dictionary } from './dictionary.js';
import { lookupWord, getSynonyms } from './lookup.js';
import { downloadJSON, generateQR } from './utils.js';

const dict = new Dictionary();

// DOM
const themeToggle = document.getElementById('theme-toggle');
const navBtns = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view');
const lookupInput = document.getElementById('lookup-input');
const loader = document.getElementById('lookup-loader');
const wordCard = document.getElementById('word-card-result');
const wordsList = document.getElementById('words-list');
const emptyDict = document.getElementById('empty-dict');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');
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

let currentQuizWord = null;
let quizWords = [];

// Theme
function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.body.setAttribute('data-theme', saved);
  themeToggle.innerHTML = `<span class="icon">${saved === 'dark' ? '🌙' : '☀️'}</span>`;
}

function toggleTheme() {
  const current = document.body.getAttribute('data-theme');
  const newTheme = current === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  themeToggle.innerHTML = `<span class="icon">${newTheme === 'dark' ? '🌙' : '☀️'}</span>`;
}

// Navigation
function switchView(viewName) {
  navBtns.forEach(btn => btn.classList.remove('active'));
  views.forEach(v => v.classList.remove('active'));
  
  document.querySelector(`.nav-btn[data-view="${viewName}"]`).classList.add('active');
  document.getElementById(`${viewName}-view`).classList.add('active');
  
  if (viewName === 'dictionary') renderWordsList();
  if (viewName === 'quiz') loadQuiz();
}

// Lookup
async function handleLookup() {
  const word = lookupInput.value.trim();
  if (!word) return;
  
  loader.style.display = 'block';
  wordCard.style.display = 'none';
  
  try {
    const data = await lookupWord(word);
    renderWordCard(data);
  } catch (e) {
    alert(e.message || 'Ошибка поиска');
  } finally {
    loader.style.display = 'none';
  }
}

async function renderWordCard(data) {
  let html = `<h2>${data.word}</h2>`;
  if (data.phonetic) html += `<p>[${data.phonetic}]</p>`;
  if (data.translation) html += `<p><strong>RU:</strong> ${data.translation}</p>`;

  // Все определения
  if (data.meanings && data.meanings.length > 0) {
    html += `<div class="section"><h3>DEFINITIONS</h3>`;
    data.meanings.forEach(meaning => {
      meaning.definitions.forEach(def => {
        html += `<div class="definition">• ${def.definition || ''}`;
        if (def.example) html += `<br><em>“${def.example}”</em>`;
        html += `</div>`;
      });
    });
    html += `</div>`;
  }

  // Примеры
  if (data.meanings && data.meanings.length > 0) {
    html += `<div class="section"><h3>EXAMPLES</h3>`;
    data.meanings.forEach(meaning => {
      meaning.definitions.forEach(def => {
        if (def.example) {
          html += `<div class="example">“${def.example}”</div>`;
        }
      });
    });
    html += `</div>`;
  }

  // Синонимы
  html += `<div class="section"><h3>SYNONYMS</h3><div id="synonyms-container"></div></div>`;

  // Аудио
  if (data.audioUrl) {
    html += `<button id="play-audio-btn" class="btn btn-small">🔊 Произношение</button>`;
  }

  // Кнопка сохранить
  html += `
    <div style="margin-top: 16px;">
      <button id="save-current-word" class="btn save-btn">✅ Сохранить</button>
    </div>
  `;

  wordCard.innerHTML = html;
  wordCard.style.display = 'block';

  // Обработчики
  document.getElementById('save-current-word').addEventListener('click', () => {
    dict.addWord({
      word: data.word,
      translation: data.translation,
      explanation: data.meanings?.[0]?.definitions?.[0]?.definition || '',
      examples: data.meanings?.[0]?.definitions?.[0]?.example ? [data.meanings[0].definitions[0].example] : [],
      audioUrl: data.audioUrl
    });
    alert('Слово сохранено!');
    renderWordsList();
  });

  if (data.audioUrl) {
    document.getElementById('play-audio-btn').addEventListener('click', () => {
      const audio = new Audio(data.audioUrl);
      audio.play().catch(() => {
        const utterance = new SpeechSynthesisUtterance(data.word);
        utterance.lang = 'en-US';
        speechSynthesis.speak(utterance);
      });
    });
  }

  // Синонимы
  const synonyms = await getSynonyms(data.word);
  const synContainer = document.getElementById('synonyms-container');
  if (synonyms.length === 0) {
    synContainer.innerHTML = '<p>Нет синонимов.</p>';
  } else {
    synContainer.innerHTML = synonyms.map(syn => 
      `<span class="synonym-tag">${syn}</span>`
    ).join('');
  }
}

// Dictionary
function renderWordsList() {
  const words = dict.getWords();
  if (words.length === 0) {
    emptyDict.style.display = 'block';
    wordsList.style.display = 'none';
    return;
  }
  
  emptyDict.style.display = 'none';
  wordsList.style.display = 'grid';
  wordsList.innerHTML = words.map(w => `
    <div class="word-item">
      <h3>${w.word}</h3>
      <p>${w.translation || w.explanation?.substring(0, 60) + '...'}</p>
    </div>
  `).join('');
}

// Import/Export
function setupImportExport() {
  exportBtn.addEventListener('click', () => {
    const data = dict.export();
    downloadJSON(data, 'english-dictionary.json');
  });

  importBtn.addEventListener('click', () => {
    importFile.click();
  });

  importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (dict.import(event.target.result)) {
        alert('Словарь импортирован!');
        renderWordsList();
      } else {
        alert('Ошибка импорта');
      }
    };
    reader.readAsText(file);
  });
}

// QR Code
function setupQR() {
  shareQrBtn.addEventListener('click', () => {
    const data = dict.export();
    const qr = generateQR(data, 250);
    qrCode.innerHTML = '';
    qrCode.appendChild(qr);
    qrModal.style.display = 'flex';
  });

  closeQr.addEventListener('click', () => {
    qrModal.style.display = 'none';
  });
}

// Quiz
function loadQuiz() {
  quizWords = dict.getWordsDue();
  if (quizWords.length === 0) {
    quizStart.style.display = 'block';
    quizContainer.style.display = 'none';
    return;
  }
  quizStart.style.display = 'none';
  quizContainer.style.display = 'block';
  showNextQuizQuestion();
}

function showNextQuizQuestion() {
  if (quizWords.length === 0) {
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
  const options = [
    { text: word.translation || word.explanation.substring(0, 50), correct: true },
    ...wrongWords.map(w => ({ text: w.translation || w.word, correct: false }))
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
  dict.updateSRS(currentQuizWord.id, grade);
  nextQuizBtn.disabled = false;
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  themeToggle.addEventListener('click', toggleTheme);
  
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
  
  lookupInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLookup();
  });
  
  setupImportExport();
  setupQR();
  
  nextQuizBtn.addEventListener('click', () => {
    nextQuizBtn.disabled = true;
    showNextQuizQuestion();
  });
  
  startQuizBtn.addEventListener('click', loadQuiz);
  
  renderWordsList();
});
