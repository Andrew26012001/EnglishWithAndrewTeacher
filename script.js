// script.js
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
  const translationStr = (Array.isArray(data.translation) ? data.translation.join(', ') : data.translation) || '';
  let meaningsHtml = '';
  (data.meanings || []).forEach(meaning => {
    meaningsHtml += `
      <div class="meaning">
        <div class="meaning-type">${meaning.partOfSpeech || ''}</div>
        ${ (meaning.definitions || []).map(def => `
          <div class="definition">${def.definition || ''}</div>
          ${def.example ? `<div class="example">"${def.example}"</div>` : ''}
        `).join('')}
      </div>
    `;
  });

  let synonymsHtml = '';
  if (data.synonyms && data.synonyms.length) {
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
        <div class="phonetic">${data.phonetic} ${translationStr ? `(${translationStr})` : ''}</div>
      </div>
      ${data.audioUrl ? `<button id="play-audio" class="audio-btn">🔊</button>` : ''}
    </div>
    ${meaningsHtml}
    ${synonymsHtml}
    <button id="add-to-dict" class="add-to-dict">Добавить в словарь</button>
  `;

  if (data.audioUrl) {
    const playBtn = wordCardResult.querySelector('#play-audio');
    playBtn.addEventListener('click', () => {
      try {
        const audio = new Audio(data.audioUrl);
        audio.play().catch(() => {});
      } catch (e) {}
    });
  }

  wordCardResult.querySelector('#add-to-dict').addEventListener('click', () => {
    // Prepare shape compatible with Dictionary.addWord
    const wordToAdd = {
      word: data.word,
      phonetic: data.phonetic,
      audioUrl: data.audioUrl,
      meanings: data.meanings || [],
      translation: Array.isArray(data.translation) ? data.translation : (data.translation ? [data.translation] : [])
    };
    dict.addWord(wordToAdd);
    alert(`Слово "${data.word}" добавлено.`);
    renderWordsList();
  });

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
      <div>
        <div class="word-item-title">${word.word}</div>
        <div class="word-item-translation">${word.translationStr || (word.translation || []).join(', ')}</div>
      </div>
      <div>
        <button class="delete-btn" aria-label="Удалить слово" style="float: right; background: none; border: none; cursor: pointer; color: red;">🗑️</button>
      </div>
    `;
    // delete handler
    item.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Удалить слово "${word.word}"?`)) {
        dict.removeWord(word.id);
        renderWordsList();
      }
    });

    item.addEventListener('click', (e) => {
      if (e.target.closest('.delete-btn')) return;
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
    // clear value to allow reimport same file
    importFile.value = '';
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
    // focus close button for accessibility
    closeQr.focus();
  });

  closeQr.addEventListener('click', () => {
    qrModal.style.display = 'none';
  });
}

function loadQuiz() {
  const dueWords = dict.getWordsDue();
  if (!dueWords.length) {
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
    quizWords = [...dueWords].sort(() => 0.5 - Math.random());
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

  // Update progress bar
  const total = dict.getWordsDue().length || 1; // snapshot size
  const done = total - quizWords.length;
  const percent = Math
