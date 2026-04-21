const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
  24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

const RED_NUMS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const BLACK_NUMS = new Set([2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]);

function colorOf(n) {
  if (n === 0) return 'green';
  return RED_NUMS.has(n) ? 'red' : 'black';
}

// ═══════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════
let state = {
  saldo: 1000,
  fichaSeleccionada: null,
  apuestas: [],          // [{tipo, label, numeros:[], monto, pago}]
  spinning: false,
  timerInterval: null,
  timerLeft: 20,
  wheelAngle: 0,
  recentNumbers: [],
  canBet: true
};

// ═══════════════════════════════════════════════════════
//  CANVAS WHEEL
// ═══════════════════════════════════════════════════════
const canvas = document.getElementById('wheel-canvas');
const ctx = canvas.getContext('2d');
const W = 500, CX = W / 2, CY = W / 2, R = W / 2 - 4;
const SLOTS = WHEEL_ORDER.length;
const ARC = (Math.PI * 2) / SLOTS;

function drawWheel(angle) {
  ctx.clearRect(0, 0, W, W);

  // outer ring
  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, Math.PI * 2);
  ctx.fillStyle = '#1a0a00';
  ctx.fill();

  WHEEL_ORDER.forEach((num, i) => {
    const start = angle + i * ARC - Math.PI / 2;
    const end = start + ARC;
    const col = colorOf(num);

    // slice
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, R - 12, start, end);
    ctx.closePath();
    ctx.fillStyle = col === 'red' ? '#b71c1c' : col === 'green' ? '#1b5e20' : '#111111';
    ctx.fill();
    ctx.strokeStyle = '#c9a84c';
    ctx.lineWidth = 1;
    ctx.stroke();

    // number text
    const midAngle = start + ARC / 2;
    const tx = CX + (R - 35) * Math.cos(midAngle);
    const ty = CY + (R - 35) * Math.sin(midAngle);
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(midAngle + Math.PI / 2);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${SLOTS > 30 ? 10 : 12}px Josefin Sans`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(num, 0, 0);
    ctx.restore();
  });

  // decorative ring
  ctx.beginPath();
  ctx.arc(CX, CY, R - 12, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(201,168,76,0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(201,168,76,0.6)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // diamonds on rim
  for (let i = 0; i < SLOTS; i++) {
    const a = angle + i * ARC - Math.PI / 2 + ARC / 2;
    const dx = CX + (R - 6) * Math.cos(a);
    const dy = CY + (R - 6) * Math.sin(a);
    ctx.save();
    ctx.translate(dx, dy);
    ctx.rotate(a);
    ctx.fillStyle = (i % 4 === 0) ? '#c9a84c' : 'rgba(255,255,255,0.2)';
    ctx.fillRect(-2, -2, 4, 4);
    ctx.restore();
  }
}

drawWheel(0);

// ═══════════════════════════════════════════════════════
//  BUILD TABLE
// ═══════════════════════════════════════════════════════
const LAYOUT = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]
];

function buildTable() {
  const grid = document.getElementById('numbers-grid');
  grid.innerHTML = '';

  // Row by row (3 rows, 12 cols each), left cell = street/seisena
  for (let row = 0; row < 3; row++) {
    // Street bet cell (left column)
    const streetNums = LAYOUT.map(r => r[0]).slice(0); // will be per col
    // We'll handle street bets via column iteration differently:
    // Left spacer for row grouping
    if (row === 0) {
      // zero
      const zCell = document.createElement('div');
      zCell.className = 'num-cell green zero-col';
      zCell.dataset.tipo = 'pleno';
      zCell.dataset.nums = '0';
      zCell.dataset.label = '0';
      zCell.dataset.pago = '35';
      zCell.textContent = '0';
      zCell.style.gridRow = '1 / 4';
      zCell.style.gridColumn = '1';
      grid.appendChild(zCell);
    }

    for (let col = 0; col < 12; col++) {
      const num = LAYOUT[row][col];
      const cell = document.createElement('div');
      cell.className = `num-cell ${colorOf(num) === 'red' ? 'red' : 'black-num'}`;

      // Pleno
      cell.dataset.tipo = 'pleno';
      cell.dataset.nums = String(num);
      cell.dataset.label = `Pleno ${num}`;
      cell.dataset.pago = '35';
      cell.textContent = num;
      cell.style.gridColumn = String(col + 2);
      cell.style.gridRow = String(row + 1);
      grid.appendChild(cell);
    }
  }

  // Add split / street overlays — build via separate approach: add invisible dividers
  // (For simplicity: shift-click = split between adjacent, ctrl-click = street, etc.)
  // We handle this via right-click context or by adding small border zones
  // Here we implement: single click = Pleno, 
  // For "mitad" bets (split, street, corner) we add clickable border zones

  addBorderZones(grid);

  // Dozens
  buildDozensCols();
  // Outside bets
  buildOutside();
}

function addBorderZones(grid) {
  // This approach: add a transparent overlay with absolute positioned tiny hit zones
  // between numbers for split/corner/street bets
  // We do it post-render with a transparent SVG overlay approach inside the grid container

  // After a brief delay (DOM rendered)
  setTimeout(() => {
    const wrap = document.getElementById('numbers-grid');
    if (!wrap) return;
    const cells = [...wrap.querySelectorAll('.num-cell:not(.zero-col)')];
    cells.forEach(cell => {
      // Right border = split right
      if (!cell.dataset.splitRight) {
        const col = parseInt(cell.style.gridColumn) - 2; // 0-based col
        const row = parseInt(cell.style.gridRow) - 1;    // 0-based row
        if (col < 11) {
          const zone = document.createElement('div');
          zone.style.cssText = `position:absolute;right:-4px;top:15%;width:8px;height:70%;z-index:5;cursor:pointer;`;
          zone.title = 'Dividida →';
          const num1 = LAYOUT[row][col];
          const num2 = LAYOUT[row][col + 1];
          zone.dataset.tipo = 'dividida';
          zone.dataset.nums = `${num1},${num2}`;
          zone.dataset.label = `Dividida ${num1}-${num2}`;
          zone.dataset.pago = '17';
          zone.addEventListener('click', e => { e.stopPropagation(); handleBet(zone.dataset); });
          zone.addEventListener('mouseenter', () => zone.style.background = 'rgba(240,208,128,0.35)');
          zone.addEventListener('mouseleave', () => zone.style.background = '');
          cell.style.position = 'relative';
          cell.appendChild(zone);
          cell.dataset.splitRight = '1';
        }
        // Bottom border = split down (vertical)
        if (row < 2) {
          const zoneB = document.createElement('div');
          zoneB.style.cssText = `position:absolute;bottom:-4px;left:15%;width:70%;height:8px;z-index:5;cursor:pointer;`;
          zoneB.title = 'Dividida ↓';
          const numDown = LAYOUT[row + 1][col];
          zoneB.dataset.tipo = 'dividida';
          zoneB.dataset.nums = `${num1 !== undefined ? num1 : LAYOUT[row][col]},${numDown}`;
          const numCur = LAYOUT[row][col];
          zoneB.dataset.nums = `${numCur},${numDown}`;
          zoneB.dataset.label = `Dividida ${numCur}-${numDown}`;
          zoneB.dataset.pago = '17';
          zoneB.addEventListener('click', e => { e.stopPropagation(); handleBet(zoneB.dataset); });
          zoneB.addEventListener('mouseenter', () => zoneB.style.background = 'rgba(240,208,128,0.35)');
          zoneB.addEventListener('mouseleave', () => zoneB.style.background = '');
          cell.appendChild(zoneB);
        }
      }
    });

    // Street bets: right edge of each column group (3 numbers in a column)
    for (let col = 0; col < 12; col++) {
      const nums = [LAYOUT[0][col], LAYOUT[1][col], LAYOUT[2][col]];
      // Add a small zone to the right of bottom cell
      const bottomCell = [...wrap.querySelectorAll('.num-cell:not(.zero-col)')].find(c =>
        parseInt(c.style.gridColumn) === col + 2 && parseInt(c.style.gridRow) === 3
      );
      if (bottomCell) {
        const sz = document.createElement('div');
        sz.style.cssText = `position:absolute;bottom:-4px;right:-4px;width:12px;height:12px;z-index:6;cursor:pointer;background:rgba(201,168,76,0.15);border-radius:2px;`;
        sz.title = `Calle ${nums[2]}-${nums[1]}-${nums[0]}`;
        sz.dataset.tipo = 'calle';
        sz.dataset.nums = nums.join(',');
        sz.dataset.label = `Calle ${nums[2]}-${nums[0]}`;
        sz.dataset.pago = '11';
        sz.addEventListener('click', e => { e.stopPropagation(); handleBet(sz.dataset); });
        sz.addEventListener('mouseenter', () => sz.style.background = 'rgba(240,208,128,0.5)');
        sz.addEventListener('mouseleave', () => sz.style.background = 'rgba(201,168,76,0.15)');
        bottomCell.appendChild(sz);
      }

      // Corner / cuadro (4 numbers)
      if (col < 11) {
        for (let row = 0; row < 2; row++) {
          const n1 = LAYOUT[row][col], n2 = LAYOUT[row][col + 1];
          const n3 = LAYOUT[row + 1][col], n4 = LAYOUT[row + 1][col + 1];
          const targetCell = [...wrap.querySelectorAll('.num-cell:not(.zero-col)')].find(c =>
            parseInt(c.style.gridColumn) === col + 2 && parseInt(c.style.gridRow) === row + 1
          );
          if (targetCell) {
            const cz = document.createElement('div');
            cz.style.cssText = `position:absolute;right:-4px;bottom:-4px;width:8px;height:8px;z-index:7;cursor:pointer;background:rgba(100,200,100,0.2);border-radius:50%;`;
            cz.title = `Cuadro ${n1}-${n2}-${n3}-${n4}`;
            cz.dataset.tipo = 'cuadro';
            cz.dataset.nums = `${n1},${n2},${n3},${n4}`;
            cz.dataset.label = `Cuadro ${n1}-${n4}`;
            cz.dataset.pago = '8';
            cz.addEventListener('click', e => { e.stopPropagation(); handleBet(cz.dataset); });
            cz.addEventListener('mouseenter', () => cz.style.background = 'rgba(100,255,100,0.5)');
            cz.addEventListener('mouseleave', () => cz.style.background = 'rgba(100,200,100,0.2)');
            targetCell.appendChild(cz);
          }
        }
      }
    }

    // Seisena bets (6 numbers = 2 columns)
    for (let col = 0; col < 11; col++) {
      const nums = [];
      for (let row = 0; row < 3; row++) nums.push(LAYOUT[row][col], LAYOUT[row][col + 1]);
      const bottomCell = [...wrap.querySelectorAll('.num-cell:not(.zero-col)')].find(c =>
        parseInt(c.style.gridColumn) === col + 2 && parseInt(c.style.gridRow) === 3
      );
      if (bottomCell) {
        const sz = document.createElement('div');
        sz.style.cssText = `position:absolute;bottom:-4px;right:-12px;width:20px;height:8px;z-index:5;cursor:pointer;background:rgba(180,100,200,0.15);border-radius:2px;`;
        sz.title = `Seisena`;
        sz.dataset.tipo = 'seisena';
        sz.dataset.nums = nums.join(',');
        sz.dataset.label = `Seisena ${nums[0]}-${nums[5] || nums[nums.length - 1]}`;
        sz.dataset.pago = '5';
        sz.addEventListener('click', e => { e.stopPropagation(); handleBet(sz.dataset); });
        sz.addEventListener('mouseenter', () => sz.style.background = 'rgba(200,100,255,0.5)');
        sz.addEventListener('mouseleave', () => sz.style.background = 'rgba(180,100,200,0.15)');
        bottomCell.appendChild(sz);
      }
    }
  }, 50);
}

function buildDozensCols() {
  const dRow = document.getElementById('dozens-row');
  const cRow = document.getElementById('columns-row');
  dRow.innerHTML = '';
  cRow.innerHTML = '';

  // spacer
  const sp1 = document.createElement('div'); sp1.className = 'outside-bet spacer'; dRow.appendChild(sp1);
  const sp2 = document.createElement('div'); sp2.className = 'outside-bet spacer'; cRow.appendChild(sp2);

  const docenas = [
    { label: '1ª Docena (1-12)', nums: range(1, 12), tipo: 'docena', pago: 2 },
    { label: '2ª Docena (13-24)', nums: range(13, 24), tipo: 'docena', pago: 2 },
    { label: '3ª Docena (25-36)', nums: range(25, 36), tipo: 'docena', pago: 2 },
  ];
  docenas.forEach(d => {
    const el = document.createElement('div');
    el.className = 'outside-bet';
    el.textContent = d.label;
    el.dataset.tipo = d.tipo;
    el.dataset.nums = d.nums.join(',');
    el.dataset.label = d.label;
    el.dataset.pago = d.pago;
    dRow.appendChild(el);
  });

  const cols = [
    { label: 'Col. 1 (3,6,9...36)', nums: LAYOUT[0], tipo: 'columna', pago: 2 },
    { label: 'Col. 2 (2,5,8...35)', nums: LAYOUT[1], tipo: 'columna', pago: 2 },
    { label: 'Col. 3 (1,4,7...34)', nums: LAYOUT[2], tipo: 'columna', pago: 2 },
  ];
  cols.forEach(c => {
    const el = document.createElement('div');
    el.className = 'outside-bet';
    el.textContent = c.label;
    el.dataset.tipo = c.tipo;
    el.dataset.nums = c.nums.join(',');
    el.dataset.label = c.label;
    el.dataset.pago = c.pago;
    cRow.appendChild(el);
  });
}

function buildOutside() {
  const ob = document.getElementById('outside-bets');
  ob.innerHTML = '';
  const bets = [
    { label: 'Falta (1-18)', nums: range(1, 18), tipo: 'falta', pago: 1 },
    { label: 'Par', nums: range(1, 36).filter(n => n % 2 === 0), tipo: 'par', pago: 1 },
    { label: 'Negro', nums: [...BLACK_NUMS], tipo: 'negro', pago: 1, cls: 'black-bet' },
    { label: 'Rojo', nums: [...RED_NUMS], tipo: 'rojo', pago: 1, cls: 'red-bet' },
    { label: 'Impar', nums: range(1, 36).filter(n => n % 2 !== 0), tipo: 'impar', pago: 1 },
    { label: 'Pasa (19-36)', nums: range(19, 36), tipo: 'pasa', pago: 1 },
  ];
  bets.forEach(b => {
    const el = document.createElement('div');
    el.className = `outside-bet ${b.cls || ''}`;
    el.textContent = b.label;
    el.dataset.tipo = b.tipo;
    el.dataset.nums = b.nums.join(',');
    el.dataset.label = b.label;
    el.dataset.pago = b.pago;
    ob.appendChild(el);
  });
}

function range(a, b) {
  const r = [];
  for (let i = a; i <= b; i++) r.push(i);
  return r;
}

// ═══════════════════════════════════════════════════════
//  BET LOGIC
// ═══════════════════════════════════════════════════════
function handleBet(ds) {
  if (state.spinning) return logInfo('⛔ No se puede apostar mientras gira');
  if (!state.canBet) return logInfo('⛔ Apuestas cerradas');
  if (!state.fichaSeleccionada) return logInfo('⚠️ Selecciona una ficha primero');

  const monto = state.fichaSeleccionada;
  if (monto > state.saldo) return logInfo('⚠️ Saldo insuficiente');

  const nums = ds.nums.split(',').map(Number);

  // Check if identical bet exists → add to it
  const existing = state.apuestas.find(a => a.tipo === ds.tipo && a.nums.join(',') === nums.join(','));
  if (existing) {
    if (existing.monto + monto > state.saldo + existing.monto) return logInfo('⚠️ Saldo insuficiente');
    state.saldo -= monto;
    existing.monto += monto;
  } else {
    state.saldo -= monto;
    state.apuestas.push({
      tipo: ds.tipo,
      label: ds.label,
      nums,
      monto,
      pago: parseInt(ds.pago)
    });
  }

  updateUI();
  highlightBets();
}

function retirarApuestas() {
  if (state.spinning) return;
  const total = state.apuestas.reduce((s, a) => s + a.monto, 0);
  state.saldo += total;
  state.apuestas = [];
  updateUI();
  highlightBets();
  logInfo('↩️ Apuestas retiradas');
}

// ═══════════════════════════════════════════════════════
//  SPIN
// ═══════════════════════════════════════════════════════
function spin() {
  if (state.spinning) return;
  state.spinning = true;
  state.canBet = false;
  clearInterval(state.timerInterval);

  document.getElementById('spin-overlay').classList.add('visible');

  // Pick winning number
  const winIdx = Math.floor(Math.random() * SLOTS);
  const winNum = WHEEL_ORDER[winIdx];

  // Determine target angle:
  // Each slot i is at angle: wheelAngle + i*ARC
  // We want slot winIdx to align with top (angle = 0)
  // needle is at angle 0 (top), slot is at: currentAngle + winIdx*ARC - pi/2
  // we need to add enough rotations so it lands there after several spins

  const spins = 5 + Math.random() * 3;
  const slotAngle = winIdx * ARC; // position of winning slot from 0
  const targetAngle = state.wheelAngle + (2 * Math.PI * spins) - (state.wheelAngle % (2 * Math.PI)) + (2 * Math.PI - slotAngle % (2 * Math.PI));

  const duration = 4000 + Math.random() * 2000;
  const startAngle = state.wheelAngle;
  const startTime = performance.now();

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function animate(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    state.wheelAngle = startAngle + (targetAngle - startAngle) * easeOut(progress);
    drawWheel(state.wheelAngle);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      state.wheelAngle = targetAngle % (2 * Math.PI);
      drawWheel(state.wheelAngle);
      onSpinEnd(winNum);
    }
  }

  requestAnimationFrame(animate);
}

function onSpinEnd(winNum) {
  document.getElementById('spin-overlay').classList.remove('visible');
  state.spinning = false;

  // Show result
  const col = colorOf(winNum);
  const rNum = document.getElementById('result-num');
  const rBadge = document.getElementById('result-badge');
  rNum.textContent = winNum;
  rNum.style.color = col === 'red' ? '#ff6b6b' : col === 'green' ? '#69f0ae' : '#f0f0f0';
  rBadge.textContent = col === 'red' ? 'ROJO' : col === 'green' ? 'VERDE' : 'NEGRO';
  rBadge.className = `result-badge badge-${col}`;

  logSpin(`🎰 Resultado: ${winNum} (${col === 'red' ? 'Rojo' : col === 'green' ? 'Verde' : 'Negro'})`);

  // Update recent numbers
  state.recentNumbers.unshift(winNum);
  if (state.recentNumbers.length > 12) state.recentNumbers.pop();
  renderRecentNumbers();

  // Evaluate bets
  let totalGanado = 0;
  state.apuestas.forEach(apuesta => {
    const hits = apuesta.nums.includes(winNum);
    if (hits) {
      const ganancia = apuesta.monto * apuesta.pago;
      state.saldo += apuesta.monto + ganancia; // devuelve apuesta + ganancia
      totalGanado += ganancia;
      logWin(`✅ ${apuesta.label}: +${ganancia} (apostado ${apuesta.monto})`);
    } else {
      logLose(`❌ ${apuesta.label}: -${apuesta.monto}`);
    }
  });

  if (state.apuestas.length === 0) {
    logInfo('ℹ️ Sin apuestas en esta ronda');
  }

  state.apuestas = [];
  highlightBets();

  if (state.saldo <= 0) {
    state.saldo = 0;
    logInfo('💸 Sin fichas. Compra más para continuar.');
  }

  updateUI();
  state.canBet = true;

  // restart timer
  startTimer();
}

// ═══════════════════════════════════════════════════════
//  TIMER
// ═══════════════════════════════════════════════════════
function startTimer() {
  clearInterval(state.timerInterval);
  state.timerLeft = 20;
  updateTimerBar();

  state.timerInterval = setInterval(() => {
    state.timerLeft--;
    updateTimerBar();
    if (state.timerLeft <= 0) {
      clearInterval(state.timerInterval);
      spin();
    }
  }, 1000);
}

function updateTimerBar() {
  const pct = (state.timerLeft / 20) * 100;
  const bar = document.getElementById('timer-bar');
  bar.style.width = pct + '%';
  bar.style.background = pct > 40
    ? 'linear-gradient(90deg, #7a5c1e, #f0d080)'
    : pct > 15
      ? 'linear-gradient(90deg, #c0392b, #ff7043)'
      : 'linear-gradient(90deg, #b71c1c, #ff1744)';
  document.getElementById('timer-count').textContent = state.timerLeft;
}

// ═══════════════════════════════════════════════════════
//  UI UPDATES
// ═══════════════════════════════════════════════════════
function updateUI() {
  document.getElementById('saldo-num').textContent = state.saldo.toLocaleString();
  const sel = state.fichaSeleccionada;
  document.getElementById('ficha-sel-label').textContent = sel ? sel : '—';

  const total = state.apuestas.reduce((s, a) => s + a.monto, 0);
  document.getElementById('total-apostado').textContent = total.toLocaleString();

  const list = document.getElementById('active-bets-list');
  if (state.apuestas.length === 0) {
    list.innerHTML = '<div style="color:rgba(255,255,255,0.35);font-size:0.7rem;text-align:center;padding:6px;">Sin apuestas activas</div>';
  } else {
    list.innerHTML = state.apuestas.map(a =>
      `<div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
        <span style="color:rgba(255,255,255,0.7);font-size:0.68rem;">${a.label}</span>
        <span style="color:var(--gold);font-size:0.68rem;">${a.monto}</span>
      </div>`
    ).join('');
  }
}

function highlightBets() {
  // Reset all highlights
  document.querySelectorAll('.bet-on').forEach(el => el.classList.remove('bet-on'));
  document.querySelectorAll('.chip-on-cell').forEach(el => el.remove());

  state.apuestas.forEach(apuesta => {
    // Match outside bets
    const outsideSel = `[data-tipo="${apuesta.tipo}"]`;
    document.querySelectorAll(outsideSel).forEach(el => {
      if (el.dataset.nums === apuesta.nums.join(',')) {
        el.classList.add('bet-on');
        // add chip indicator
        const chip = document.createElement('div');
        chip.className = 'chip-on-cell';
        chip.textContent = apuesta.monto >= 100 ? Math.floor(apuesta.monto / 100) + 'h' : apuesta.monto;
        el.style.position = 'relative';
        el.appendChild(chip);
      }
    });
  });
}

function renderRecentNumbers() {
  const wrap = document.getElementById('recent-numbers');
  wrap.innerHTML = state.recentNumbers.map(n => {
    const c = colorOf(n);
    return `<div class="recent-num rn-${c}">${n}</div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════
//  LOG
// ═══════════════════════════════════════════════════════
function addLog(text, cls) {
  const log = document.getElementById('log');
  const el = document.createElement('div');
  el.className = `log-entry ${cls}`;
  el.textContent = text;
  log.insertBefore(el, log.firstChild);
  while (log.children.length > 40) log.removeChild(log.lastChild);
}
const logWin = t => addLog(t, 'log-win');
const logLose = t => addLog(t, 'log-lose');
const logInfo = t => addLog(t, 'log-info');
const logSpin = t => addLog(t, 'log-spin');

// ═══════════════════════════════════════════════════════
//  EVENT LISTENERS
// ═══════════════════════════════════════════════════════

// Ficha selection
document.querySelectorAll('.ficha').forEach(f => {
  f.addEventListener('click', () => {
    document.querySelectorAll('.ficha').forEach(x => x.classList.remove('selected'));
    f.classList.add('selected');
    state.fichaSeleccionada = parseInt(f.dataset.val);
    updateUI();
  });
});

// Table clicks (delegated)
document.getElementById('numbers-grid').addEventListener('click', e => {
  const cell = e.target.closest('[data-tipo]');
  if (!cell) return;
  handleBet(cell.dataset);
});

['dozens-row', 'columns-row', 'outside-bets'].forEach(id => {
  document.getElementById(id).addEventListener('click', e => {
    const cell = e.target.closest('[data-tipo]');
    if (!cell) return;
    handleBet(cell.dataset);
  });
});

// Buttons
document.getElementById('btn-retirar-apuestas').addEventListener('click', retirarApuestas);

document.getElementById('btn-comprar').addEventListener('click', () => {
  document.getElementById('modal-overlay').classList.remove('hidden');
});
document.getElementById('modal-close').addEventListener('click', () => {
  document.getElementById('modal-overlay').classList.add('hidden');
});
document.querySelectorAll('.buy-opt').forEach(b => {
  b.addEventListener('click', () => {
    state.saldo += parseInt(b.dataset.amount);
    document.getElementById('modal-overlay').classList.add('hidden');
    updateUI();
    logInfo(`💳 +${parseInt(b.dataset.amount)} fichas compradas`);
  });
});

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════
buildTable();
updateUI();
startTimer();
logInfo('🎩 Bienvenido al Grand Casino. Selecciona una ficha y apuesta en la mesa.');
logInfo('⏱️ La ruleta gira automáticamente cada 20 segundos.');