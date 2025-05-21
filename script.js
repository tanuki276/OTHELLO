const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const resetBtn = document.getElementById('resetBtn');
const difficultySelect = document.getElementById('difficulty');

const BOARD_SIZE = 8;
let board = [];
let currentPlayer = 1; // 1=黒(人), 2=白(bot)
let cellSize;

function initBoard() {
  board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
  board[3][3] = 2;
  board[3][4] = 1;
  board[4][3] = 1;
  board[4][4] = 2;
  currentPlayer = 1;
  updateStatus('あなたの番（黒）');
}

function drawBoard() {
  canvas.width = 600;
  canvas.height = 600;
  cellSize = canvas.width / BOARD_SIZE;

  ctx.fillStyle = '#0a7d00';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  for(let i = 0; i <= BOARD_SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cellSize, 0);
    ctx.lineTo(i * cellSize, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i * cellSize);
    ctx.lineTo(canvas.width, i * cellSize);
    ctx.stroke();
  }

  for(let y=0; y<BOARD_SIZE; y++) {
    for(let x=0; x<BOARD_SIZE; x++) {
      if(board[y][x] !== 0) {
        drawStone(x, y, board[y][x]);
      }
    }
  }
}

function drawStone(x, y, player) {
  const centerX = x * cellSize + cellSize/2;
  const centerY = y * cellSize + cellSize/2;
  const radius = cellSize * 0.4;

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.fillStyle = player === 1 ? 'black' : 'white';
  ctx.fill();
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function isOnBoard(x, y) {
  return x >=0 && x < BOARD_SIZE && y >=0 && y < BOARD_SIZE;
}

function canPutStone(x, y, player) {
  if(board[y][x] !== 0) return false;

  const opponent = player === 1 ? 2 : 1;
  const directions = [
    [-1,-1], [0,-1], [1,-1],
    [-1,0],          [1,0],
    [-1,1],  [0,1],  [1,1]
  ];

  for(let [dx, dy] of directions) {
    let nx = x + dx, ny = y + dy;
    let hasOpponentBetween = false;

    while(isOnBoard(nx, ny)) {
      if(board[ny][nx] === opponent) {
        hasOpponentBetween = true;
      } else if(board[ny][nx] === player && hasOpponentBetween) {
        return true;
      } else {
        break;
      }
      nx += dx;
      ny += dy;
    }
  }

  return false;
}

function putStone(x, y, player) {
  if(!canPutStone(x, y, player)) return false;

  board[y][x] = player;
  const opponent = player === 1 ? 2 : 1;
  const directions = [
    [-1,-1], [0,-1], [1,-1],
    [-1,0],          [1,0],
    [-1,1],  [0,1],  [1,1]
  ];

  for(let [dx, dy] of directions) {
    let nx = x + dx, ny = y + dy;
    let stonesToFlip = [];

    while(isOnBoard(nx, ny)) {
      if(board[ny][nx] === opponent) {
        stonesToFlip.push([nx, ny]);
      } else if(board[ny][nx] === player) {
        for(let [fx, fy] of stonesToFlip) {
          board[fy][fx] = player;
        }
        break;
      } else {
        break;
      }
      nx += dx;
      ny += dy;
    }
  }

  return true;
}

function hasAnyValidMove(player) {
  for(let y=0; y<BOARD_SIZE; y++) {
    for(let x=0; x<BOARD_SIZE; x++) {
      if(canPutStone(x, y, player)) return true;
    }
  }
  return false;
}

function countStones() {
  let black = 0, white = 0;
  for(let y=0; y<BOARD_SIZE; y++) {
    for(let x=0; x<BOARD_SIZE; x++) {
      if(board[y][x] === 1) black++;
      else if(board[y][x] === 2) white++;
    }
  }
  return {black, white};
}

function updateStatus(msg) {
  const counts = countStones();
  status.textContent = `${msg}  黒: ${counts.black} 白: ${counts.white}`;
}

function gameOver() {
  const counts = countStones();
  if(counts.black > counts.white) updateStatus('ゲーム終了！あなたの勝ち！');
  else if(counts.black < counts.white) updateStatus('ゲーム終了！Botの勝ち！');
  else updateStatus('ゲーム終了！引き分け！');
}

function botMove() {
  if(!hasAnyValidMove(2)) {
    if(!hasAnyValidMove(1)) {
      gameOver();
    } else {
      currentPlayer = 1;
      updateStatus('あなたの番（黒） - Botはパスしました');
    }
    return;
  }

  // 難易度による動きの差を簡易実装
  const difficulty = difficultySelect ? difficultySelect.value : 'normal';

  // 合法手を取得
  const moves = [];
  for(let y=0; y<BOARD_SIZE; y++) {
    for(let x=0; x<BOARD_SIZE; x++) {
      if(canPutStone(x, y, 2)) moves.push([x,y]);
    }
  }

  if(moves.length === 0) {
    currentPlayer = 1;
    updateStatus('あなたの番（黒） - Botはパスしました');
    return;
  }

  let chosenMove;
  if(difficulty === 'easy') {
    // ランダム
    chosenMove = moves[Math.floor(Math.random() * moves.length)];
  } else if(difficulty === 'normal') {
    // 最も相手の石を返せる手を選ぶ
    let maxFlips = -1;
    for(let move of moves) {
      const flips = countFlippedStones(move[0], move[1], 2);
      if(flips > maxFlips) {
        maxFlips = flips;
        chosenMove = move;
      }
    }
  } else {
    // hard: normalの中でさらにランダムに選ぶ（簡易）
    const bestMoves = [];
    let maxFlips = -1;
    for(let move of moves) {
      const flips = countFlippedStones(move[0], move[1], 2);
      if(flips > maxFlips) {
        maxFlips = flips;
        bestMoves.length = 0;
        bestMoves.push(move);
      } else if(flips === maxFlips) {
        bestMoves.push(move);
      }
    }
    chosenMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }

  putStone(chosenMove[0], chosenMove[1], 2);
  drawBoard();

  if(hasAnyValidMove(1)) {
    currentPlayer = 1;
    updateStatus('あなたの番（黒）');
  } else if(hasAnyValidMove(2)) {
    currentPlayer = 2;
    updateStatus('Botの番（白） - あなたはパスしました');
    setTimeout(botMove, 500);
  } else {
    gameOver();
  }
}

function countFlippedStones(x, y, player) {
  const opponent = player === 1 ? 2 : 1;
  const directions = [
    [-1,-1], [0,-1], [1,-1],
    [-1,0],          [1,0],
    [-1,1],  [0,1],  [1,1]
  ];

  let totalFlips = 0;
  for(let [dx, dy] of directions) {
    let nx = x + dx, ny = y + dy;
    let flips = 0;
    while(isOnBoard(nx, ny)) {
      if(board[ny][nx] === opponent) {
        flips++;
      } else if(board[ny][nx] === player) {
        totalFlips += flips;
        break;
      } else {
        break;
      }
      nx += dx;
      ny += dy;
    }
  }
  return totalFlips;
}

function playerClick(e) {
  if(currentPlayer !== 1) return;

  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / cellSize);
  const y = Math.floor((e.clientY - rect.top) / cellSize);

  if(!isOnBoard(x, y)) return;

  if(putStone(x, y, 1)) {
    drawBoard();

    if(hasAnyValidMove(2)) {
      currentPlayer = 2;
      updateStatus('Botの番（白）');
      setTimeout(botMove, 500);
    } else if(hasAnyValidMove(1)) {
      updateStatus('あなたの番（黒） - Botはパスしました');
    } else {
      gameOver();
    }
  }
}

resetBtn.addEventListener('click', () => {
  initBoard();
  drawBoard();
});

canvas.addEventListener('click', playerClick);

initBoard();
drawBoard();