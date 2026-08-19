function substituteVariables(text) {
    return text.replace(/\{(\w+)\}/g, (match, variableName) => {
        return appState.variables[variableName] || match;
    });
}

function renderTemplate() {
    const textElements = document.querySelectorAll('[data-variable]');
    textElements.forEach(element => {
        const variableName = element.dataset.variable;
        const originalText = element.textContent;
        const substitutedText = substituteVariables(originalText);
        element.textContent = substitutedText;
    });
    
    loadTemplateImages();
}

function setupVariablesPanel() {
    const panelInputs = document.querySelectorAll('.variables-panel [data-variable]');
    
    panelInputs.forEach(input => {
        const variableName = input.dataset.variable;
        input.value = appState.variables[variableName] || '';
        
        input.addEventListener('input', () => {
            appState.variables[variableName] = input.value;
            saveToLocalStorage();
            renderTemplate();
        });
        
        input.addEventListener('change', () => {
            saveStateToHistory();
        });
    });
}

function updateVariablesPanel() {
    const panelInputs = document.querySelectorAll('.variables-panel [data-variable]');
    
    panelInputs.forEach(input => {
        const variableName = input.dataset.variable;
        input.value = appState.variables[variableName] || '';
    });
}

function setupTextEditing() {
    const textElements = document.querySelectorAll('[data-variable]');
    
    textElements.forEach(element => {
        if (element.closest('.variables-panel')) return;
        element.onclick = (e) => {
            if (element.classList.contains('editable')) return;
            
            const variableName = element.dataset.variable;
            const panelInput = document.querySelector(`.variables-panel [data-variable="${variableName}"]`);
            const currentValue = panelInput ? panelInput.value : appState.variables[variableName];
            
            element.classList.add('editable');
            element.contentEditable = true;
            element.textContent = currentValue;
            element.focus();
            
            const saveEdit = () => {
                const newValue = element.textContent.trim();
                if (newValue === '') {
                    appState.variables[variableName] = DEFAULT_VARIABLES[variableName];
                    if (panelInput) panelInput.value = DEFAULT_VARIABLES[variableName];
                } else {
                    appState.variables[variableName] = newValue;
                    if (panelInput) panelInput.value = newValue;
                }
                saveToLocalStorage();
                saveStateToHistory();
                
                element.classList.remove('editable');
                element.contentEditable = false;
                renderTemplate();
            };
            
            element.onblur = saveEdit;
            element.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    element.blur();
                } else if (e.key === 'Escape') {
                    element.textContent = currentValue;
                    element.classList.remove('editable');
                    element.contentEditable = false;
                    renderTemplate();
                }
            };
        };
    });
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.target.classList.contains('editable')) return;
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                redo();
            } else {
                undo();
            }
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
            e.preventDefault();
            redo();
        }
    });
}

function setupResetHandler() {
    const resetBtn = document.getElementById('resetBtn');
    resetBtn.onclick = () => {
        if (confirm('Are you sure you want to reset the template? This will delete all your changes.')) {
            resetState();
            saveStateToHistory();
            renderTemplate();
        }
    };
}

function setupCollapsibleFacts() {
    const collapsibleItems = document.querySelectorAll('.collapsible-fact-item');
    
    collapsibleItems.forEach(item => {
        const header = item.querySelector('.collapsible-header');
        const toggle = item.querySelector('.collapsible-toggle');
        
        const toggleCollapse = () => {
            item.classList.toggle('expanded');
        };
        
        header.addEventListener('click', toggleCollapse);
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleCollapse();
        });
    });
}

function renderCustomQuestions() {
    const collapsibleItems = document.querySelectorAll('.collapsible-fact-item');
    
    collapsibleItems.forEach(item => {
        const collapsibleId = item.dataset.collapsibleId;
        const titleVariable = `${collapsibleId}Title`;
        const valueVariable = `${collapsibleId}Value`;
        
        const titleElement = item.querySelector('.collapsible-title');
        const valueElement = item.querySelector('.collapsible-value');
        
        if (titleElement) titleElement.textContent = appState.variables[titleVariable];
        if (valueElement) valueElement.textContent = appState.variables[valueVariable];
    });
}

function setupCustomQuestionsEditing() {
    const collapsibleItems = document.querySelectorAll('.collapsible-fact-item');
    
    collapsibleItems.forEach(item => {
        const collapsibleId = item.dataset.collapsibleId;
        const titleVariable = `${collapsibleId}Title`;
        const valueVariable = `${collapsibleId}Value`;
        const titleElement = item.querySelector('.collapsible-title');
        const valueElement = item.querySelector('.collapsible-value');
        
        // Setup title editing
        titleElement.onclick = (e) => {
            if (titleElement.classList.contains('editable')) return;
            
            const currentValue = appState.variables[titleVariable];
            
            titleElement.classList.add('editable');
            titleElement.contentEditable = true;
            titleElement.textContent = currentValue;
            titleElement.focus();
            
            const saveEdit = () => {
                const newValue = titleElement.textContent.trim();
                if (newValue === '') {
                    appState.variables[titleVariable] = DEFAULT_VARIABLES[titleVariable];
                } else {
                    appState.variables[titleVariable] = newValue;
                }
                saveToLocalStorage();
                saveStateToHistory();
                
                titleElement.classList.remove('editable');
                titleElement.contentEditable = false;
                renderCustomQuestions();
            };
            
            titleElement.onblur = saveEdit;
            titleElement.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    titleElement.blur();
                } else if (e.key === 'Escape') {
                    titleElement.textContent = currentValue;
                    titleElement.classList.remove('editable');
                    titleElement.contentEditable = false;
                    renderCustomQuestions();
                }
            };
        };
        
        // Setup value editing
        valueElement.onclick = (e) => {
            if (valueElement.classList.contains('editable')) return;
            
            const currentValue = appState.variables[valueVariable];
            
            valueElement.classList.add('editable');
            valueElement.contentEditable = true;
            valueElement.textContent = currentValue;
            valueElement.focus();
            
            const saveEdit = () => {
                const newValue = valueElement.textContent.trim();
                if (newValue === '') {
                    appState.variables[valueVariable] = DEFAULT_VARIABLES[valueVariable];
                } else {
                    appState.variables[valueVariable] = newValue;
                }
                saveToLocalStorage();
                saveStateToHistory();
                
                valueElement.classList.remove('editable');
                valueElement.contentEditable = false;
                renderCustomQuestions();
            };
            
            valueElement.onblur = saveEdit;
            valueElement.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    valueElement.blur();
                } else if (e.key === 'Escape') {
                    valueElement.textContent = currentValue;
                    valueElement.classList.remove('editable');
                    valueElement.contentEditable = false;
                    renderCustomQuestions();
                }
            };
        };
    });
}

async function initializeApp() {
    await initIndexedDB();
    loadFromLocalStorage();
    initializeHistory();
    setupVariablesPanel();
    renderTemplate();
    renderCustomQuestions();
    setupTextEditing();
    setupCustomQuestionsEditing();
    setupImageHandlers();
    setupExportHandlers();
    setupKeyboardShortcuts();
    setupResetHandler();
    setupCollapsibleFacts();
    renderImageLibrary();
    updateUndoRedoButtons();
    
    if (typeof preloadHtmlToImage === 'function') {
        preloadHtmlToImage();
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);
