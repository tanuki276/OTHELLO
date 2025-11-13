Const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

// Apply the display size set in CSS to the drawing resolution.
const BOARD_SIZE = 8;
const CELL_SIZE = canvas.width / BOARD_SIZE; // 810 / 8 = 101.25

const EMPTY = 0;
const BLACK = 1; // Player (Black)
const WHITE = 2; // Bot (White)

let board = [];
let currentPlayer = BLACK; // Game starts with Black
let passCount = 0; 
let isAnimating = false; // アニメーション中は操作をロック
let turnCount = 1; // ターン数の追加

const botStrengthSelect = document.getElementById('botStrength');
const statusDiv = document.getElementById('status');
const scoreDiv = document.getElementById('score');

// 永続化用の変数
let gameStats = {
    wins: 0,
    losses: 0,
    draws: 0
};

/**
 * Initializes the game board to the starting state.
 */
function initBoard() {
    board = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
        board[y] = [];
        for (let x = 0; x < BOARD_SIZE; x++) {
            board[y][x] = EMPTY;
        }
    }
    // Set up the initial four stones
    board[3][3] = WHITE;
    board[3][4] = BLACK;
    board[4][3] = BLACK;
    board[4][4] = WHITE;
    passCount = 0;
    turnCount = 1; // ターン数をリセット
}

// Direction vectors (8 directions)
const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, -1], [1, 0], [1, 1]
];

/**
 * Checks if the given coordinates are within the board boundaries.
 */
function inBoard(x, y) {
    return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

/**
 * Checks if a stone can be legally placed at (x, y).
 */
function canPlace(x, y, player, boardState) {
    if (boardState[y][x] !== EMPTY) return false;

    const opponent = (player === BLACK) ? WHITE : BLACK;

    for (let [dx, dy] of directions) {
        let nx = x + dx;
        let ny = y + dy;
        let hasOpponentBetween = false;

        // Check for opponent stones in between
        while (inBoard(nx, ny) && boardState[ny][nx] === opponent) {
            nx += dx;
            ny += dy;
            hasOpponentBetween = true;
        }

        // Check if sandwiched by the current player's stone
        if (hasOpponentBetween && inBoard(nx, ny) && boardState[ny][nx] === player) {
            return true;
        }
    }
    return false;
}

/**
 * Gets all valid moves for the given player on the current board state.
 */
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

/**
 * Places a stone at (x, y) and finds stones to flip (DOES NOT FLIP YET).
 * Returns the list of stones to be flipped.
 */
function getStonesToFlip(x, y, player, boardState) {
    const opponent = (player === BLACK) ? WHITE : BLACK;
    let totalStonesToFlip = [];

    for (let [dx, dy] of directions) {
        let nx = x + dx;
        let ny = y + dy;
        let stonesInDirection = [];

        // Search for opponent stones
        while (inBoard(nx, ny) && boardState[ny][nx] === opponent) {
            stonesInDirection.push({ x: nx, y: ny });
            nx += dx;
            ny += dy;
        }

        // Check if sandwiched by the current player's stone
        if (stonesInDirection.length > 0 && inBoard(nx, ny) && boardState[ny][nx] === player) {
            totalStonesToFlip.push(...stonesInDirection);
        }
    }
    return totalStonesToFlip;
}

/**
 * Places a stone at (x, y) and flips the opponent's stones with animation.
 * Returns a Promise that resolves when the animation is complete.
 */
function placeStone(x, y, player, boardState) {
    return new Promise(resolve => {
        const stonesToFlip = getStonesToFlip(x, y, player, boardState);
        
        // 1. まず石を置く
        boardState[y][x] = player;
        drawBoard(); // 置いた石を描画

        if (stonesToFlip.length === 0) {
            resolve();
            return;
        }
        
        isAnimating = true;
        const duration = 200; // アニメーション時間 (ms)
        const startTime = Date.now();

        function animateFlip() {
            const elapsedTime = Date.now() - startTime;
            const progress = Math.min(1, elapsedTime / duration); // 0から1

            // 描画をクリアして再描画
            drawBoard(); 
            
            // アニメーション中の石を描画
            for (let pos of stonesToFlip) {
                const cx = pos.x * CELL_SIZE + CELL_SIZE / 2;
                const cy = pos.y * CELL_SIZE + CELL_SIZE / 2;
                const radius = CELL_SIZE / 2 - 5;
                
                // 回転を模倣（0.5で色を完全に切り替える）
                let currentColor = (progress < 0.5) ? WHITE : BLACK;
                if (player === WHITE) currentColor = (progress < 0.5) ? BLACK : WHITE;

                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
                
                // 反転後の色を使用
                ctx.fillStyle = (currentColor === BLACK) ? '#000' : '#fff';
                ctx.fill();
                ctx.strokeStyle = '#000';
                ctx.stroke();
            }

            if (progress < 1) {
                requestAnimationFrame(animateFlip);
            } else {
                // アニメーション終了後、ボードの状態を最終的な色で確定させる
                for (let pos of stonesToFlip) {
                    boardState[pos.y][pos.x] = player;
                }
                isAnimating = false;
                drawBoard(); // 最終状態の描画
                resolve();
            }
        }
        requestAnimationFrame(animateFlip);
    });
}

/**
 * Creates a deep copy of the board state.
 */
function copyBoard(boardState) {
    return boardState.map(row => row.slice());
}

// ... (evaluateBoard, minimax関数は前回の改善版をそのまま使用) ...

/**
 * Evaluates the board state using positional weights and stone count.
 * Returns score from Bot's (White) perspective (higher is better for White).
 */
function evaluateBoard(boardState) {
    let blackScore = 0;
    let whiteScore = 0;
    
    // Position-Dependent Weights commonly used in Othello AI
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
    
    const counts = countStones(boardState);
    const stoneDiffWeight = 5; 
    const stoneDiff = counts.white - counts.black;

    return (whiteScore - blackScore) + (stoneDiff * stoneDiffWeight); 
}

/**
 * Searches for the best move using the Minimax algorithm with Alpha-Beta Pruning.
 * Note: When a player passes, the depth does not increase.
 */
function minimax(boardState, depth, maxDepth, player, alpha, beta) {
    const opponent = (player === BLACK) ? WHITE : BLACK;
    const validMoves = getValidMoves(player, boardState);
    const opponentMoves = getValidMoves(opponent, boardState);

    const currentStones = countStones(boardState).black + countStones(boardState).white;
    const END_GAME_THRESHOLD = 50; 

    // Terminal condition: Max depth reached or game over
    if (depth === maxDepth || (validMoves.length === 0 && opponentMoves.length === 0)) {
        let finalScore;
        
        if (currentStones >= END_GAME_THRESHOLD) {
            const counts = countStones(boardState);
            finalScore = (counts.white - counts.black) * 100000; 
        } else {
            finalScore = evaluateBoard(boardState);
        }
        
        return { score: finalScore };
    }

    // Current player must pass
    if (validMoves.length === 0) {
        return minimax(boardState, depth, maxDepth, opponent, alpha, beta);
    }

    if (player === WHITE) { // Bot (maximizer)
        let maxEval = -Infinity;
        let bestMove = null;
        for (let move of validMoves) {
            let newBoard = copyBoard(boardState);
            
            // 盤面を直接操作する代わりに、placeStoneのロジックを使って新しい盤面を作成
            newBoard[move.y][move.x] = player;
            const stonesToFlip = getStonesToFlip(move.x, move.y, player, newBoard);
            for (let pos of stonesToFlip) {
                newBoard[pos.y][pos.x] = player;
            }
            
            let evalRes = minimax(newBoard, depth + 1, maxDepth, opponent, alpha, beta);
            if (evalRes.score > maxEval) {
                maxEval = evalRes.score;
                bestMove = move; 
            }
            alpha = Math.max(alpha, evalRes.score);
            if (beta <= alpha) break; 
        }
        return { score: maxEval, move: bestMove };
    } else { // Player (minimizer)
        let minEval = Infinity;
        for (let move of validMoves) {
            let newBoard = copyBoard(boardState);
            
            // 盤面を直接操作する代わりに、placeStoneのロジックを使って新しい盤面を作成
            newBoard[move.y][move.x] = player;
            const stonesToFlip = getStonesToFlip(move.x, move.y, player, newBoard);
            for (let pos of stonesToFlip) {
                newBoard[pos.y][pos.x] = player;
            }

            let evalRes = minimax(newBoard, depth + 1, maxDepth, opponent, alpha, beta);
            minEval = Math.min(minEval, evalRes.score);
            beta = Math.min(beta, evalRes.score);
            if (beta <= alpha) break; 
        }
        return { score: minEval }; 
    }
}


/**
 * Draws the board and stones.
 */
function drawBoard() {
    // Draw background
    ctx.fillStyle = '#006400'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    for (let i = 0; i <= BOARD_SIZE; i++) {
        // 縦線
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, canvas.height);
        ctx.stroke();
        
        // 横線
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(canvas.width, i * CELL_SIZE);
        ctx.stroke();
    }
    
    // 目印の星 (4箇所)
    const starCenters = [
        [2, 2], [5, 2], [2, 5], [5, 5]
    ];
    ctx.fillStyle = '#000';
    for(let [sx, sy] of starCenters) {
        ctx.beginPath();
        const cx = sx * CELL_SIZE + CELL_SIZE / 2;
        const cy = sy * CELL_SIZE + CELL_SIZE / 2;
        ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
        ctx.fill();
    }


    // Draw stones
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if (board[y][x] === EMPTY) continue;

            ctx.beginPath();
            const cx = x * CELL_SIZE + CELL_SIZE / 2; 
            const cy = y * CELL_SIZE + CELL_SIZE / 2; 
            const radius = CELL_SIZE / 2 - 5; 

            ctx.arc(cx, cy, radius, 0, 2 * Math.PI);

            if (board[y][x] === BLACK) {
                ctx.fillStyle = '#000'; // Black stone
            } else {
                ctx.fillStyle = '#fff'; // White stone
            }
            ctx.fill();
            ctx.strokeStyle = '#000'; 
            ctx.stroke();
        }
    }
    
    // 🎨 装飾: 有効手のハイライト (アニメーション中でなければ表示)
    if (currentPlayer === BLACK && !isAnimating) {
        const validMoves = getValidMoves(BLACK, board);
        ctx.fillStyle = 'rgba(0, 255, 0, 0.4)'; // 半透明の緑
        for (let move of validMoves) {
            ctx.beginPath();
            const cx = move.x * CELL_SIZE + CELL_SIZE / 2;
            const cy = move.y * CELL_SIZE + CELL_SIZE / 2;
            const radius = CELL_SIZE / 2 - 15; 
            ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
    
    updateScore(); 
}

/**
 * Counts the number of black and white stones on the board.
 */
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

/**
 * Updates the score display.
 */
function updateScore() {
    const counts = countStones();
    scoreDiv.innerHTML = `
        <p>石数：黒: ${counts.black} - 白: ${counts.white}</p>
        <p>通算成績：${gameStats.wins}勝 - ${gameStats.losses}敗 - ${gameStats.draws}分</p>
    `;
}

/**
 * Updates the game status, handles turn switching, passing, and game over checks.
 */
async function updateGameStatus() {
    const playerMoves = getValidMoves(BLACK, board); 
    const botMoves = getValidMoves(WHITE, board);   
    
    const gameCanContinue = playerMoves.length > 0 || botMoves.length > 0;
    const isBoardFull = (countStones().black + countStones().white === BOARD_SIZE * BOARD_SIZE);

    if (!gameCanContinue || isBoardFull) {
        gameOver();
        return;
    }

    if (currentPlayer === BLACK) { 
        if (playerMoves.length === 0) {
            statusDiv.textContent = `[${turnCount}ターン目] 黒(あなた)はパスです。白(Bot)の番です。`;
            currentPlayer = WHITE; 
            passCount++;
            setTimeout(botTurn, 800); 
        } else {
            statusDiv.textContent = `[${turnCount}ターン目] あなたの番 (黒)`;
            passCount = 0; 
        }
    } else { // Bot's Turn (currentPlayer === WHITE)
        if (botMoves.length === 0) {
            statusDiv.textContent = `[${turnCount}ターン目] 白(Bot)はパスです。あなたの番 (黒)です。`;
            currentPlayer = BLACK; 
            passCount++;
            turnCount++; // ターンを進める
        } else {
            statusDiv.textContent = `[${turnCount}ターン目] Botの番 (白)`;
            passCount = 0; 
        }
    }
    drawBoard(); 
}

/**
 * Executes actions when the game ends.
 */
function gameOver() {
    const counts = countStones();
    let resultText = 'ゲーム終了！ ';
    
    if (counts.black > counts.white) {
        resultText += `あなたの**勝ち** (${counts.black} 対 ${counts.white})！`;
        gameStats.wins++;
    } else if (counts.black < counts.white) {
        resultText += `Botの**勝ち** (${counts.white} 対 ${counts.black})！`;
        gameStats.losses++;
    } else {
        resultText += `**引き分け**です (${counts.black} 対 ${counts.white})。`;
        gameStats.draws++;
    }
    
    // スコアの保存と表示更新
    saveStats();
    statusDiv.innerHTML = resultText;
    
    // Disable click events after game over
    canvas.removeEventListener('click', handleCanvasClick); 
}

/**
 * Handles the player's click event.
 */
async function handleCanvasClick(e) {
    if (currentPlayer !== BLACK || isAnimating) return; // アニメーション中は操作を無視

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const mx = (e.clientX - rect.left) * scaleX; 
    const my = (e.clientY - rect.top) * scaleY;  
    
    const x = Math.floor(mx / CELL_SIZE); 
    const y = Math.floor(my / CELL_SIZE); 

    if (canPlace(x, y, BLACK, board)) {
        await placeStone(x, y, BLACK, board); // アニメーション完了を待つ
        currentPlayer = WHITE; 
        turnCount++;
        
        updateGameStatus(); 
        
        // Botのターンへ
        if (getValidMoves(WHITE, board).length > 0) {
            setTimeout(botTurn, 300); 
        } else {
            // Botがパスの場合も即座にステータス更新
            updateGameStatus();
        }
    } else {
        statusDiv.textContent = `[${turnCount}ターン目] そこには置けません！あなたの番 (黒)`;
    }
}
canvas.addEventListener('click', handleCanvasClick);

/**
 * Handles the Bot's turn logic (AI).
 */
async function botTurn() {
    if (currentPlayer !== WHITE || isAnimating) return; 

    const validMoves = getValidMoves(WHITE, board);
    if (validMoves.length === 0) {
        updateGameStatus(); 
        return;
    }

    const depth = parseInt(botStrengthSelect.value, 10); 

    // Search for the best move using Minimax
    const result = minimax(board, 0, depth, WHITE, -Infinity, Infinity);

    if (result.move) {
        await placeStone(result.move.x, result.move.y, WHITE, board); // アニメーション完了を待つ
        currentPlayer = BLACK; 
        turnCount++;
        updateGameStatus(); 
    } else {
        updateGameStatus(); 
    }
}

/**
 * 💾 スコア統計をlocalStorageに保存する。
 */
function saveStats() {
    try {
        localStorage.setItem('othelloStats', JSON.stringify(gameStats));
    } catch (e) {
        console.error("Failed to save stats to localStorage", e);
    }
}

/**
 * 💾 スコア統計をlocalStorageから読み込む。
 */
function loadStats() {
    try {
        const stats = localStorage.getItem('othelloStats');
        if (stats) {
            gameStats = JSON.parse(stats);
        }
    } catch (e) {
        console.error("Failed to load stats from localStorage", e);
    }
}

/**
 * Fully resets the game.
 */
function resetGame() {
    initBoard(); 
    currentPlayer = BLACK; 
    
    // リセット時にイベントリスナーが外れている可能性があるので再登録
    canvas.removeEventListener('click', handleCanvasClick);
    canvas.addEventListener('click', handleCanvasClick); 
    
    updateGameStatus(); 
    drawBoard(); 
}

// Initialize the game on load
loadStats(); // 起動時に成績を読み込む
resetGame();
