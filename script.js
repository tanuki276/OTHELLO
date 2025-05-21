// script.js

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const BOARD_SIZE = 8;

canvas.width = 810;
canvas.height = 810;

const CELL_SIZE = canvas.width / BOARD_SIZE;

const botStrengthSelect = document.getElementById('botStrength');
const statusDiv = document.getElementById('status');
const scoreDiv = document.getElementById('score');

let board = [];
let currentPlayer = 1; // 1=黒(人間), 2=白(Bot)

function initBoard() {
  board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
  // 初期4石配置
  board[3][3] = 2;
  board[3][4] = 1;
  board[4][3] = 1;
  board[4][4] = 2;
}

function drawBoard() {
  ctx.fillStyle = '#006400';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#003000';
  for(let i=0; i<=BOARD_SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(i*CELL_SIZE, 0);
    ctx.lineTo(i*CELL_SIZE, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i*CELL_SIZE);
    ctx.lineTo(canvas.width, i*CELL_SIZE);
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
  ctx.beginPath();
  ctx.arc(x*CELL_SIZE + CELL_SIZE/2, y*CELL_SIZE + CELL_SIZE/2, CELL_SIZE/2 - 5, 0, Math.PI*2);
  if(player === 1) {
    ctx.fillStyle = 'black';
  } else {
    ctx.fillStyle = 'white';
  }
  ctx.fill();
  ctx.strokeStyle = 'black';
  ctx.stroke();
}

function isOnBoard(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

const directions = [
  [-1,-1], [0,-1], [1,-1],
  [-1,0],          [1,0],
  [-1,1],  [0,1],  [1,1]
];

// 指定マスに置けるか判定
function canPutStone(x, y, player, boardCheck = board) {
  if(boardCheck[y][x] !== 0) return false;
  const opponent = player === 1 ? 2 : 1;
  for(const [dx, dy] of directions) {
    let nx = x + dx;
    let ny = y + dy;
    let foundOpponent = false;
    while(isOnBoard(nx, ny) && boardCheck[ny][nx] === opponent) {
      nx += dx;
      ny += dy;
      foundOpponent = true;
    }
    if(foundOpponent && isOnBoard(nx, ny) && boardCheck[ny][nx] === player) {
      return true;
    }
  }
  return false;
}

// 指定プレイヤーの合法手があるか
function hasAnyValidMove(player, boardCheck = board) {
  for(let y=0; y<BOARD_SIZE; y++) {
    for(let x=0; x<BOARD_SIZE; x++) {
      if(canPutStone(x, y, player, boardCheck)) return true;
    }
  }
  return false;
}

// 石を置き、裏返す
function putStone(x, y, player, boardPut = board) {
  boardPut[y][x] = player;
  const opponent = player === 1 ? 2 : 1;
  for(const [dx, dy] of directions) {
    let nx = x + dx;
    let ny = y + dy;
    const stonesToFlip = [];
    while(isOnBoard(nx, ny) && boardPut[ny][nx] === opponent) {
      stonesToFlip.push([nx, ny]);
      nx += dx;
      ny += dy;
    }
    if(isOnBoard(nx, ny) && boardPut[ny][nx] === player) {
      for(const [fx, fy] of stonesToFlip) {
        boardPut[fy][fx] = player;
      }
    }
  }
}

// スコアカウント
function countStones(boardCount = board) {
  let black = 0, white = 0;
  for(let y=0; y<BOARD_SIZE; y++) {
    for(let x=0; x<BOARD_SIZE; x++) {
      if(boardCount[y][x] === 1) black++;
      else if(boardCount[y][x] === 2) white++;
    }
  }
  return { black, white };
}

// 評価関数（bot=白=2の視点）
function evaluateBoard(boardEval) {
  const counts = countStones(boardEval);
  return counts.white - counts.black;
}

// ミニマックス＋αβカット
function minimax(boardMinimax, player, depth, maxDepth, alpha, beta) {
  if(depth === maxDepth || (!hasAnyValidMove(1, boardMinimax) && !hasAnyValidMove(2, boardMinimax))) {
    return evaluateBoard(boardMinimax);
  }

  const opponent = player === 1 ? 2 : 1;

  const moves = [];
  for(let y=0; y<BOARD_SIZE; y++) {
    for(let x=0; x<BOARD_SIZE; x++) {
      if(canPutStone(x, y, player, boardMinimax)) {
        moves.push([x,y]);
      }
    }
  }

  if(moves.length === 0) {
    // パス
    return minimax(boardMinimax, opponent, depth + 1, maxDepth, alpha, beta);
  }

  if(player === 2) { // Botはmaxプレイヤー
    let maxEval = -Infinity;
    for(const [x,y] of moves) {
      const newBoard = boardMinimax.map(row => row.slice());
      putStone(x, y, player, newBoard);
      const evalScore = minimax(newBoard, opponent, depth + 1, maxDepth, alpha, beta);
      if(evalScore > maxEval) maxEval = evalScore;
      if(evalScore > alpha) alpha = evalScore;
      if(beta <= alpha) break; // αβカット
    }
    return maxEval;
  } else { // 人間はminプレイヤー
    let minEval = Infinity;
    for(const [x,y] of moves) {
      const newBoard = boardMinimax.map(row => row.slice());
      putStone(x, y, player, newBoard);
      const evalScore = minimax(newBoard, opponent, depth + 1, maxDepth, alpha, beta);
      if(evalScore < minEval) minEval = evalScore;
      if(evalScore < beta) beta = evalScore;
      if(beta <= alpha) break;
    }
    return minEval;
  }
}

// Botの手を決めて実行
function botMove() {
  if(!hasAnyValidMove(2)) {
    if(!hasAnyValidMove(1)) {
      gameOver();
      return;
    }
    currentPlayer = 1;
    updateStatus('あなたの番（黒） - Botはパスしました');
    return;
  }

  const difficulty = botStrengthSelect.value;
  let maxDepth;
  switch(difficulty) {
    case 'weak': maxDepth = 2; break;
    case 'normal': maxDepth = 4; break;
    case 'strong': maxDepth = 6; break;
    default: maxDepth = 4;
  }

  let bestMove = null;
  let bestScore = -Infinity;

  for(let y=0; y<BOARD_SIZE; y++) {
    for(let x=0; x<BOARD_SIZE; x++) {
      if(canPutStone(x, y, 2)) {
        const testBoard = board.map(row => row.slice());
        putStone(x, y, 2, testBoard);
        const score = minimax(testBoard, 1, 1, maxDepth, -Infinity, Infinity);
        if(score > bestScore) {
          bestScore = score;
          bestMove = [x, y];
        }
      }
    }
  }

  if(bestMove) {
    putStone(bestMove[0], bestMove[1], 2);
    currentPlayer = 1;
    updateStatus('あなたの番（黒）');
  } else {
    // 置ける手がない（パス）
    currentPlayer = 1;
    updateStatus('あなたの番（黒） - Botはパスしました');
  }
  drawBoard();
  updateScore();
}

// ゲーム終了判定
function gameOver() {
  const counts = countStones();
  let resultText = 'ゲーム終了！ ';
  if(counts.black > counts.white) resultText += 'あなたの勝ち！';
  else if(counts.black < counts.white) resultText += 'Botの勝ち！';
  else resultText += '引き分けです。';
  updateStatus(resultText);
}

// スコア表示更新
function updateScore() {
  const counts = countStones();
  scoreDiv.textContent = `黒: ${counts.black} - 白: ${counts.white}`;
}

// 状態表示更新
function updateStatus(text) {
  statusDiv.textContent = text;
}

// クリック処理
canvas.addEventListener('click', (e) => {
  if(currentPlayer !== 1) return; // 人間のターンのみ受付

canvas.addEventListener("touchstart", function (event) {
  event.preventDefault();

  const rect = 
canvas.addEventListener("touchstart", function (event) {
  event.preventDefault();

  if (currentPlayer !== 1) return; // 人間のターンのみ受付

  const rect = canvas.getBoundingClientRect();
  const touch = event.touches[0];

  const x = Math.floor((touch.clientX - rect.left) / (rect.width / BOARD_SIZE));
  const y = Math.floor((touch.clientY - rect.top) / (rect.height / BOARD_SIZE));

  handleClick(x, y);
});

// ゲームリセット
function resetGame() {
  initBoard();
  currentPlayer = 1;
  updateStatus('あなたの番（黒）');
  updateScore();
  drawBoard();
}

resetGame();

resetGame();