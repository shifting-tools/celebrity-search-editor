const MAX_HISTORY = 50;

let historyStack = [];
let historyIndex = -1;

function saveStateToHistory() {
    const stateSnapshot = {
        variables: { ...appState.variables },
        images: { ...appState.images }
    };
    
    historyStack = historyStack.slice(0, historyIndex + 1);
    historyStack.push(stateSnapshot);
    
    if (historyStack.length > MAX_HISTORY) {
        historyStack.shift();
    }
    
    historyIndex = historyStack.length - 1;
    updateUndoRedoButtons();
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        const state = historyStack[historyIndex];
        appState.variables = { ...state.variables };
        appState.images = { ...state.images };
        saveToLocalStorage();
        renderTemplate();
        updateUndoRedoButtons();
    }
}

function redo() {
    if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        const state = historyStack[historyIndex];
        appState.variables = { ...state.variables };
        appState.images = { ...state.images };
        saveToLocalStorage();
        renderTemplate();
        updateUndoRedoButtons();
    }
}

function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    
    if (undoBtn) {
        undoBtn.disabled = historyIndex <= 0;
    }
    
    if (redoBtn) {
        redoBtn.disabled = historyIndex >= historyStack.length - 1;
    }
}

function initializeHistory() {
    saveStateToHistory();
}
