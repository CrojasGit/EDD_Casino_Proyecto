// Configuración y variables del juego
const suits = ['♥', '♦', '♣', '♠'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

let deck = [];
let dealerHand = [];
let playerHand = [];
let gameOver = false;

// Elementos del DOM
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');

const dealerCardsEl = document.getElementById('dealer-cards');
const playerCardsEl = document.getElementById('player-cards');
const dealerScoreEl = document.getElementById('dealer-score');
const playerScoreEl = document.getElementById('player-score');
const messageArea = document.getElementById('message-area');

// Botones
const startBtn = document.getElementById('start-btn');
const hitBtn = document.getElementById('hit-btn');
const standBtn = document.getElementById('stand-btn');
const doubleBtn = document.getElementById('double-btn');
const restartBtn = document.getElementById('restart-btn');

// Event Listeners
startBtn.addEventListener('click', startGame);
hitBtn.addEventListener('click', hit);
standBtn.addEventListener('click', stand);
doubleBtn.addEventListener('click', double);
restartBtn.addEventListener('click', startGame);

// Funciones del juego
function createDeck() {
    deck = [];
    for (let suit of suits) {
        for (let value of values) {
            deck.push({ suit, value });
        }
    }
}

function shuffleDeck() {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function getNextCard() {
    return deck.shift();
}

function calculateScore(hand) {
    let score = 0;
    let aces = 0;

    for (let card of hand) {
        if (card.value === 'A') {
            aces++;
            score += 11;
        } else if (['J', 'Q', 'K'].includes(card.value)) {
            score += 10;
        } else {
            score += parseInt(card.value);
        }
    }

    // Ajustar si nos pasamos de 21 y tenemos ases
    while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
    }

    return score;
}

function renderCard(card, hidden = false) {
    const cardEl = document.createElement('div');
    if (hidden) {
        cardEl.className = 'card hidden-card';
    } else {
        const isRed = card.suit === '♥' || card.suit === '♦';
        cardEl.className = `card ${isRed ? 'red' : 'black'}`;
        cardEl.innerHTML = `
            <div class="card-top">${card.value}${card.suit}</div>
            <div class="card-bottom">${card.value}${card.suit}</div>
        `;
    }
    return cardEl;
}

function renderGame() {
    // Render Jugador
    playerCardsEl.innerHTML = '';
    playerHand.forEach((card, i) => {
        const cardEl = renderCard(card);
        cardEl.style.animationDelay = `${i * 0.1}s`;
        playerCardsEl.appendChild(cardEl);
    });
    playerScoreEl.textContent = calculateScore(playerHand);

    // Render Crupier
    dealerCardsEl.innerHTML = '';
    dealerHand.forEach((card, index) => {
        let cardEl;
        if (index === 1 && !gameOver) {
            cardEl = renderCard(card, true);
        } else {
            cardEl = renderCard(card);
        }
        cardEl.style.animationDelay = `${index * 0.1}s`;
        dealerCardsEl.appendChild(cardEl);
    });

    if (gameOver) {
        dealerScoreEl.textContent = calculateScore(dealerHand);
    } else {
        // En el juego normal, no mostramos la puntuación del dealer completa
        dealerScoreEl.textContent = calculateScore([dealerHand[0]]);
    }
    
    // Activar/desactivar el botón Doble
    // Generalmente solo se puede doblar con exactamente 2 cartas
    if (playerHand.length === 2 && !gameOver) {
        doubleBtn.disabled = false;
    } else {
        doubleBtn.disabled = true;
    }
}

function startGame() {
    createDeck();
    shuffleDeck();
    
    playerHand = [getNextCard(), getNextCard()];
    dealerHand = [getNextCard(), getNextCard()];
    gameOver = false;
    
    messageArea.textContent = '';
    messageArea.className = 'message-area';
    
    startScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    hitBtn.style.display = 'block';
    standBtn.style.display = 'block';
    doubleBtn.style.display = 'block';
    restartBtn.classList.add('hidden');
    
    hitBtn.disabled = false;
    standBtn.disabled = false;

    renderGame();
    
    // Comprobar Blackjack en mano inicial
    if (calculateScore(playerHand) === 21) {
        endGame('blackjack');
    }
}

function hit() {
    playerHand.push(getNextCard());
    
    if (calculateScore(playerHand) > 21) {
        endGame('bust');
    } else {
        renderGame();
    }
}

async function stand() {
    gameOver = true;
    hitBtn.disabled = true;
    standBtn.disabled = true;
    doubleBtn.disabled = true;
    
    renderGame(); // Muestra la carta oculta del crupier
    
    // Lógica del Crupier: debe pedir carta hasta alcanzar al menos 17
    while (calculateScore(dealerHand) < 17) {
        // Retraso para que la animación sea visible y más realista
        await new Promise(r => setTimeout(r, 600));
        dealerHand.push(getNextCard());
        renderGame();
    }
    
    const playerScore = calculateScore(playerHand);
    const dealerScore = calculateScore(dealerHand);
    
    if (dealerScore > 21) {
        endGame('dealer-bust');
    } else if (playerScore > dealerScore) {
        endGame('win');
    } else if (playerScore < dealerScore) {
        endGame('lose');
    } else {
        endGame('tie');
    }
}

function double() {
    // Doblar significa pedir una carta y plantarse automáticamente
    playerHand.push(getNextCard());
    
    if (calculateScore(playerHand) > 21) {
        endGame('bust');
    } else {
        stand();
    }
}

function endGame(reason) {
    gameOver = true;
    
    // Ocultar botones de juego, mostrar reiniciar
    hitBtn.style.display = 'none';
    standBtn.style.display = 'none';
    doubleBtn.style.display = 'none';
    restartBtn.classList.remove('hidden');
    
    renderGame();
    
    switch(reason) {
        case 'blackjack':
            messageArea.textContent = '¡Blackjack! Has ganado';
            messageArea.className = 'message-area message-success';
            break;
        case 'bust':
            messageArea.textContent = 'Has superado 21. Has perdido';
            messageArea.className = 'message-area message-danger';
            break;
        case 'dealer-bust':
            messageArea.textContent = 'El crupier se pasa. ¡Has ganado!';
            messageArea.className = 'message-area message-success';
            break;
        case 'win':
            messageArea.textContent = 'Has ganado';
            messageArea.className = 'message-area message-success';
            break;
        case 'lose':
            messageArea.textContent = 'Has perdido';
            messageArea.className = 'message-area message-danger';
            break;
        case 'tie':
            messageArea.textContent = 'Empate';
            messageArea.className = 'message-area message-tie';
            break;
    }
}
