const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

// Apply the display size set in CSS to the drawing resolution.
canvas.width = canvas.getBoundingClientRect().width;
canvas.height = canvas.getBoundingClientRect().height;

const BOARD_SIZE = 8;
const CELL_SIZE = canvas.width / BOARD_SIZE;

const EMPTY = 0;
const BLACK = 1; // Player (Black)
const WHITE = 2; // Bot (White)

let board = [];
let currentPlayer = BLACK; // Game starts with Black
let passCount = 0; 

const botStrengthSelect = document.getElementById('botStrength');
const statusDiv = document.getElementById('status');
const scoreDiv = document.getElementById('score');

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
 * Places a stone at (x, y) and flips the opponent's stones.
 */
function placeStone(x, y, player, boardState) {
    boardState[y][x] = player;
    const opponent = (player === BLACK) ? WHITE : BLACK;

    for (let [dx, dy] of directions) {
        let nx = x + dx;
        let ny = y + dy;
        let stonesToFlip = [];

        // Search for stones to flip
        while (inBoard(nx, ny) && boardState[ny][nx] === opponent) {
            stonesToFlip.push({ x: nx, y: ny });
            nx += dx;
            ny += dy;
        }

        // Flip stones if sandwiched by the current player's stone
        if (stonesToFlip.length > 0 && inBoard(nx, ny) && boardState[ny][nx] === player) {
            for (let pos of stonesToFlip) {
                boardState[pos.y][pos.x] = player;
            }
        }
    }
}

/**
 * Creates a deep copy of the board state.
 */
function copyBoard(boardState) {
    return boardState.map(row => row.slice());
}

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
    const stoneDiffWeight = 1; 
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

    // Terminal condition: Max depth reached or game over
    if (depth === maxDepth || (validMoves.length === 0 && opponentMoves.length === 0)) {
        return { score: evaluateBoard(boardState) };
    }

    // Current player must pass
    if (validMoves.length === 0) {
        // Switch player without increasing depth (pass turn)
        return minimax(boardState, depth, maxDepth, opponent, alpha, beta);
    }

    if (player === WHITE) { // Bot (maximizer)
        let maxEval = -Infinity;
        let bestMove = null;
        for (let move of validMoves) {
            let newBoard = copyBoard(boardState);
            placeStone(move.x, move.y, player, newBoard);
            // Increase depth after a move is made
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
            placeStone(move.x, move.y, player, newBoard);
            // Increase depth after a move is made
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
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(canvas.width, i * CELL_SIZE);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, canvas.height);
        ctx.stroke();
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
    scoreDiv.textContent = `Black: ${counts.black} - White: ${counts.white}`;
}

/**
 * Updates the game status, handles turn switching, passing, and game over checks.
 */
function updateGameStatus() {
    const playerMoves = getValidMoves(BLACK, board); 
    const botMoves = getValidMoves(WHITE, board);   

    // Game Over Conditions: 1. No valid moves for both players OR 2. Board is full
    if (
        (playerMoves.length === 0 && botMoves.length === 0) || 
        (countStones().black + countStones().white === BOARD_SIZE * BOARD_SIZE)
    ) {
        gameOver();
        return;
    }

    if (currentPlayer === BLACK) { 
        if (playerMoves.length === 0) {
            statusDiv.textContent = 'Black (You) Pass! White (Bot) Turn.';
            currentPlayer = WHITE; 
            passCount++;
            setTimeout(botTurn, 800); 
        } else {
            statusDiv.textContent = 'Your Turn (Black)';
            passCount = 0; 
        }
    } else { // Bot's Turn (currentPlayer === WHITE)
        if (botMoves.length === 0) {
            statusDiv.textContent = 'White (Bot) Pass! Your Turn (Black).';
            currentPlayer = BLACK; 
            passCount++;
        } else {
            statusDiv.textContent = 'Bot\'s Turn (White)';
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
    let resultText = 'Game Over! ';
    if (counts.black > counts.white) resultText += 'You Win!';
    else if (counts.black < counts.white) resultText += 'Bot Wins!';
    else resultText += 'It\'s a Draw.';
    statusDiv.textContent = resultText;
    // Disable click events after game over
    canvas.removeEventListener('click', handleCanvasClick); 
}

/**
 * Handles the player's click event.
 */
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
        statusDiv.textContent = 'Invalid move! Your Turn (Black)';
    }
}
canvas.addEventListener('click', handleCanvasClick);

/**
 * Handles the Bot's turn logic (AI).
 */
function botTurn() {
    if (currentPlayer !== WHITE) return; 

    const depth = parseInt(botStrengthSelect.value, 10); 

    // Search for the best move using Minimax
    const result = minimax(board, 0, depth, WHITE, -Infinity, Infinity);

    if (result.move) {
        placeStone(result.move.x, result.move.y, WHITE, board); 
        currentPlayer = BLACK; 
        updateGameStatus(); 
    } else {
        // If no valid move, updateGameStatus handles the pass
        updateGameStatus(); 
    }
}

/**
 * Fully resets the game.
 */
function resetGame() {
    initBoard(); 
    currentPlayer = BLACK; 
    canvas.addEventListener('click', handleCanvasClick); 
    updateGameStatus(); 
    drawBoard(); 
}

// Initialize the game on load
resetGame();