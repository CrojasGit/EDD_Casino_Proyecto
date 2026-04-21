/**
 * Modern Slot Machine - Realistic Reel Animation Logic
 */

// 1. MOTOR DE AUDIO - Web Audio API
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type, duration, vol = 0.1) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
}

const sounds = {
    coinInsert: () => playTone(600, 'square', 0.1, 0.05),
    spinStart: () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        // Sonido de barrido ascendente (sweep)
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 1.5);

        gainNode.gain.setValueAtTime(0.0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.5);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 1.5);

        // Efecto secundario: "Ticking" (clics metálicos rápidos que simulan ranuras pasando)
        let t = 0;
        for(let i=0; i<18; i++) {
            setTimeout(() => playTone(1000 + Math.random()*200, 'triangle', 0.03, 0.01), t);
            t += 80; // cada 80ms hace un "tic"
        }
    },
    reelStop: () => playTone(100, 'square', 0.15, 0.1),
    win: () => {
        let t = 0;
        for (let i = 0; i < 5; i++) {
            setTimeout(() => playTone(400 + (i * 150), 'square', 0.1, 0.1), t); t += 120;
        }
    },
    jackpot: () => {
        let t = 0;
        for (let i = 0; i < 25; i++) {
            setTimeout(() => playTone(800 + Math.random() * 500, 'square', 0.1, 0.15), t); t += 100;
        }
    }
};

// 2. CONFIGURACIÓN DEL JUEGO
const SYMBOLS = ['🍒', '🍋', '🍉', '🔔', '💎', '7️⃣'];

const PAYTABLE = { '🍒': 5, '🍋': 5, '🍉': 10, '🔔': 10, '💎': 25, '7️⃣': 100 };
const LIMITS = { MIN_BET: 10, MAX_BET: 500, BET_STEP: 10 };

// 3. ESTADO GLOBAL
const STORAGE_KEY = 'retroSlotGitHubData';
let gameState = { balance: 1000, bet: 50 };
let currentSymbols = ['🍒', '🍋', '🍉']; 

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try { gameState = JSON.parse(saved); } catch (e) { console.error("Data corrupted"); }
    }
    if (gameState.balance < 0) gameState.balance = 0;
    if (gameState.bet < LIMITS.MIN_BET) gameState.bet = LIMITS.MIN_BET;
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState)); }

// 4. INTERFAZ DE USUARIO (DOM)
const ui = {
    balance: document.getElementById('balance-display'),
    win: document.getElementById('win-display'),
    bet: document.getElementById('bet-display'),
    btnMinus: document.getElementById('btn-bet-minus'),
    btnPlus: document.getElementById('btn-bet-plus'),
    btnSpin: document.getElementById('btn-spin'),
    toggleAuto: document.getElementById('toggle-auto'),
    reelStrips: [
        document.querySelector('#reel-1 .reel-strip'),
        document.querySelector('#reel-2 .reel-strip'),
        document.querySelector('#reel-3 .reel-strip')
    ],
    overlayReload: document.getElementById('reload-overlay'),
    btnReload: document.getElementById('btn-reload'),
    overlayJackpot: document.getElementById('jackpot-overlay'),
    jackpotTotal: document.getElementById('jackpot-amount')
};

let control = { isSpinning: false, autoInterval: null };

function updateUI() {
    ui.balance.innerText = gameState.balance;
    ui.bet.innerText = gameState.bet;

    if (gameState.balance <= 0 && !control.isSpinning) {
        ui.overlayReload.classList.remove('hidden');
        disableAutoSpin();
    } else {
        ui.overlayReload.classList.add('hidden');
    }
}

// 5. MOTOR DE CÁLCULO RNG
function processBackendSpin(betAmount) {
    const resultReels = [
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
    ];
    let winAmount = 0;

    // Regla estricta: Solo se gana con 3 Idénticos.
    if (resultReels[0] === resultReels[1] && resultReels[1] === resultReels[2]) {
        const symbol = resultReels[0];
        winAmount = betAmount * PAYTABLE[symbol];
    }

    return { results: resultReels, winSize: winAmount, isJackpot: (winAmount > 0 && resultReels[0] === '7️⃣') };
}

// 6. FLUJO DE GIRO - ANIMACIÓN REALISTA CSS TRANSLATE
function executeSpin() {
    if (control.isSpinning) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    if (gameState.balance < gameState.bet) {
        disableAutoSpin(); alert("¡Saldo insuficiente!"); updateUI(); return;
    }

    gameState.balance -= gameState.bet;
    ui.win.innerText = '0';
    saveState(); updateUI();

    control.isSpinning = true; 
    ui.btnSpin.disabled = true; 
    sounds.spinStart();

    const spinData = processBackendSpin(gameState.bet);

    // Configurar la animación de cada rodillo
    ui.reelStrips.forEach((strip, index) => {
        const finalSymbol = spinData.results[index];
        const numSymbolsInStrip = 25 + (index * 15); // Los de la derecha giran por mas tiempo
        
        let html = `<div class="symbol">${currentSymbols[index]}</div>`;
        
        // Rellenar de símbolos falsos en movimiento
        for (let i = 1; i < numSymbolsInStrip - 1; i++) {
            const randomSym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            html += `<div class="symbol">${randomSym}</div>`;
        }
        
        // Colocar símbolo ganador al final
        html += `<div class="symbol">${finalSymbol}</div>`;
        strip.innerHTML = html;

        // Reset posición al instante
        strip.style.transition = 'none';
        strip.style.transform = 'translateY(0)';
        
        // Triggerear un Reflow forzosamente para que el navegador capte el transition:none
        void strip.offsetHeight;

        // Calcular el desplazamiento total basado en la altura de un símbolo
        const symbolHeight = strip.querySelector('.symbol').offsetHeight;
        const targetY = -((numSymbolsInStrip - 1) * symbolHeight);

        // Iniciar la animación
        const duration = 1.2 + (index * 0.6); // Rodillos paran en 1.2s, 1.8s, 2.4s
        
        strip.style.transition = `transform ${duration}s cubic-bezier(0.1, 0.7, 0.1, 1)`;
        strip.style.transform = `translateY(${targetY}px)`;

        // Reproducir sonido de freno en ese momento exacto
        setTimeout(() => sounds.reelStop(), duration * 1000);

        // Actualizar símbolo actual post-animación
        currentSymbols[index] = finalSymbol;
    });

    // Esperar a que el ultimo rodillo de girar deje de girar + 100ms
    const maxDuration = 1.2 + (2 * 0.6);
    setTimeout(() => finishSpin(spinData), (maxDuration * 1000) + 100);
}

function finishSpin(data) {
    control.isSpinning = false; ui.btnSpin.disabled = false;

    if (data.winSize > 0) {
        ui.win.innerText = data.winSize;
        gameState.balance += data.winSize;

        if (data.isJackpot) {
            sounds.jackpot(); triggerJackpotOverlay(data.winSize); disableAutoSpin();
        } else { sounds.win(); }
    }

    saveState(); updateUI();
    
    // Lógica para Auto-Spin encadenado (mucho más robusto que setInterval)
    if (ui.toggleAuto.checked) {
        if (gameState.balance < gameState.bet) {
            disableAutoSpin();
        } else if (!data.isJackpot) {
            control.autoInterval = setTimeout(executeSpin, 800); // Pequeño descanso antes del siguiente giro
        }
    }
}

function triggerJackpotOverlay(amount) {
    ui.jackpotTotal.innerText = "+ " + amount + " MONEDAS";
    ui.overlayJackpot.classList.remove('hidden');
    setTimeout(() => { ui.overlayJackpot.classList.add('hidden'); }, 4500);
}

// 7. EVENTOS
ui.btnSpin.addEventListener('click', executeSpin);

ui.btnMinus.addEventListener('click', () => {
    if (control.isSpinning) return;
    if (gameState.bet > LIMITS.MIN_BET) { gameState.bet -= LIMITS.BET_STEP; sounds.coinInsert(); saveState(); updateUI(); }
});

ui.btnPlus.addEventListener('click', () => {
    if (control.isSpinning) return;
    if (gameState.bet < LIMITS.MAX_BET && (gameState.bet + LIMITS.BET_STEP) <= gameState.balance) {
        gameState.bet += LIMITS.BET_STEP; sounds.coinInsert(); saveState(); updateUI();
    }
});

ui.btnReload.addEventListener('click', () => { sounds.win(); gameState.balance = 1000; saveState(); updateUI(); });

ui.toggleAuto.addEventListener('change', (e) => {
    if (e.target.checked) {
        if (gameState.balance < gameState.bet) { e.target.checked = false; return; }
        sounds.coinInsert();
        if (!control.isSpinning) {
            executeSpin();
        }
    } else { disableAutoSpin(); }
});

function disableAutoSpin() {
    ui.toggleAuto.checked = false;
    if (control.autoInterval) { clearTimeout(control.autoInterval); control.autoInterval = null; }
}

// ARRANQUE
function init() {
    loadState(); updateUI();
    // Cargar visual aleatorio al principio en lugar de dejarlos limpios
    ui.reelStrips.forEach((strip, i) => {
        currentSymbols[i] = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        strip.innerHTML = `<div class="symbol">${currentSymbols[i]}</div>`;
        strip.style.transform = `translateY(0px)`;
    });
}
init();
