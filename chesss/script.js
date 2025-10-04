$(document).ready(function() {
    const board = $('#chessboard');
    const status = $('#status-text');
    let turn = 'w';
    let selectedSquare = null;
    let isGameOver = false;

    const unicodePieces = {
        'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
        'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
    };
    
    // The main button now controls start and reset
    $('#game-control-button').on('click', initializeBoard);

    function initializeBoard() {
        isGameOver = false;
        
        // --- NEW: Hide the overlay when the game starts ---
        $('#pre-game-overlay').addClass('hidden');
        
        $.ajax({
            url: 'pieces.json',
            dataType: 'json',
            success: function(piecePositions) {
                createBoard();
                placePieces(piecePositions);
                setupBoardEventListeners();
                turn = 'w';
                updateStatus();
                $('#game-control-button').text('Reset Game');
            }
        });
    }

    function createBoard() { /* ... no changes in this function ... */
        board.empty();
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = $('<div></div>').addClass('square').attr('data-row', row).attr('data-col', col);
                if ((row + col) % 2 === 0) { square.addClass('light'); } 
                else { square.addClass('dark'); }
                board.append(square);
            }
        }
    }

    function placePieces(positions) { /* ... no changes in this function ... */
        $('.square').empty().removeAttr('data-piece data-color');
        function getSquareId(row, col) { return String.fromCharCode('a'.charCodeAt(0) + col) + (8 - row); }
        $('.square').each(function() {
            const row = parseInt($(this).attr('data-row'));
            const col = parseInt($(this).attr('data-col'));
            const id = getSquareId(row, col);
            if (positions[id]) {
                const pieceCode = positions[id];
                const pieceColor = pieceCode.charAt(0);
                $(this).html(`<span class="piece">${unicodePieces[pieceCode]}</span>`).attr('data-piece', pieceCode).attr('data-color', pieceColor);
            }
        });
    }

    function setupBoardEventListeners() {
        board.off('click', '.square').on('click', '.square', handleSquareClick);
    }

    function handleSquareClick() {
        if (isGameOver) return;
        const clickedSquare = $(this);
        const pieceColor = clickedSquare.attr('data-color');

        if (selectedSquare) {
            if (clickedSquare.is(selectedSquare)) { deselectPiece(); return; }
            if (isValidMove(selectedSquare, clickedSquare)) {
                if (doesMoveExposeKing(selectedSquare, clickedSquare)) {
                    showInvalidMoveMessage("Illegal: This move exposes your king to check!");
                    deselectPiece();
                } else {
                    movePiece(selectedSquare, clickedSquare);
                }
            } else {
                showInvalidMoveMessage("Invalid Move!");
                deselectPiece();
                if (pieceColor === turn) { selectPiece(clickedSquare); }
            }
        } else if (pieceColor === turn) {
            selectPiece(clickedSquare);
        }
    }

    function selectPiece(square) { /* ... no changes in this function ... */
        selectedSquare = square;
        selectedSquare.addClass('selected');
    }

    function deselectPiece() { /* ... no changes in this function ... */
        if (selectedSquare) {
            selectedSquare.removeClass('selected');
            selectedSquare = null;
        }
    }

    function movePiece(fromSquare, toSquare) {
        const piece = fromSquare.attr('data-piece');
        const color = fromSquare.attr('data-color');
        toSquare.html(fromSquare.html()).attr('data-piece', piece).attr('data-color', color);
        fromSquare.empty().removeAttr('data-piece').removeAttr('data-color');
        deselectPiece();
        switchTurn();
        checkGameEnd();
    }

    function switchTurn() {
        turn = (turn === 'w') ? 'b' : 'w';
        updateStatus();
    }

    function updateStatus() {
        if (isGameOver) return;
        let statusText = (turn === 'w' ? "White's" : "Black's") + " Turn";
        if (isKingInCheck(turn)) { statusText += " - Check!"; }
        status.text(statusText).removeClass('error-text');
    }

    function showInvalidMoveMessage(message) {
        status.text(message).addClass('error-text');
        setTimeout(() => { updateStatus(); }, 2000);
    }
    
    function endGame(winner, reason) {
        isGameOver = true;
        let message = "";
        if (reason === 'checkmate') {
            message = `Checkmate! ${winner === 'w' ? 'White' : 'Black'} Wins!`;
        } else if (reason === 'stalemate') {
            message = "Stalemate! It's a Draw.";
        }
        status.text(message).addClass('error-text');
    }

    function checkGameEnd() {
        if (isGameOver) return;
        if (!hasAnyLegalMoves(turn)) {
            if (isKingInCheck(turn)) {
                endGame(turn === 'w' ? 'b' : 'w', 'checkmate');
            } else {
                endGame(null, 'stalemate');
            }
        }
    }
    
    // All helper and validation functions below have no changes.
    function findKing(color) { return $(`.square[data-piece="${color}K"]`); }
    function isSquareAttacked(square, attackerColor) { const opponentPieces = $(`.square[data-color="${attackerColor}"]`); for (let i = 0; i < opponentPieces.length; i++) { if (isValidMove($(opponentPieces[i]), square, true)) { return true; } } return false; }
    function isKingInCheck(kingColor) { const kingSquare = findKing(kingColor); if (!kingSquare.length) return false; const opponentColor = kingColor === 'w' ? 'b' : 'w'; return isSquareAttacked(kingSquare, opponentColor); }
    function doesMoveExposeKing(fromSquare, toSquare) { const color = fromSquare.attr('data-color'); const piece = fromSquare.attr('data-piece'); const originalToPiece = toSquare.attr('data-piece'); const originalToColor = toSquare.attr('data-color'); toSquare.attr('data-piece', piece).attr('data-color', color); fromSquare.removeAttr('data-piece').removeAttr('data-color'); const kingIsInCheck = isKingInCheck(color); fromSquare.attr('data-piece', piece).attr('data-color', color); if (originalToPiece) { toSquare.attr('data-piece', originalToPiece).attr('data-color', originalToColor); } else { toSquare.removeAttr('data-piece').removeAttr('data-color'); } return kingIsInCheck; }
    function hasAnyLegalMoves(playerColor) { const playerPieces = $(`.square[data-color="${playerColor}"]`); for (let i = 0; i < playerPieces.length; i++) { const fromSquare = $(playerPieces[i]); const allSquares = $('.square'); for (let j = 0; j < allSquares.length; j++) { const toSquare = $(allSquares[j]); if (isValidMove(fromSquare, toSquare) && !doesMoveExposeKing(fromSquare, toSquare)) { return true; } } } return false; }
    function getSquare(row, col) { return $(`.square[data-row=${row}][data-col=${col}]`); }
    function isPathClear(startRow, startCol, endRow, endCol) { const dRow = Math.sign(endRow - startRow); const dCol = Math.sign(endCol - startCol); let currentRow = startRow + dRow; let currentCol = startCol + dCol; while (currentRow !== endRow || currentCol !== endCol) { if (getSquare(currentRow, currentCol).attr('data-piece')) return false; currentRow += dRow; currentCol += dCol; } return true; }
    function isValidMove(fromSquare, toSquare, bypassTurnCheck = false) { const piece = fromSquare.attr('data-piece'); if (!piece) return false; const pieceColor = fromSquare.attr('data-color'); if (!bypassTurnCheck && pieceColor !== turn) return false; const startRow = parseInt(fromSquare.attr('data-row')); const startCol = parseInt(fromSquare.attr('data-col')); const endRow = parseInt(toSquare.attr('data-row')); const endCol = parseInt(toSquare.attr('data-col')); if (toSquare.attr('data-color') === pieceColor) return false; const pieceType = piece.substring(1); switch (pieceType) { case 'P': return isValidPawnMove(startRow, startCol, endRow, endCol, pieceColor); case 'R': return isValidRookMove(startRow, startCol, endRow, endCol); case 'N': return isValidKnightMove(startRow, startCol, endRow, endCol); case 'B': return isValidBishopMove(startRow, startCol, endRow, endCol); case 'Q': return isValidQueenMove(startRow, startCol, endRow, endCol); case 'K': return isValidKingMove(startRow, startCol, endRow, endCol); } return false; }
    function isValidPawnMove(startRow, startCol, endRow, endCol, color) { const dRow = endRow - startRow; const dCol = endCol - startCol; const direction = color === 'w' ? -1 : 1; const startRank = color === 'w' ? 6 : 1; const targetSquare = getSquare(endRow, endCol); if (dCol === 0 && dRow === direction && !targetSquare.attr('data-piece')) return true; if (startRow === startRank && dCol === 0 && dRow === 2 * direction && !targetSquare.attr('data-piece')) { return !getSquare(startRow + direction, startCol).attr('data-piece'); } if (Math.abs(dCol) === 1 && dRow === direction && targetSquare.attr('data-color') && targetSquare.attr('data-color') !== color) return true; return false; }
    function isValidRookMove(startRow, startCol, endRow, endCol) { if (startRow === endRow || startCol === endCol) return isPathClear(startRow, startCol, endRow, endCol); return false; }
    function isValidKnightMove(startRow, startCol, endRow, endCol) { const dRow = Math.abs(endRow - startRow); const dCol = Math.abs(endCol - startCol); return (dRow === 2 && dCol === 1) || (dRow === 1 && dCol === 2); }
    function isValidBishopMove(startRow, startCol, endRow, endCol) { if (Math.abs(endRow - startRow) === Math.abs(endCol - startCol)) return isPathClear(startRow, startCol, endRow, endCol); return false; }
    function isValidQueenMove(startRow, startCol, endRow, endCol) { return isValidRookMove(startRow, startCol, endRow, endCol) || isValidBishopMove(startRow, startCol, endRow, endCol); }
    function isValidKingMove(startRow, startCol, endRow, endCol) { const dRow = Math.abs(endRow - startRow); const dCol = Math.abs(endCol - startCol); return dRow <= 1 && dCol <= 1; }
});