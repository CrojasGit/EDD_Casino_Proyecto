/**
 * CHIPS & CHIPS - Casino Game
 * Juego de casino tipo "pollo" basado en diagrama de flujo
 */

// ============================================
// CONSTANTES Y CONFIGURACIÓN
// ============================================

const DIFFICULTY_SETTINGS = {
    easy: { riskChance: 0.50, multiplier: 2.0, label: 'Fácil' },
    medium: { riskChance: 0.65, multiplier: 3.0, label: 'Medio' },
    hard: { riskChance: 0.80, multiplier: 5.0, label: 'Difícil' }
};

const MAX_TILES = 10; // Máximo de casillas que se puede avanzar

// ============================================
// ESTADO DEL JUEGO
// ============================================

const GameState = {
    START: 'start',
    LOAD_PLAYER: 'load_player',
    SETUP: 'setup',
    PLAYING: 'playing',
    REVEALING: 'revealing',
    DECIDING_ADVANCE: 'deciding_advance',
    DECIDING_RETRY: 'deciding_retry',
    END_ROUND: 'end_round'
};

let currentState = GameState.START;

// Datos del jugador
let playerData = {
    name: '',
    money: 1000,
    gamesPlayed: 0,
    gamesWon: 0,
    totalWinnings: 0,
    totalLosses: 0
};

// Estado de la partida actual
let gameSession = {
    initialMoney: 0,
    betAmount: 0,
    difficulty: 'medium',
    currentMultiplier: 1.0,
    currentTile: 0,
    isAlive: true,
    tilesRevealed: [],
    canAdvance: false
};

// ============================================
// ELEMENTOS DEL DOM
// ============================================

const screens = {
    start: document.getElementById('start-screen'),
    loadPlayer: document.getElementById('load-player-screen'),
    setup: document.getElementById('setup-screen'),
    game: document.getElementById('game-screen')
};

const controls = {
    advance: document.getElementById('advance-controls'),
    retry: document.getElementById('retry-controls'),
    end: document.getElementById('end-controls'),
    gameMain: document.getElementById('game-controls')
};

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    showScreen('start');
});

function setupEventListeners() {
    // Pantalla de inicio
    document.getElementById('btn-new-game').addEventListener('click', startNewGame);
    document.getElementById('btn-load-game').addEventListener('click', () => showScreen('loadPlayer'));
    document.getElementById('btn-back-load').addEventListener('click', () => showScreen('start'));

    // Cargar jugador
    document.getElementById('save-file-input').addEventListener('change', handleFileSelect);
    document.getElementById('btn-confirm-load').addEventListener('click', loadPlayerData);

    // Pantalla de configuración
    document.getElementById('setup-bet-amount').addEventListener('input', updateMultiplierPreview);
    document.getElementById('setup-difficulty').addEventListener('change', updateMultiplierPreview);
    document.getElementById('btn-start-play').addEventListener('click', startPlaying);

    // Controles de avance
    document.getElementById('btn-advance-yes').addEventListener('click', advanceTile);
    document.getElementById('btn-advance-no').addEventListener('click', collectWinnings);

    // Controles de reintento
    document.getElementById('btn-retry-yes').addEventListener('click', retryBet);
    document.getElementById('btn-retry-no').addEventListener('click', exitToStart);

    // Controles de fin de juego
    document.getElementById('btn-save-exit').addEventListener('click', saveAndExit);
    document.getElementById('btn-new-round').addEventListener('click', startNewRound);

    // Modal
    document.getElementById('modal-cancel').addEventListener('click', hideModal);
    document.getElementById('modal-confirm').addEventListener('click', confirmModalAction);
}

// ============================================
// NAVEGACIÓN ENTRE PANTALLAS
// ============================================

function showScreen(screenName) {
    // Ocultar todas las pantallas
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active');
    });

    // Mostrar la pantalla deseada
    if (screens[screenName]) {
        screens[screenName].classList.add('active');
    }

    // Actualizar estado global
    currentState = GameState[screenName.toUpperCase()];
}

// ============================================
// GESTIÓN DE JUGADOR
// ============================================

function startNewGame() {
    // Crear jugador nuevo con dinero inicial
    playerData = {
        name: 'Jugador ' + Math.floor(Math.random() * 1000),
        money: 1000,
        gamesPlayed: 0,
        gamesWon: 0,
        totalWinnings: 0,
        totalLosses: 0
    };

    showSetupScreen();
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    const fileNameDisplay = document.getElementById('file-name');
    const confirmBtn = document.getElementById('btn-confirm-load');

    if (file) {
        fileNameDisplay.textContent = file.name;
        confirmBtn.disabled = false;
    } else {
        fileNameDisplay.textContent = 'Ningún archivo seleccionado';
        confirmBtn.disabled = true;
    }
}

function loadPlayerData() {
    const fileInput = document.getElementById('save-file-input');
    const file = fileInput.files[0];

    if (!file) {
        showNotification('Selecciona un archivo válido', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            playerData = { ...playerData, ...data };
            showNotification(`Jugador "${playerData.name}" cargado`, 'success');
            showSetupScreen();
        } catch (error) {
            showNotification('Error al cargar el archivo', 'error');
        }
    };
    reader.readAsText(file);
}

function savePlayerData() {
    const dataStr = JSON.stringify(playerData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `save_${playerData.name}_${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
}

// ============================================
// PANTALLA DE CONFIGURACIÓN
// ============================================

function showSetupScreen() {
    document.getElementById('setup-player-name').textContent = playerData.name;
    updatePlayerMoneyDisplay('setup-player-money', playerData.money);
    updateMultiplierPreview();
    showScreen('setup');
}

function updateMultiplierPreview() {
    const betAmount = parseInt(document.getElementById('setup-bet-amount').value) || 0;
    const difficulty = document.getElementById('setup-difficulty').value;
    const settings = DIFFICULTY_SETTINGS[difficulty];

    const multiplierPreview = document.getElementById('multiplier-preview');
    multiplierPreview.textContent = `x${settings.multiplier.toFixed(1)}`;

    // Validar apuesta
    const startBtn = document.getElementById('btn-start-play');
    startBtn.disabled = betAmount <= 0 || betAmount > playerData.money;
}

function updatePlayerMoneyDisplay(elementId, amount) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = `${amount.toFixed(2)} €`;
    }
}

// ============================================
// INICIO DEL JUEGO
// ============================================

function startPlaying() {
    const betAmount = parseInt(document.getElementById('setup-bet-amount').value);
    const difficulty = document.getElementById('setup-difficulty').value;

    // Validar apuesta
    if (betAmount <= 0 || betAmount > playerData.money) {
        showNotification('Apuesta no válida', 'error');
        return;
    }

    // Inicializar sesión de juego
    gameSession = {
        initialMoney: playerData.money,
        betAmount: betAmount,
        difficulty: difficulty,
        currentMultiplier: 1.0,
        currentTile: 0,
        isAlive: true,
        tilesRevealed: [],
        canAdvance: false
    };

    // Descontar apuesta
    playerData.money -= betAmount;
    playerData.gamesPlayed++;

    // Configurar pantalla de juego
    setupGameScreen();
    showScreen('game');
    currentState = GameState.PLAYING;

    // Revelar primera casilla automáticamente
    setTimeout(revealTile, 500);
}

function setupGameScreen() {
    const settings = DIFFICULTY_SETTINGS[gameSession.difficulty];

    // Actualizar header
    document.getElementById('game-player-name').textContent = playerData.name;
    updatePlayerMoneyDisplay('game-player-money', playerData.money);
    updatePlayerMoneyDisplay('game-current-bet', gameSession.betAmount);
    document.getElementById('game-multiplier').textContent = `x${gameSession.currentMultiplier.toFixed(1)}`;

    // Generar tablero
    generateBoard();

    // Resetear zona de resultados
    resetResultZone();

    // Ocultar todos los controles
    hideAllControls();
    controls.gameMain.classList.remove('hidden');

    // Mostrar botón de jugar inicial
    showInitialPlayButton();
}

function generateBoard() {
    const boardPath = document.getElementById('board-path');
    boardPath.innerHTML = '';

    for (let i = 0; i < MAX_TILES; i++) {
        const tile = document.createElement('div');
        tile.className = 'tile hidden';
        tile.textContent = i + 1;
        tile.id = `tile-${i}`;
        boardPath.appendChild(tile);
    }
}

function resetResultZone() {
    const tileDisplay = document.getElementById('tile-display');
    tileDisplay.className = 'tile-display';
    tileDisplay.innerHTML = '<div class="tile-hidden">?</div>';

    document.getElementById('result-message').innerHTML = '<p class="message-text">¡Haz tu jugada!</p>';
    updatePlayerMoneyDisplay('current-winnings', 0);
}

function hideAllControls() {
    controls.advance.classList.add('hidden');
    controls.retry.classList.add('hidden');
    controls.end.classList.add('hidden');
    controls.gameMain.classList.add('hidden');
}

function showInitialPlayButton() {
    controls.gameMain.innerHTML = '';
    const playBtn = document.createElement('button');
    playBtn.id = 'btn-reveal';
    playBtn.className = 'btn btn-primary';
    playBtn.innerHTML = '<span class="btn-icon">🎲</span> Desvelar Casilla';
    playBtn.addEventListener('click', revealTile);
    controls.gameMain.appendChild(playBtn);
}

// ============================================
// MECÁNICA DE JUEGO
// ============================================

function revealTile() {
    if (currentState !== GameState.PLAYING) return;

    currentState = GameState.REVEALING;
    hideAllControls();

    const settings = DIFFICULTY_SETTINGS[gameSession.difficulty];
    const isDanger = Math.random() < settings.riskChance;

    // Actualizar display
    const tileDisplay = document.getElementById('tile-display');
    const resultMessage = document.getElementById('result-message');

    // Animación de revelado
    tileDisplay.classList.add('revealed');

    if (isDanger) {
        // Casilla peligrosa - PERDER
        tileDisplay.classList.add('danger');
        tileDisplay.innerHTML = '💀';
        resultMessage.innerHTML = '<p class="message-text" style="color: var(--danger-color)">¡Has perdido!</p>';

        gameSession.isAlive = false;
        gameSession.tilesRevealed.push({ tile: gameSession.currentTile, safe: false });

        // Actualizar tablero
        updateBoardDisplay(false);

        // Calcular pérdidas
        const lossAmount = gameSession.betAmount * gameSession.currentMultiplier;
        playerData.totalLosses += lossAmount;

        // Mostrar controles de reintento
        setTimeout(() => {
            showRetryControls(lossAmount);
        }, 1000);

    } else {
        // Casilla segura - GANAR
        tileDisplay.classList.add('safe');
        tileDisplay.innerHTML = '✨';

        const currentWinnings = gameSession.betAmount * gameSession.currentMultiplier;
        updatePlayerMoneyDisplay('current-winnings', currentWinnings);

        resultMessage.innerHTML = '<p class="message-text" style="color: var(--success-color)">¡Casilla segura!</p>';

        gameSession.tilesRevealed.push({ tile: gameSession.currentTile, safe: true });

        // Actualizar tablero
        updateBoardDisplay(true);

        // Incrementar multiplicador
        gameSession.currentMultiplier *= settings.multiplier;
        document.getElementById('game-multiplier').textContent = `x${gameSession.currentMultiplier.toFixed(1)}`;

        // Mostrar controles de avance
        setTimeout(() => {
            showAdvanceControls();
        }, 500);
    }
}

function updateBoardDisplay(wasSafe) {
    // Actualizar casilla actual
    const currentTileElement = document.getElementById(`tile-${gameSession.currentTile}`);
    if (currentTileElement) {
        currentTileElement.classList.remove('hidden', 'current');
        currentTileElement.classList.add(wasSafe ? 'revealed-safe' : 'revealed-danger');
        currentTileElement.innerHTML = wasSafe ? '✨' : '💀';
    }

    // Marcar casillas pasadas
    for (let i = 0; i < gameSession.currentTile; i++) {
        const tile = document.getElementById(`tile-${i}`);
        if (tile) {
            tile.classList.add('passed');
        }
    }

    // Mostrar siguiente casilla como actual si existe
    if (gameSession.currentTile < MAX_TILES - 1) {
        const nextTile = document.getElementById(`tile-${gameSession.currentTile + 1}`);
        if (nextTile) {
            nextTile.classList.add('current');
        }
    }
}

// ============================================
// DECISIÓN DE AVANZAR
// ============================================

function showAdvanceControls() {
    controls.advance.classList.remove('hidden');
    currentState = GameState.DECIDING_ADVANCE;

    const settings = DIFFICULTY_SETTINGS[gameSession.difficulty];
    const newMultiplier = gameSession.currentMultiplier * settings.multiplier;
    const newBetValue = gameSession.betAmount * newMultiplier;

    document.getElementById('advance-bet-info').textContent = `${(gameSession.betAmount * gameSession.currentMultiplier).toFixed(2)} €`;
    document.getElementById('advance-new-bet').textContent = `${newBetValue.toFixed(2)} €`;
}

function advanceTile() {
    if (gameSession.currentTile >= MAX_TILES - 1) {
        showNotification('¡Has llegado al final!', 'warning');
        collectWinnings();
        return;
    }

    gameSession.currentTile++;
    gameSession.canAdvance = false;

    // Actualizar dinero mostrado (ganancias potenciales)
    updatePlayerMoneyDisplay('game-player-money', playerData.money);

    currentState = GameState.PLAYING;
    hideAllControls();

    // Actualizar mensaje
    document.getElementById('result-message').innerHTML = '<p class="message-text">¡Avanzando...</p>';

    setTimeout(revealTile, 800);
}

function collectWinnings() {
    const winnings = gameSession.betAmount * gameSession.currentMultiplier;
    playerData.money += winnings;
    playerData.gamesWon++;
    playerData.totalWinnings += winnings;

    // Actualizar display
    updatePlayerMoneyDisplay('game-player-money', playerData.money);

    // Mostrar fin de ronda
    showEndRound(true, winnings);
}

// ============================================
// DECISIÓN DE REINTENTO
// ============================================

function showRetryControls(lossAmount) {
    controls.retry.classList.remove('hidden');
    currentState = GameState.DECIDING_RETRY;

    document.getElementById('loss-amount').textContent = `${lossAmount.toFixed(2)} €`;

    if (playerData.money <= 0) {
        document.getElementById('retry-message').textContent = '¡Te has quedado sin dinero!';
        document.getElementById('btn-retry-yes').disabled = true;
    } else {
        document.getElementById('retry-message').textContent = '¡Has perdido!';
        document.getElementById('btn-retry-yes').disabled = false;
    }
}

function retryBet() {
    if (playerData.money < gameSession.betAmount) {
        showNotification('No tienes suficiente dinero', 'error');
        return;
    }

    // Resetear estado de juego
    gameSession.currentTile = 0;
    gameSession.currentMultiplier = 1.0;
    gameSession.isAlive = true;
    gameSession.tilesRevealed = [];

    // Descontar apuesta
    playerData.money -= gameSession.betAmount;
    playerData.gamesPlayed++;

    // Actualizar displays
    updatePlayerMoneyDisplay('game-player-money', playerData.money);
    document.getElementById('game-multiplier').textContent = 'x1.0';

    // Regenerar tablero
    generateBoard();
    resetResultZone();

    currentState = GameState.PLAYING;
    hideAllControls();
    controls.gameMain.classList.remove('hidden');
    showInitialPlayButton();
}

function exitToStart() {
    showConfirmModal(
        'Salir del juego',
        '¿Estás seguro de que quieres salir? Perderás el progreso no guardado.',
        () => {
            savePlayerData();
            showScreen('start');
        }
    );
}

// ============================================
// FIN DE RONDA
// ============================================

function showEndRound(isWin, amount) {
    controls.end.classList.remove('hidden');
    currentState = GameState.END_ROUND;

    const netResult = amount - (isWin ? 0 : gameSession.betAmount);
    const endMessage = document.getElementById('end-message');
    const netResultDisplay = document.getElementById('net-result');

    if (isWin) {
        endMessage.textContent = '¡Felicidades! Has ganado.';
        endMessage.style.color = 'var(--success-color)';
        netResultDisplay.textContent = `+${amount.toFixed(2)} €`;
        netResultDisplay.className = 'money';
    } else {
        endMessage.textContent = 'Más suerte la próxima vez.';
        endMessage.style.color = 'var(--danger-color)';
        netResultDisplay.textContent = `-${gameSession.betAmount.toFixed(2)} €`;
        netResultDisplay.className = 'money loss';
    }
}

function startNewRound() {
    showSetupScreen();
}

function saveAndExit() {
    savePlayerData();
    showNotification('Partida guardada', 'success');
    setTimeout(() => {
        showScreen('start');
    }, 1000);
}

// ============================================
// MODAL DE CONFIRMACIÓN
// ============================================

let modalCallback = null;

function showConfirmModal(title, message, callback) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    document.getElementById('confirm-modal').classList.remove('hidden');
    modalCallback = callback;
}

function hideModal() {
    document.getElementById('confirm-modal').classList.add('hidden');
    modalCallback = null;
}

function confirmModalAction() {
    if (modalCallback) {
        modalCallback();
    }
    hideModal();
}

// ============================================
// NOTIFICACIONES
// ============================================

let notificationTimeout = null;

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notification-text');

    notificationText.textContent = message;
    notification.className = `notification ${type} show`;

    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }

    notificationTimeout = setTimeout(() => {
        notification.classList.remove('show');
        notification.classList.add('hidden');
    }, 3000);
}

// ============================================
// UTILIDADES
// ============================================

function formatMoney(amount) {
    return `${amount.toFixed(2)} €`;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ============================================
// EXPORTAR/IMPORTAR PARTIDA (DEBUG)
// ============================================

window.exportSave = function() {
    const dataStr = JSON.stringify(playerData, null, 2);
    console.log('Save data:', dataStr);
    return dataStr;
};

window.importSave = function(data) {
    try {
        playerData = JSON.parse(data);
        showNotification('Datos importados correctamente', 'success');
        return true;
    } catch (e) {
        showNotification('Error al importar datos', 'error');
        return false;
    }
};
