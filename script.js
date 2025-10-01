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

async function handleLookup() {
  const word = lookupInput.value.trim();
  if (!word) return;

  loader.style.display = 'block';
  wordCard.style.display = 'none';

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
  if (!data) return;

  document.getElementById('result-word').textContent = data.word;
  document.getElementById('result-phonetic').textContent = data.phonetic || '';

  const audioBtn = document.getElementById('result-audio-btn');
  const audioUrl = data.phonetics?.find(p => p.audio)?.audio;
  if (audioUrl) {
    audioBtn.style.display = 'inline-block';
    audioBtn.onclick = () => {
      const audio = new Audio(audioUrl);
      audio.play().catch(() => {
        const utterance = new SpeechSynthesisUtterance(data.word);
        utterance.lang = 'en-US';
        speechSynthesis.speak(utterance);
      });
    };
  } else {
    audioBtn.style.display = 'none';
  }

  const meaningsContainer = document.getElementById('result-meanings');
  meaningsContainer.innerHTML = '';

  if (data.meanings?.length > 0) {
    data.meanings.forEach(meaning => {
      const def = meaning.definitions?.[0] || {};
      const block = document.createElement('div');
      block.className = 'meaning-block';
      block.innerHTML = `
        <h4>${meaning.partOfSpeech || '—'}</h4>
        <p><strong>Meaning:</strong> ${def.definition || '—'}</p>
        ${def.example ? `<p><strong>Example:</strong> ${def.example}</p>` : ''}
        ${meaning.definitions?.length > 1 ? '<p><em>+ ещё определения</em></p>' : ''}
      `;
      meaningsContainer.appendChild(block);
    });
  } else {
    meaningsContainer.innerHTML = '<p>Нет данных о значении.</p>';
  }

  wordCard.style.display = 'block';
  wordsListSection.style.display = 'none';
}

saveWordBtn.addEventListener('click', () => {
  if (!currentWordData) return;

  const firstMeaning = currentWordData.meanings?.[0] || {};
  const firstDef = firstMeaning.definitions?.[0] || {};

  const wordToSave = {
    word: currentWordData.word,
    explanation: firstDef.definition || 'No definition available',
    examples: firstDef.example ? [firstDef.example] : [],
    audioUrl: currentWordData.phonetics?.find(p => p.audio)?.audio || ''
  };

  dictionary.addWord(wordToSave);
  alert('Слово сохранено в ваш словарь!');
  renderWordsList();
});

copyCardBtn.addEventListener('click', () => {
  if (!currentWordData) return;

  const text = `
${currentWordData.word}${currentWordData.phonetic ? ` [${currentWordData.phonetic}]` : ''}

Meaning: ${currentWordData.meanings?.[0]?.definitions?.[0]?.definition || '—'}

Examples:
${currentWordData.meanings?.[0]?.definitions?.[0]?.example ? `- ${currentWordData.meanings[0].definitions[0].example}` : ''}

— Скопировано из My Dictionary
  `.trim();

  navigator.clipboard.writeText(text).then(() => {
    alert('Карточка скопирована!');
  }).catch(() => {
    alert('Не удалось скопировать.');
  });
});

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

function renderWordsList() {
  const words = dictionary.getWords();
  document.getElementById('words-count').textContent = words.length;

  const emptyMsg = document.getElementById('empty-message');
  const wordsList = document.getElementById('words-list');
  wordsList.innerHTML = '';
  wordsList.appendChild(emptyMsg);

  if (words.length === 0) {
    emptyMsg.style.display = 'block';
    wordsListSection.style.display = 'block';
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

  wordsListSection.style.display = 'block';
}
