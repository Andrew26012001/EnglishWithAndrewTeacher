const quizData = [
  {
    question: "Что означает слово 'generous'?",
    answers: [
      { text: "Щедрый", correct: true },
      { text: "Жадный", correct: false },
      { text: "Скрытный", correct: false },
      { text: "Грустный", correct: false }
    ]
  },
  {
    question: "Что означает 'benevolent'?",
    answers: [
      { text: "Доброжелательный", correct: true },
      { text: "Злой", correct: false },
      { text: "Равнодушный", correct: false },
      { text: "Хитрый", correct: false }
    ]
  },
  {
    question: "Как перевести 'persistent'?",
    answers: [
      { text: "Настойчивый", correct: true },
      { text: "Ленивый", correct: false },
      { text: "Быстрый", correct: false },
      { text: "Тихий", correct: false }
    ]
  }
];

let currentQuestion = 0;
let score = 0;
let timer;
const TIME_LIMIT = 15;

const questionEl = document.getElementById('quiz-question');
const answersContainer = document.getElementById('quiz-answers');
const nextBtn = document.getElementById('next-btn');
const progressBar = document.getElementById('progress-bar');
const resultMessage = document.getElementById('result-message');

function loadQuestion() {
  resetState();
  const q = quizData[currentQuestion];
  questionEl.textContent = q.question;

  q.answers.forEach((answer, index) => {
    const button = document.createElement('button');
    button.classList.add('answer-btn');
    button.textContent = answer.text;
    button.dataset.correct = answer.correct;
    button.addEventListener('click', selectAnswer);
    answersContainer.appendChild(button);
  });

  startTimer();
}

function resetState() {
  resultMessage.textContent = '';
  nextBtn.disabled = true;
  nextBtn.classList.add('disabled');
  answersContainer.innerHTML = '';
  clearInterval(timer);
  progressBar.style.width = '0%';
}

function startTimer() {
  let timeLeft = TIME_LIMIT;
  progressBar.style.width = '0%';

  timer = setInterval(() => {
    timeLeft--;
    const progress = (timeLeft / TIME_LIMIT) * 100;
    progressBar.style.width = `${progress}%`;

    if (timeLeft <= 0) {
      clearInterval(timer);
      handleTimeout();
    }
  }, 1000);
}

function selectAnswer(e) {
  const selectedButton = e.target;
  const isCorrect = selectedButton.dataset.correct === 'true';

  Array.from(answersContainer.children).forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.correct === 'true') {
      btn.classList.add('correct');
    } else {
      btn.classList.add('incorrect');
    }
  });

  if (isCorrect) {
    score++;
  }

  nextBtn.disabled = false;
  nextBtn.classList.remove('disabled');
  clearInterval(timer);
}

function handleTimeout() {
  Array.from(answersContainer.children).forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.correct === 'true') {
      btn.classList.add('correct');
    }
  });
  resultMessage.textContent = 'Время вышло!';
  nextBtn.disabled = false;
  nextBtn.classList.remove('disabled');
}

function showNextQuestion() {
  if (currentQuestion < quizData.length - 1) {
    currentQuestion++;
    loadQuestion();
  } else {
    showResults();
  }
}

function showResults() {
  questionEl.textContent = '🎉 Квиз завершён!';
  answersContainer.style.display = 'none';
  resultMessage.textContent = `Вы ответили правильно на ${score} из ${quizData.length} вопросов.`;
  nextBtn.style.display = 'none';
}

nextBtn.addEventListener('click', showNextQuestion);

// Загружаем первый вопрос при старте
loadQuestion();
