const BOARD_SIZE = 8;
let board = [];
let currentPlayer = 'B'; // B:黒（プレイヤー）、W:白（ボット）
let botStrength = 'normal';

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const cellSize = canvas.width / BOARD_SIZE;

const statusElem = document.getElementById('status');
const scoreElem = document.getElementById('score');
const botStrengthSelect = document.getElementById('botStrength');

botStrengthSelect.addEventListener('change', () => {
  botStrength = botStrengthSelect.value;
  resetGame();
});

canvas.addEventListener('click', e => {
  if (currentPlayer !== 'B') return; // プレイヤーターンのみ受付
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / cellSize);
  const y = Math.floor((e.clientY - rect.top) / cellSize);
  if (isValidMove(x, y, currentPlayer)) {
    placeStone(x, y, currentPlayer);
    nextTurn();
  }
});

function resetGame() {
  board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
  // 初期配置
  board[3][3] = 'W';
  board[3][4] = 'B';
  board[4][3] = 'B';
  board[4][4] = 'W';
  currentPlayer = 'B';
  drawBoard();
  updateStatus();
  if (currentPlayer === 'W') {
    setTimeout(botMove, 500);
  }
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 盤面描画
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      // マス
      ctx.fillStyle = '#004d00';
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      ctx.strokeStyle = '#002200';
      ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);

      // 石描画
      const stone = board[y][x];
      if (stone) {
        ctx.beginPath();
        ctx.arc(
          x * cellSize + cellSize / 2,
          y * cellSize + cellSize / 2,
          cellSize / 2 - 6,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = stone === 'B' ? 'black' : 'white';
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.stroke();
      }
    }
  }
}

function isValidMove(x, y, player) {
  if (board[y][x] !== null) return false;
  return getFlippedStones(x, y, player).length > 0;
}

// 指定の位置に石を置き、ひっくり返す
function placeStone(x, y, player) {
  const flipped = getFlippedStones(x, y, player);
  if (flipped.length === 0) return false;

  board[y][x] = player;
  flipped.forEach(([fx, fy]) => {
    board[fy][fx] = player;
  });
  drawBoard();
  return true;
}

// ひっくり返せる石の位置リストを取得
function getFlippedStones(x, y, player) {
  if (board[y][x] !== null) return [];

  const opponent = player === 'B' ? 'W' : 'B';
  const directions = [
    [-1, -1], [0, -1], [1, -1],
    [-1,  0],          [1,  0],
    [-1,  1], [0,  1], [1,  1],
  ];
  let flipped = [];

  for (const [dx, dy] of directions) {
    let nx = x + dx;
    let ny = y + dy;
    let stonesToFlip = [];

    while (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
      if (board[ny][nx] === opponent) {
        stonesToFlip.push([nx, ny]);
      } else if (board[ny][nx] === player) {
        if (stonesToFlip.length > 0) {
          flipped = flipped.concat(stonesToFlip);
        }
        break;
      } else {
        break;
      }
      nx += dx;
      ny += dy;
    }
  }
  return flipped;
}

function getValidMoves(player) {
  let moves = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (isValidMove(x, y, player)) {
        moves.push([x, y]);
      }
    }
  }
  return moves;
}

function nextTurn() {
  currentPlayer = currentPlayer === 'B' ? 'W' : 'B';
  updateStatus();

  // パス判定
  if (getValidMoves(currentPlayer).length === 0) {
    // 両者とも置ける場所がなければ終了
    if (getValidMoves(currentPlayer === 'B' ? 'W' : 'B').length === 0) {
      showResult();
      return;
    } else {
      // パスしてターン戻す
      statusElem.textContent += '  (パス)';
      currentPlayer = currentPlayer === 'B' ? 'W' : 'B';
      updateStatus();
    }
  }

  drawBoard();

  if (currentPlayer === 'W') {
    setTimeout(botMove, 600);
  }
}

function botMove() {
  const moves = getValidMoves('W');
  if (moves.length === 0) {
    nextTurn();
    return;
  }

  let move;

  if (botStrength === 'weak') {
    move = moves[Math.floor(Math.random() * moves.length)];
  } else if (botStrength === 'normal') {
    // 最も多くひっくり返せる手を選択
    let maxFlip = -1;
    for (const [x, y] of moves) {
      const flipped = getFlippedStones(x, y, 'W').length;
      if (flipped > maxFlip) {
        maxFlip = flipped;
        move = [x, y];
      }
    }
  } else if (botStrength === 'strong') {
    // 強い（簡易的に一番角を優先）
    const corners = [[0,0],[0,7],[7,0],[7,7]];
    move = moves.find(([x,y]) => corners.some(([cx,cy]) => cx === x && cy === y));
    if (!move) {
      // なければ普通の手を選ぶ
      let maxFlip = -1;
      for (const [x, y] of moves) {
        const flipped = getFlippedStones(x, y, 'W').length;
        if (flipped > maxFlip) {
          maxFlip = flipped;
          move = [x, y];
        }
      }
    }
  }

  if (move) {
    placeStone(move[0], move[1], 'W');
  }
  nextTurn();
}

function updateStatus() {
  statusElem.textContent = `現在のターン: ${currentPlayer === 'B' ? '黒（あなた）' : '白（ボット）'}`;
  updateScore();
}

function updateScore() {
  let black = 0, white = 0;
  for (let row of board) {
    for (let cell of row) {
      if (cell === 'B') black++;
      else if (cell === 'W') white++;
    }
  }
  scoreElem.textContent = `黒: ${black}  白: ${white}`;
}

function showResult() {
  updateScore();
  const black = board.flat().filter(c => c === 'B').length;
  const white = board.flat().filter(c => c === 'W').length;
  let result;
  if (black > white) result = 'あなたの勝ち！';
  else if (white > black) result = 'ボットの勝ち！';
  else result = '引き分けです。';
  statusElem.textContent = `ゲーム終了！ ${result}`;
}

resetGame();