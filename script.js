import dictionary from './dictionary.js';
import { lookupWord } from './lookup.js';

// DOM
const lookupInput = document.getElementById('lookup-input');
const lookupBtn = document.getElementById('lookup-btn');
const loader = document.getElementById('lookup-loader');
const wordCard = document.getElementById('word-card-result');
const wordsListSection = document.getElementById('words-list-section');
const showLookupBtn = document.getElementById('show-lookup-btn');
const saveWordBtn = document.getElementById('save-word-btn');
const copyCardBtn = document.getElementById('copy-card-btn');

let currentWordData = null;

// Инициализация
renderWordsList();

// Поиск слова
async function handleLookup() {
  const word = lookupInput.value.trim();
  if (!word) return;

  loader.style.display = 'block';
  wordCard.style.display = 'none';
  wordsListSection.style.display = 'none';

  try {
    const data = await lookupWord(word);
    renderWordCard(data);
    currentWordData = data;
  } catch (error) {
    alert(error.message || 'Не удалось найти слово.');
  } finally {
    loader.style.display = 'none';
  }
}

function renderWordCard(data) {
  document.getElementById('result-word').textContent = data.word;
  document.getElementById('result-phonetic').textContent = data.phonetic || '';

  // Аудио
  const audioBtn = document.getElementById('result-audio-btn');
  if (data.phonetics && data.phonetics.find(p => p.audio)) {
    const audioUrl = data.phonetics.find(p => p.audio)?.audio;
    audioBtn.style.display = 'inline-block';
    audioBtn.onclick = () => {
      const audio = new Audio(audioUrl);
      audio.play().catch(() => {
        // Fallback: Web Speech
        const utterance = new SpeechSynthesisUtterance(data.word);
        utterance.lang = 'en-US';
        speechSynthesis.speak(utterance);
      });
    };
  } else {
    audioBtn.style.display = 'none';
  }

  // Значения
  const meaningsContainer = document.getElementById('result-meanings');
  meaningsContainer.innerHTML = '';

  data.meanings.forEach(meaning => {
    const block = document.createElement('div');
    block.className = 'meaning-block';
    block.innerHTML = `
      <h4>${meaning.partOfSpeech || '—'}</h4>
      <p><strong>Meaning:</strong> ${meaning.definitions[0].definition}</p>
      ${meaning.definitions[0].example ? `<p><strong>Example:</strong> ${meaning.definitions[0].example}</p>` : ''}
      ${meaning.definitions.length > 1 ? '<p><em>+ ещё определения</em></p>' : ''}
    `;
    meaningsContainer.appendChild(block);
  });

  wordCard.style.display = 'block';
}

// Сохранить слово
saveWordBtn.addEventListener('click', () => {
  if (!currentWordData) return;

  const firstMeaning = currentWordData.meanings[0];
  const firstDef = firstMeaning?.definitions[0];

  const wordToSave = {
    word: currentWordData.word,
    explanation: firstDef?.definition || '',
    examples: firstDef?.example ? [firstDef.example] : [],
    audioUrl: currentWordData.phonetics?.find(p => p.audio)?.audio || ''
  };

  dictionary.addWord(wordToSave);
  alert('Слово сохранено в ваш словарь!');
  renderWordsList();
});

// Скопировать карточку
copyCardBtn.addEventListener('click', () => {
  if (!currentWordData) return;

  const text = `
${currentWordData.word}${currentWordData.phonetic ? ` [${currentWordData.phonetic}]` : ''}

Meaning: ${currentWordData.meanings[0]?.definitions[0]?.definition || '—'}

Examples:
${currentWordData.meanings[0]?.definitions[0]?.example ? `- ${currentWordData.meanings[0].definitions[0].example}` : ''}

— Скопировано из My Dictionary
  `.trim();

  navigator.clipboard.writeText(text).then(() => {
    alert('Карточка скопирована!');
  }).catch(() => {
    alert('Не удалось скопировать. Попробуйте вручную.');
  });
});

// Переключение между режимами
lookupBtn.addEventListener('click', handleLookup);
lookupInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleLookup();
});

showLookupBtn.addEventListener('click', () => {
  wordsListSection.style.display = 'none';
  lookupInput.value = '';
  wordCard.style.display = 'none';
  document.querySelector('.lookup-section').scrollIntoView({ behavior: 'smooth' });
});

// Обновление списка
function renderWordsList() {
  const words = dictionary.getWords();
  document.getElementById('words-count').textContent = words.length;

  const emptyMsg = document.getElementById('empty-message');
  const wordsList = document.getElementById('words-list');
  wordsList.innerHTML = '';
  wordsList.appendChild(emptyMsg);

  if (words.length === 0) {
    emptyMsg.style.display = 'block';
    return;
  }

  emptyMsg.style.display = 'none';
  words.forEach(word => {
    const div = document.createElement('div');
    div.className = 'word-item';
    div.innerHTML = `
      <strong>${word.word}</strong>
      <span class="translation">${word.explanation.substring(0, 50)}${word.explanation.length > 50 ? '...' : ''}</span>
    `;
    wordsList.appendChild(div);
  });
}
