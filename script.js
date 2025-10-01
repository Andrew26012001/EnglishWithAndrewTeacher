import { Dictionary } from './dictionary.js';
import { lookupWord } from './lookup.js';
import { downloadJSON, generateQR } from './utils.js';

const dict = new Dictionary();

const themeToggle = document.getElementById('theme-toggle');
const lookupInput = document.getElementById('lookup-input');
const lookupLoader = document.getElementById('lookup-loader');
const wordCardResult = document.getElementById('word-card-result');
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
const quizProgressBar = document.getElementById('quiz-progress-bar');
const navBtns = document.querySelectorAll('.nav-btn');

let currentQuizWord = null;
let quizWords = [];
let currentQuery = '';

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
  if (!word || word.length < 3) { // Min length to avoid partial searches
    wordCardResult.style.display = 'none';
    return;
  }

  currentQuery = word;
  lookupLoader.style.display = 'block';
  wordCardResult.style.display = 'none';

  try {
    const data = await lookupWord(word);
    if (currentQuery !== lookupInput.value.trim()) return; // Ignore if input changed
    renderWordCard(data);
  } catch (error) {
    if (currentQuery !== lookupInput.value.trim()) return; // Ignore if input changed
    wordCardResult.innerHTML = `<p style="color: red;">${error.message}</p>`;
    wordCardResult.style.display = 'block';
  } finally {
    if (currentQuery === lookupInput.value.trim()) { // Only hide loader for current
      lookupLoader.style.display = 'none';
    }
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

  wordCardResult.querySelector('.add-to-dict').addEventListener('click', () => dict.addWord(data));
  wordCardResult.style.display = 'block';
}

function renderWordsList() {
  const words = dict.getWords();
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
    `;
    item.addEventListener('click', () => {
      lookupInput.value = word.word;
      handleLookup();
      switchView('lookup');
    });
    wordsList.appendChild(item);
  });
}

function setupImportExport() {
  exportBtn.addEventListener('click', () => {
    const json = dict.export();
    downloadJSON(json, 'dictionary.json');
  });

  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const success = dict.import(ev.target.result);
      if (success) {
        renderWordsList();
        alert('Импорт успешен!');
      } else {
        alert('Ошибка импорта.');
      }
    };
    reader.readAsText(file);
  });
}

function setupQR() {
  shareQrBtn.addEventListener('click', () => {
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
  quizWords = dict.getWordsDue().sort(() => 0.5 - Math.random());
  if (!quizWords.length) {
    quizContainer.style.display = 'none';
    quizStart.style.display = 'block';
    return;
  }

  quizStart.style.display = 'none';
  quizContainer.style.display = 'block';
  nextQuizBtn.style.display = 'block';
  nextQuizBtn.disabled = true;
  showNextQuizQuestion();
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
  
  const grade = isCorrect ? 2 : 0; // Can extend to hard/easy later
  dict.updateSRS(currentQuizWord.id, grade);
  nextQuizBtn.disabled = false;
}

function debounce(func, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  themeToggle.addEventListener('click', toggleTheme);
  
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
  
  lookupInput.addEventListener('input', debounce(handleLookup, 500)); // Increased debounce
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
