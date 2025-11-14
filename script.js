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

function renderWordCard(data) {
  let meaningsHtml = data.meanings.map(meaning => `
    <div class="meaning">
      <div class="meaning-type">${meaning.partOfSpeech}</div>
      ${meaning.definitions.map(def => `
        <div class="definition">${def.definition}</div>
        ${def.example ? `<div class="example">"${def.example}"</div>` : ''}
      `).join('')}
    </div>
  `).join('');

  let synonymsHtml = data.synonyms?.length ? `
    <div class="synonyms">
      <h4>Синонимы:</h4>
      <div class="synonyms-list">
        ${data.synonyms.map(syn => `<span class.name = "synonym">${syn}</span>`).join('')}
      </div>
    </div>
  ` : '';

  const isWordInDict = dict.getWords().some(w => w.word.toLowerCase() === data.word.toLowerCase());

  wordCardResult.innerHTML = `
    <div class="word-header">
      <div>
        <div class="word-title">${data.word}</div>
        <div class="phonetic">${data.phonetic} (${Array.isArray(data.translation) ? data.translation[0] : data.translation})</div>
      </div>
      ${data.audioUrl ? `<button class="audio-btn" onclick="new Audio('${data.audioUrl}').play()">🔊</button>` : ''}
    </div>
    ${meaningsHtml}
    ${synonymsHtml}
    <button class="add-to-dict" ${isWordInDict ? 'disabled' : ''}>${isWordInDict ? 'Добавлено' : 'Добавить в словарь'}</button>
  `;

  const addButton = wordCardResult.querySelector('.add-to-dict');
  addButton.dataset.word = JSON.stringify(data); // Сохраняем данные для добавления

  addButton.addEventListener('click', async (e) => {
    const wordData = JSON.parse(e.currentTarget.dataset.word);
    await dict.addWord(wordData);
    e.currentTarget.textContent = 'Добавлено!';
    e.currentTarget.disabled = true;
  }, { once: true }); // Обработчик сработает только один раз

  wordCardResult.style.display = 'block';
}

function renderWordsList() {
  const words = dict.getWords();
  wordsList.innerHTML = '';
  
  if (!words.length) {
    emptyDict.style.display = 'block';
    wordsList.style.display = 'none';
    return;
  }
  
  emptyDict.style.display = 'none';
  wordsList.style.display = 'grid';

  words.sort((a, b) => (a.word > b.word) ? 1 : -1).forEach(word => {
    const item = document.createElement('div');
    item.className = 'word-item';
    const translation = Array.isArray(word.translation) ? word.translation[0] : word.translation;
    item.innerHTML = `
      <div class="word-item-title">${word.word}</div>
      <div class="word-item-translation">${translation}</div>
      <button class="delete-btn">🗑️</button>
    `;
    item.querySelector('.delete-btn').addEventListener('click', async (e) => {
      e.stopPropagation(); // Остановить всплытие события, чтобы не открылась карточка слова
      if (confirm(`Удалить слово "${word.word}"?`)) {
        await dict.removeWord(word.id);
        renderWordsList();
      }
    });
    item.addEventListener('click', () => {
      lookupInput.value = word.word;
      switchView('lookup');
      handleLookup();
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
  importFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const success = await dict.import(ev.target.result);
      if (success) {
        await dict.load(); // Перезагружаем слова из БД
        renderWordsList();
        alert('Импорт успешен!');
      } else {
        alert('Ошибка импорта.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Сбрасываем значение input, чтобы можно было загрузить тот же файл снова
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
  const dueWords = dict.getWordsDue();
  if (!dueWords.length) {
    quizContainer.style.display = 'none';
    quizStart.innerHTML = `<p>Нет слов для повторения на сегодня. Выучите новые слова или зайдите позже.</p>`;
    quizStart.style.display = 'block';
    return;
  }

  quizStart.innerHTML = `<button id="start-quiz-btn" class="btn">Начать тренировку (${dueWords.length} слов)</button>`;
  quizStart.style.display = 'block';
  quizContainer.style.display = 'none';
  
  document.getElementById('start-quiz-btn').addEventListener('click', () => {
    quizWords = [...dueWords].sort(() => 0.5 - Math.random());
    quizStart.style.display = 'none';
    quizContainer.style.display = 'block';
    nextQuizBtn.style.display = 'block';
    nextQuizBtn.disabled = true;
    showNextQuizQuestion();
  }, { once: true });
}

function showNextQuizQuestion() {
  const total = quizWords.length + (currentQuizWord ? 1 : 0);
  const done = total - quizWords.length;
  quizProgressBar.style.width = `${(done / total) * 100}%`;

  if (!quizWords.length && !currentQuizWord) {
    quizQuestion.textContent = 'Тренировка завершена!';
    quizAnswers.innerHTML = '';
    nextQuizBtn.style.display = 'none';
    quizContainer.style.display = 'none';
    quizStart.innerHTML = `<p>Отличная работа! Все слова повторены.</p><button id="restart-quiz-btn" class="btn">🔄 Повторить снова</button>`;
    quizStart.style.display = 'block';
    document.getElementById('restart-quiz-btn').addEventListener('click', loadQuiz);
    return;
  }
  
  const word = quizWords.shift();
  currentQuizWord = word;
  
  quizQuestion.textContent = `Что означает "${word.word}"?`;
  quizAnswers.innerHTML = '';
  
  const allWords = dict.getWords().filter(w => w.id !== word.id);
  const wrongOptions = allWords.sort(() => 0.5 - Math.random()).slice(0, 3);
  const correctTranslation = Array.isArray(word.translation) ? word.translation[0] : word.translation;
  
  const options = [
    { text: correctTranslation, correct: true },
    ...wrongOptions.map(w => ({ text: (Array.isArray(w.translation) ? w.translation[0] : w.translation), correct: false }))
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

async function handleQuizAnswer(e) {
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
  await dict.updateSRS(currentQuizWord.id, grade);
  nextQuizBtn.disabled = false;
  currentQuizWord = null; // Слово обработано
}

async function main() {
    await dict.init();
    
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
    
    // Инициализация первой view
    switchView('lookup');
}

document.addEventListener('DOMContentLoaded', main);

