import dictionary from './dictionary.js';

// DOM элементы
const addForm = document.getElementById('add-form');
const wordsList = document.getElementById('words-list');
const addWordBtn = document.getElementById('add-word-btn');
const startQuizBtn = document.getElementById('start-quiz-btn');
const saveWordBtn = document.getElementById('save-word-btn');
const cancelBtn = document.getElementById('cancel-btn');
const wordModal = document.getElementById('word-modal');
const closeModal = document.getElementById('close-modal');

// Инициализация
renderWordsList();

// Кнопки
addWordBtn.addEventListener('click', () => {
  addForm.style.display = 'block';
  wordsList.style.display = 'none';
});

cancelBtn.addEventListener('click', () => {
  addForm.style.display = 'none';
  wordsList.style.display = 'block';
});

saveWordBtn.addEventListener('click', () => {
  const word = document.getElementById('word-input').value.trim();
  if (!word) {
    alert('Введите слово!');
    return;
  }

  const newWord = dictionary.addWord({
    word,
    translation: document.getElementById('translation-input').value,
    explanation: document.getElementById('explanation-input').value,
    examples: Array.from(document.querySelectorAll('.example-input'))
      .map(el => el.value)
      .filter(v => v.trim())
  });

  // Сброс формы
  document.getElementById('word-input').value = '';
  document.getElementById('translation-input').value = '';
  document.getElementById('explanation-input').value = '';
  document.querySelectorAll('.example-input').forEach((el, i) => {
    if (i === 0) el.value = '';
    else el.remove();
  });

  addForm.style.display = 'none';
  wordsList.style.display = 'block';
  renderWordsList();
});

// Добавление примеров
document.getElementById('add-example-btn').addEventListener('click', () => {
  const container = document.getElementById('examples-container');
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'example-input';
  input.placeholder = 'Ещё пример';
  container.insertBefore(input, document.getElementById('add-example-btn'));
});

// Рендер списка слов
function renderWordsList() {
  const words = dictionary.getWords();
  const emptyMsg = document.getElementById('empty-message');

  if (words.length === 0) {
    emptyMsg.style.display = 'block';
    wordsList.innerHTML = '';
    wordsList.appendChild(emptyMsg);
    return;
  }

  emptyMsg.style.display = 'none';
  wordsList.innerHTML = '';
  wordsList.appendChild(emptyMsg);

  words.forEach(word => {
    const div = document.createElement('div');
    div.className = 'word-item';
    div.innerHTML = `
      <strong>${word.word}</strong>
      <span class="translation">${word.translation || '—'}</span>
      <button class="view-btn" data-id="${word.id}">Подробнее</button>
    `;
    wordsList.appendChild(div);
  });

  // Обработчик просмотра
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      showWordCard(id);
    });
  });
}

// Показ карточки слова
function showWordCard(id) {
  const word = dictionary.getWordById(id);
  if (!word) return;

  document.getElementById('modal-word').textContent = word.word;
  document.getElementById('modal-translation').textContent = word.translation || '—';
  document.getElementById('modal-explanation').textContent = word.explanation || '—';

  const examplesList = document.getElementById('modal-examples');
  examplesList.innerHTML = '';
  word.examples.forEach(example => {
    const li = document.createElement('li');
    li.textContent = example;
    examplesList.appendChild(li);
  });

  document.getElementById('play-audio-btn').onclick = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word.word);
      utterance.lang = 'en-US';
      speechSynthesis.speak(utterance);
    } else {
      alert('Ваш браузер не поддерживает произношение.');
    }
  };

  wordModal.style.display = 'block';
}

closeModal.onclick = () => wordModal.style.display = 'none';
window.onclick = (e) => {
  if (e.target === wordModal) wordModal.style.display = 'none';
};

// Кнопка "Тренировка"
startQuizBtn.addEventListener('click', () => {
  const dueWords = dictionary.getWordsDueForReview();
  if (dueWords.length === 0) {
    alert('Нет слов для повторения! Добавьте новые слова или подождите.');
    return;
  }
  // Позже: перейдём на страницу квиза или откроем модалку
  alert(`Готово к тренировке! Слов для повторения: ${dueWords.length}`);
});
