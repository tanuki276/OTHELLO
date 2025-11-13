const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

canvas.width = canvas.getBoundingClientRect().width;
canvas.height = canvas.getBoundingClientRect().height;

const BOARD_SIZE = 8;
const CELL_SIZE = canvas.width / BOARD_SIZE;

const EMPTY = 0;
const BLACK = 1; 
const WHITE = 2; 

let board = [];
let currentPlayer = BLACK; 
let passCount = 0; 

const botStrengthSelect = document.getElementById('botStrength');
const statusDiv = document.getElementById('status');
const scoreDiv = document.getElementById('score');

function initBoard() {
    board = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
        board[y] = [];
        for (let x = 0; x < BOARD_SIZE; x++) {
            board[y][x] = EMPTY;
        }
    }
    board[3][3] = WHITE;
    board[3][4] = BLACK;
    board[4][3] = BLACK;
    board[4][4] = WHITE;
    passCount = 0; 
}

const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, -1], [1, 0], [1, 1]
];

function inBoard(x, y) {
    return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

function canPlace(x, y, player, boardState) {
    if (boardState[y][x] !== EMPTY) return false;

    const opponent = (player === BLACK) ? WHITE : BLACK;

    for (let [dx, dy] of directions) {
        let nx = x + dx;
        let ny = y + dy;
        let hasOpponentBetween = false;

        while (inBoard(nx, ny) && boardState[ny][nx] === opponent) {
            nx += dx;
            ny += dy;
            hasOpponentBetween = true;
        }

        if (hasOpponentBetween && inBoard(nx, ny) && boardState[ny][nx] === player) {
            return true;
        }
    }
    return false;
}

function getValidMoves(player, boardState) {
    let moves = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if (canPlace(x, y, player, boardState)) {
                moves.push({ x, y });
            }
        }
    }
    return moves;
}

function placeStone(x, y, player, boardState) {
    boardState[y][x] = player;
    const opponent = (player === BLACK) ? WHITE : BLACK;

    for (let [dx, dy] of directions) {
        let nx = x + dx;
        let ny = y + dy;
        let stonesToFlip = [];

        while (inBoard(nx, ny) && boardState[ny][nx] === opponent) {
            stonesToFlip.push({ x: nx, y: ny });
            nx += dx;
            ny += dy;
        }

        if (stonesToFlip.length > 0 && inBoard(nx, ny) && boardState[ny][nx] === player) {
            for (let pos of stonesToFlip) {
                boardState[pos.y][pos.x] = player;
            }
        }
    }
}

function copyBoard(boardState) {
    return boardState.map(row => row.slice());
}

function evaluateBoard(boardState) {
    let blackScore = 0;
    let whiteScore = 0;
    
    // オセロAIで広く使われるマス目の位置に応じた評価重み（Position-Dependent Weighting）を採用
    // 隅(A1, H1, A8, H8)を最大に、その隣接マス(B1, B2, C1)などをマイナスに設定
    // 信頼性の高いオセロAIのアルゴリズムに基づいています
    const POS_WEIGHTS = [
        [ 100, -20,  10,   5,   5,  10, -20,  100],
        [-20,  -50,  -2,  -2,  -2,  -2, -50,  -20],
        [ 10,  -2,   1,   1,   1,   1,  -2,   10],
        [  5,  -2,   1,   1,   1,   1,  -2,    5],
        [  5,  -2,   1,   1,   1,   1,  -2,    5],
        [ 10,  -2,   1,   1,   1,   1,  -2,   10],
        [-20,  -50,  -2,  -2,  -2,  -2, -50,  -20],
        [ 100, -20,  10,   5,   5,  10, -20,  100]
    ];

    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            const weight = POS_WEIGHTS[y][x];
            
            if (boardState[y][x] === BLACK) blackScore += weight;
            else if (boardState[y][x] === WHITE) whiteScore += weight;
        }
    }
    
    // **終盤では石の数（着手可能数）が重要となるため、序盤・中盤のみ位置重みを適用するのが理想ですが、今回はシンプル化を優先**
    // **序盤〜中盤では着手可能数の多さも重要ですが、シンプル評価のためここでは省略**
    // return whiteScore - blackScore; 

    // ゲーム終盤では石の数が直接スコアになるため、簡易的に石の数を加味
    const counts = countStones(boardState);
    const stoneDiffWeight = 1; // 石差の重み（終盤で重要）
    const stoneDiff = counts.white - counts.black;

    return (whiteScore - blackScore) + (stoneDiff * stoneDiffWeight); 
}

function minimax(boardState, depth, maxDepth, player, alpha, beta) {
    const opponent = (player === BLACK) ? WHITE : BLACK;
    const validMoves = getValidMoves(player, boardState);
    const opponentMoves = getValidMoves(opponent, boardState);

    // 終了条件: 指定深度に到達
    if (depth === maxDepth) {
        return { score: evaluateBoard(boardState) };
    }

    // 両者有効な手がない（ゲーム終了） - これは`updateGameStatus`で先にチェックされるべきだが、AI内でも確認
    if (validMoves.length === 0 && opponentMoves.length === 0) {
        return { score: evaluateBoard(boardState) };
    }

    // 現在のプレイヤーがパスする場合
    if (validMoves.length === 0) {
        // パスは「着手」ではないため、**探索深度を増やさずに**相手のターンに切り替えるのが正しい
        // 深度を増やすと、探索が浅くなる
        return minimax(boardState, depth, maxDepth, opponent, alpha, beta);
    }

    if (player === WHITE) { // Bot (maximizer)
        let maxEval = -Infinity;
        let bestMove = null;
        for (let move of validMoves) {
            let newBoard = copyBoard(boardState);
            placeStone(move.x, move.y, player, newBoard);
            // **手を打った後は深度を増やす**
            let evalRes = minimax(newBoard, depth + 1, maxDepth, opponent, alpha, beta);
            if (evalRes.score > maxEval) {
                maxEval = evalRes.score;
                bestMove = move; 
            }
            alpha = Math.max(alpha, evalRes.score);
            if (beta <= alpha) break; 
        }
        return { score: maxEval, move: bestMove };
    } else { // プレイヤー（minimizer）
        let minEval = Infinity;
        for (let move of validMoves) {
            let newBoard = copyBoard(boardState);
            placeStone(move.x, move.y, player, newBoard);
            // **手を打った後は深度を増やす**
            let evalRes = minimax(newBoard, depth + 1, maxDepth, opponent, alpha, beta);
            minEval = Math.min(minEval, evalRes.score);
            beta = Math.min(beta, evalRes.score);
            if (beta <= alpha) break; 
        }
        return { score: minEval }; 
    }
}

function drawBoard() {
    ctx.fillStyle = '#006400'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    for (let i = 0; i <= BOARD_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(canvas.width, i * CELL_SIZE);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, canvas.height);
        ctx.stroke();
    }

    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if (board[y][x] === EMPTY) continue;

            ctx.beginPath();
            const cx = x * CELL_SIZE + CELL_SIZE / 2; 
            const cy = y * CELL_SIZE + CELL_SIZE / 2; 
            const radius = CELL_SIZE / 2 - 5; 

            ctx.arc(cx, cy, radius, 0, 2 * Math.PI);

            if (board[y][x] === BLACK) {
                ctx.fillStyle = '#000'; 
            } else {
                ctx.fillStyle = '#fff'; 
            }
            ctx.fill();
            ctx.strokeStyle = '#000'; 
            ctx.stroke();
        }
    }
    updateScore(); 
}

function countStones(boardCount = board) {
    let black = 0, white = 0;
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if (boardCount[y][x] === BLACK) black++;
            else if (boardCount[y][x] === WHITE) white++;
        }
    }
    return { black, white };
}

function updateScore() {
    const counts = countStones();
    scoreDiv.textContent = `黒: ${counts.black} - 白: ${counts.white}`;
}

function updateGameStatus() {
    const playerMoves = getValidMoves(BLACK, board); 
    const botMoves = getValidMoves(WHITE, board);   

    // ゲーム終了条件
    // 1. 両者ともに合法手がない
    // 2. 盤面が全て埋まっている
    // 3. どちらかの石が全てなくなった (オセロのルールではあり得ないが、念のため)
    if (
        (playerMoves.length === 0 && botMoves.length === 0) || // 1.
        (countStones().black + countStones().white === BOARD_SIZE * BOARD_SIZE) // 2.
    ) {
        gameOver();
        return;
    }

    if (currentPlayer === BLACK) { 
        if (playerMoves.length === 0) {
            statusDiv.textContent = '黒（あなた）はパス！白（Bot）の番です。';
            currentPlayer = WHITE; 
            passCount++;
            setTimeout(botTurn, 800); 
        } else {
            statusDiv.textContent = 'あなたの番（黒）';
            passCount = 0; 
        }
    } else { 
        if (botMoves.length === 0) {
            statusDiv.textContent = '白（Bot）はパス！あなたの番（黒）です。';
            currentPlayer = BLACK; 
            passCount++;
        } else {
            statusDiv.textContent = 'Botの番（白）';
            passCount = 0; 
        }
    }
    drawBoard(); 
}

function gameOver() {
    const counts = countStones();
    let resultText = 'ゲーム終了！ ';
    if (counts.black > counts.white) resultText += 'あなたの勝ち！';
    else if (counts.black < counts.white) resultText += 'Botの勝ち！';
    else resultText += '引き分けです。';
    statusDiv.textContent = resultText;
    canvas.removeEventListener('click', handleCanvasClick); 
}

function handleCanvasClick(e) {
    if (currentPlayer !== BLACK) return; 

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left; 
    const my = e.clientY - rect.top;  
    const x = Math.floor(mx / CELL_SIZE); 
    const y = Math.floor(my / CELL_SIZE); 

    if (canPlace(x, y, BLACK, board)) {
        placeStone(x, y, BLACK, board);
        currentPlayer = WHITE; 
        updateGameStatus(); 
        setTimeout(botTurn, 300); 
    } else {
        statusDiv.textContent = 'そこには置けません！あなたの番（黒）';
    }
}
canvas.addEventListener('click', handleCanvasClick);

function botTurn() {
    if (currentPlayer !== WHITE) return; 

    const depth = parseInt(botStrengthSelect.value, 10); 

    const result = minimax(board, 0, depth, WHITE, -Infinity, Infinity);

    if (result.move) {
        placeStone(result.move.x, result.move.y, WHITE, board); 
        currentPlayer = BLACK; 
        updateGameStatus(); 
    } else {
        updateGameStatus(); 
    }
}

function resetGame() {
    initBoard(); 
    currentPlayer = BLACK; 
    canvas.addEventListener('click', handleCanvasClick); 
    updateGameStatus(); 
    drawBoard(); 
}

resetGame();
