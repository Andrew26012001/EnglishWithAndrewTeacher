import { Dictionary } from './dictionary.js';
import { lookupWord } from './lookup.js';
import { downloadJSON, generateQR } from './utils.js';

const dict = new Dictionary();

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
let quizTotal = 0;
let quizCorrect = 0;
let quizIncorrect = 0;

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
    wordCardResult.innerHTML = `<p style="color: red;">${error.message}</p>`;
    wordCardResult.style.display = 'block';
  } finally {
    lookupLoader.style.display = 'none';
  }
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
      <div class="word-item-translation">${word.translation.join(', ')}</div>
      <button class="delete-btn" style="float: right; background: none; border: none; cursor: pointer; color: red;">🗑️</button>
    `;
    item.querySelector('.delete-btn').addEventListener('click', () => {
      if (confirm(`Удалить слово "${word.word}"?`)) {
        dict.removeWord(word.id);
        renderWordsList();
      }
    });
    item.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') {
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
  const allWords = dict.getWords();
  if (!allWords.length) {
    quizContainer.style.display = 'none';
    quizStart.innerHTML = '<p>Нет слов для повторения.</p>';
    quizStart.style.display = 'block';
    return;
  }

  quizContainer.style.display = 'none';
  quizStart.innerHTML = '<button id="start-quiz-btn" class="btn">Начать тренировку</button>';
  quizStart.style.display = 'block';
  document.getElementById('start-quiz-btn').addEventListener('click', startQuiz);
}

function startQuiz() {
  const allWords = dict.getWords();
  quizWords = [...allWords].sort(() => 0.5 - Math.random()).slice(0, Math.min(10, allWords.length)); // Limit to 10 questions for better UX
  quizTotal = quizWords.length;
  quizCorrect = 0;
  quizIncorrect = 0;
  quizStart.style.display = 'none';
  quizContainer.style.display = 'block';
  nextQuizBtn.style.display = 'block';
  nextQuizBtn.disabled = true;
  quizProgressBar.style.width = '0%';
  showNextQuizQuestion();
}

function showNextQuizQuestion() {
  if (!quizWords.length) {
    quizQuestion.textContent = 'Тренировка завершена!';
    quizAnswers.innerHTML = `<p>Правильно: ${quizCorrect} из ${quizTotal}</p><p>Ошибок: ${quizIncorrect}</p>`;
    nextQuizBtn.textContent = 'Завершить';
    nextQuizBtn.disabled = false;
    nextQuizBtn.addEventListener('click', () => switchView('dictionary'), { once: true });
    return;
  }
  
  const word = quizWords[0]; // Don't shift yet, to allow repeat on wrong
  currentQuizWord = word;
  
  quizQuestion.textContent = `Что означает "${word.word}"? (Вопрос ${quizTotal - quizWords.length + 1}/${quizTotal})`;
  quizAnswers.innerHTML = '';
  
  const allWords = dict.getWords().filter(w => w.id !== word.id);
  const wrongWords = allWords.sort(() => 0.5 - Math.random()).slice(0, 3);
  const fallbackDef = word.meanings[0]?.definitions[0]?.definition?.substring(0, 50) || '';
  const options = [
    { text: word.translation[0] || fallbackDef, correct: true },
    ...wrongWords.map(w => ({ text: w.translation[0] || w.word, correct: false }))
  ].sort(() => 0.5 - Math.random());
  
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    btn.textContent = opt.text;
    btn.dataset.correct = opt.correct;
    btn.addEventListener('click', handleQuizAnswer);
    quizAnswers.appendChild(btn);
  });

  // Progress
  const progress = ((quizTotal - quizWords.length) / quizTotal) * 100;
  quizProgressBar.style.width = `${progress}%`;
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

  if (isCorrect) {
    quizCorrect++;
    quizWords.shift(); // Remove correct
  } else {
    quizIncorrect++;
    // Leave in quiz for repeat later? No, shift anyway for simplicity
    quizWords.shift();
  }

  nextQuizBtn.disabled = false;
}

// Init
document.addEventListener('DOMContentLoaded', () => {
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
  
  startQuizBtn.addEventListener('click', loadQuiz);
  
  renderWordsList();
});
