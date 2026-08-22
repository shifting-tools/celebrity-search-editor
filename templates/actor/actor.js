// Default variables for Actor template
const DEFAULT_VARIABLES = {
    fname: 'Chase',
    lname: 'Infiniti',
    name: 'Chase Infiniti',
    age: '26',
    occupation: 'American actress',
    location: 'Indianapolis, Indiana, United States',
    bio: 'Chase Infiniti Payne is an American actress, best known for her roles in the legal thriller anthology television series Presumed Innocent, and action-comedy-thriller film One battle After Another.',
    website: 'Wikipedia >',
    bday: '1',
    bmonth: 'May',
    byear: '2000',
    height: '5\'10"',
    movie1Title: 'Presumed Innocent',
    movie1Date: 'Since 2024',
    movie2Title: 'One Battle After Another',
    movie2Date: '2025',
    movie3Title: 'The Testaments',
    movie3Date: 'Since 2026',
    school: 'Columbia College Chicago (2022), International School of Indiana, North Central High School',
    article1Date: 'January 15, 2024',
    article1Title: 'Latest Movie Premiere',
    article1Text: 'The actor attended the premiere of their latest film.',
    article2Date: 'January 10, 2024',
    article2Title: 'Award Nomination',
    article2Text: 'Nominated for Best Actor at the upcoming awards ceremony.',
    custom1Title: 'What languages can the actor speak?',
    custom1Value: 'The actor is fluent in English and Spanish.',
    custom2Title: 'How did the actor start their career?',
    custom2Value: 'Started with small theater roles before moving to film.',
    custom3Title: 'What are the actor\'s upcoming projects?',
    custom3Value: 'Currently The Julia Set, set for release this year.'
};

const DEFAULT_IMAGES = {
    image1: null,
    image2: null,
    show1: null,
    show2: null,
    show3: null,
    articleImage1: null,
    articleLogo1: null,
    articleImage2: null,
    articleLogo2: null
};

let appState = {
    variables: { ...DEFAULT_VARIABLES },
    images: { ...DEFAULT_IMAGES }
};

let currentImageSlot = null;

// Shared image storage across templates; variables stay template-specific.
const DB_NAME = 'CelebrityEditorSharedDB';
const DB_VERSION = 1;
const STORE_NAME = 'images';
let db = null;

async function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }
        };
    });
}

async function saveImageToIndexedDB(id, blob, metadata = {}) {
    if (!db) await initIndexedDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const imageRecord = {
            id: id,
            blob: blob,
            metadata: metadata,
            createdAt: Date.now()
        };
        
        const request = store.put(imageRecord);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function getImageFromIndexedDB(id) {
    if (!db) await initIndexedDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function getAllImagesFromIndexedDB() {
    if (!db) await initIndexedDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function deleteImageFromIndexedDB(id) {
    if (!db) await initIndexedDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

function dataURLToBlob(dataURL) {
    return new Promise((resolve, reject) => {
        fetch(dataURL)
            .then(res => res.blob())
            .then(resolve)
            .catch(reject);
    });
}

// Storage functions
const STORAGE_KEYS = {
    VARIABLES: 'actor_editor_variables',
    IMAGES: 'actor_editor_images'
};

function loadFromLocalStorage() {
    try {
        const savedVariables = localStorage.getItem(STORAGE_KEYS.VARIABLES);
        if (savedVariables) {
            appState.variables = { ...DEFAULT_VARIABLES, ...JSON.parse(savedVariables) };
        }
        
        const savedImages = localStorage.getItem(STORAGE_KEYS.IMAGES);
        if (savedImages) {
            appState.images = { ...DEFAULT_IMAGES, ...JSON.parse(savedImages) };
        }
    } catch (error) {
        console.error('Error loading from localStorage:', error);
    }
}

function saveToLocalStorage() {
    try {
        localStorage.setItem(STORAGE_KEYS.VARIABLES, JSON.stringify(appState.variables));
        localStorage.setItem(STORAGE_KEYS.IMAGES, JSON.stringify(appState.images));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

function resetState() {
    appState.variables = { ...DEFAULT_VARIABLES };
    appState.images = { ...DEFAULT_IMAGES };
    saveToLocalStorage();
}

// History management
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
        updateVariablesPanel();
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
        updateVariablesPanel();
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

// Initialize the application
async function initializeApp() {
    await initIndexedDB();
    loadFromLocalStorage();
    initializeHistory();
    initializeVariables();
    renderTemplate();
    setupTextEditing();
    setupCustomQuestionsEditing();
    setupImageHandlers();
    setupExportHandlers();
    setupKeyboardShortcuts();
    setupResetHandler();
    setupCollapsibleFacts();
    renderImageLibrary();
    updateUndoRedoButtons();
    initializeCombinedVariables();
    updateVariablesPanel();
    
    if (typeof preloadHtmlToImage === 'function') {
        preloadHtmlToImage();
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);

function initializeVariables() {
    const panelInputs = document.querySelectorAll('.variables-panel [data-variable]');
    
    panelInputs.forEach(input => {
        const variableName = input.dataset.variable;
        input.value = appState.variables[variableName] || '';
        input.dataset.needsRefresh = 'false';
        
        input.addEventListener('input', () => {
            input.dataset.needsRefresh = 'true';
            appState.variables[variableName] = input.value;
            saveToLocalStorage();
            renderTemplate();
        });

        const commitVariableInput = () => {
            if (input.dataset.needsRefresh !== 'true') return;

            let nextValue = input.value;
            if (!nextValue || nextValue.trim() === '') {
                nextValue = appState.variables[variableName] || '';
                input.value = nextValue;
            }

            appState.variables[variableName] = nextValue;
            saveToLocalStorage();
            renderTemplate();
            saveStateToHistory();
            input.dataset.needsRefresh = 'false';
        };
        
        input.addEventListener('change', commitVariableInput);
        input.addEventListener('blur', commitVariableInput);
    });
}

function updateVariablesPanel() {
    const panelInputs = document.querySelectorAll('.variables-panel [data-variable]');
    
    panelInputs.forEach(input => {
        const variableName = input.dataset.variable;
        input.value = appState.variables[variableName] || '';
    });
}

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

async function loadTemplateImages() {
    const imageSlots = ['image1', 'image2', 'show1', 'show2', 'show3', 'articleImage1', 'articleLogo1', 'articleImage2', 'articleLogo2'];
    
    for (const slot of imageSlots) {
        const imageId = appState.images[slot];
        const imgElement = document.getElementById(slot);
        if (imgElement) {
            if (imageId) {
                const dataURL = await loadImageFromLibrary(imageId);
                if (dataURL) {
                    imgElement.src = dataURL;
                    imgElement.style.display = 'block';
                }
            } else {
                if (['image1', 'image2', 'articleImage1', 'articleImage2'].includes(slot)) {
                    imgElement.src = '../../assets/Placeholder.png';
                } else {
                    imgElement.src = '';
                }
            }
        }
    }
}

async function loadImageFromLibrary(imageId) {
    try {
        const record = await getImageFromIndexedDB(imageId);
        if (record) {
            const dataURL = await blobToDataURL(record.blob);
            return dataURL;
        }
    } catch (error) {
        console.error('Error loading image from library:', error);
    }
    return null;
}

async function renderImageLibrary() {
    const libraryGrid = document.getElementById('imageLibrary');
    if (!libraryGrid) return;
    
    libraryGrid.innerHTML = '';
    
    try {
        const images = await getAllImagesFromIndexedDB();
        
        if (images.length === 0) {
            libraryGrid.innerHTML = '<p style="color: #5f6368; font-size: 14px;">No images in library</p>';
            return;
        }
        
        images.forEach(record => {
            const item = document.createElement('div');
            item.className = 'library-image-item';
            item.draggable = true;
            item.dataset.imageId = record.id;
            
            const img = document.createElement('img');
            img.src = '';
            
            blobToDataURL(record.blob).then(dataURL => {
                img.src = dataURL;
            });
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.onclick = async (e) => {
                e.stopPropagation();
                if (confirm('Delete this image from library?')) {
                    await deleteImageFromIndexedDB(record.id);
                    
                    for (const slot in appState.images) {
                        if (appState.images[slot] === record.id) {
                            appState.images[slot] = null;
                        }
                    }
                    saveToLocalStorage();
                    saveStateToHistory();
                    renderTemplate();
                    renderImageLibrary();
                }
            };
            
            item.ondragstart = (e) => {
                e.dataTransfer.setData('text/plain', record.id);
                e.dataTransfer.effectAllowed = 'copy';
                item.classList.add('dragging');
            };
            
            item.ondragend = () => {
                item.classList.remove('dragging');
            };
            
            item.appendChild(img);
            item.appendChild(deleteBtn);
            libraryGrid.appendChild(item);
        });
    } catch (error) {
        console.error('Error rendering image library:', error);
    }
}

async function useLibraryImageForSlot(imageId, slot) {
    try {
        const dataURL = await loadImageFromLibrary(imageId);
        if (dataURL && slot) {
            appState.images[slot] = imageId;
            saveToLocalStorage();
            saveStateToHistory();
            renderTemplate();
        }
    } catch (error) {
        console.error('Error using library image for slot:', error);
    }
}

function handleImageUpload(file) {
    if (!file) return;
    
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        alert('Please select a PNG, JPEG, or WebP image.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const dataURL = e.target.result;
            const blob = await dataURLToBlob(dataURL);
            const imageId = 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            await saveImageToIndexedDB(imageId, blob, {
                name: file.name,
                type: file.type,
                size: file.size
            });
            
            if (currentImageSlot) {
                appState.images[currentImageSlot] = imageId;
                saveToLocalStorage();
                saveStateToHistory();
                renderTemplate();
                currentImageSlot = null;
            } else {
                renderImageLibrary();
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Failed to upload image.');
        }
    };
    reader.readAsDataURL(file);
}

async function handleMultipleImageUpload(files) {
    if (!files || files.length === 0) return;
    
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    const validFiles = Array.from(files).filter(file => validTypes.includes(file.type));
    
    if (validFiles.length === 0) {
        alert('Please select PNG, JPEG, or WebP images.');
        return;
    }
    
    if (validFiles.length < files.length) {
        alert(`${files.length - validFiles.length} file(s) were skipped (invalid format).`);
    }
    
    for (const file of validFiles) {
        try {
            const dataURL = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(file);
            });
            
            const blob = await dataURLToBlob(dataURL);
            const imageId = 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            await saveImageToIndexedDB(imageId, blob, {
                name: file.name,
                type: file.type,
                size: file.size
            });
        } catch (error) {
            console.error('Error uploading image:', file.name, error);
        }
    }
    
    renderImageLibrary();
}

function setupImageHandlers() {
    const imageInput = document.getElementById('imageInput');
    const addImageBtn = document.getElementById('addImageBtn');
    const refreshLibraryBtn = document.getElementById('refreshLibraryBtn');
    
    if (addImageBtn) {
        addImageBtn.onclick = () => {
            currentImageSlot = null;
            imageInput.click();
        };
    }
    
    if (refreshLibraryBtn) {
        refreshLibraryBtn.onclick = async () => {
            loadFromLocalStorage();
            updateVariablesPanel();
            renderTemplate();
            renderImageLibrary();
        };
    }
    
    imageInput.onchange = (e) => {
        const files = e.target.files;
        if (files.length > 1) {
            handleMultipleImageUpload(files);
        } else if (files.length === 1) {
            handleImageUpload(files[0]);
        }
        imageInput.value = '';
    };
    
    const templateImages = document.querySelectorAll('[data-image-slot]');
    templateImages.forEach(img => {
        img.onclick = (e) => {
            e.stopPropagation();
            currentImageSlot = img.dataset.imageSlot;
            imageInput.click();
        };
        
        img.ondragover = (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            img.parentElement.classList.add('drag-over');
        };
        
        img.ondragleave = () => {
            img.parentElement.classList.remove('drag-over');
        };
        
        img.ondrop = async (e) => {
            e.preventDefault();
            img.parentElement.classList.remove('drag-over');
            const imageId = e.dataTransfer.getData('text/plain');
            if (imageId) {
                await useLibraryImageForSlot(imageId, img.dataset.imageSlot);
            }
        };
    });
    
    const placeholders = document.querySelectorAll('.image-placeholder');
    placeholders.forEach(placeholder => {
        placeholder.onclick = (e) => {
            e.stopPropagation();
            const slot = placeholder.parentElement.querySelector('[data-image-slot]');
            if (slot) {
                currentImageSlot = slot.dataset.imageSlot;
                imageInput.click();
            }
        };
        
        placeholder.ondragover = (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            placeholder.parentElement.classList.add('drag-over');
        };
        
        placeholder.ondragleave = () => {
            placeholder.parentElement.classList.remove('drag-over');
        };
        
        placeholder.ondrop = async (e) => {
            e.preventDefault();
            placeholder.parentElement.classList.remove('drag-over');
            const slot = placeholder.parentElement.querySelector('[data-image-slot]');
            const imageId = e.dataTransfer.getData('text/plain');
            if (imageId && slot) {
                await useLibraryImageForSlot(imageId, slot.dataset.imageSlot);
            }
        };
    });
}

function initializeCombinedVariables() {
    const fname = appState.variables.fname;
    const lname = appState.variables.lname;
    const bday = appState.variables.bday;
    const bmonth = appState.variables.bmonth;
    const byear = appState.variables.byear;
    const age = appState.variables.age;
    const location = appState.variables.location;
    
    updateVariableDisplay('name', `${fname} ${lname}`);
    updateVariableDisplay('fname lname', `${fname} ${lname}`);
    updateVariableDisplay('born', `${bday} ${bmonth} ${byear} (${age} years), ${location}`);
    updateVariableDisplay('birthdate', `${bday} ${bmonth} ${byear}`);
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
                initializeCombinedVariables();
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

function setupCustomQuestionsEditing() {
    const collapsibleItems = document.querySelectorAll('.collapsible-fact-item');
    
    collapsibleItems.forEach(item => {
        const collapsibleId = item.dataset.collapsibleId;
        const titleVariable = `${collapsibleId}Title`;
        const valueVariable = `${collapsibleId}Value`;
        const titleElement = item.querySelector('.collapsible-title');
        const valueElement = item.querySelector('.collapsible-value');
        
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
                }
            };
        };
        
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
                }
            };
        };
    });
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
            updateVariablesPanel();
        }
    };
}

async function exportToPNG() {
    const canvas = document.getElementById('previewCanvas');
    if (!canvas) {
        console.error('Preview canvas element not found');
        alert('Preview canvas not found. Please refresh the page.');
        return;
    }
    
    try {
        console.log('Starting PNG export...');
        
        const htmlToImage = await loadHtmlToImage();
        console.log('html-to-image library loaded successfully');
        
        await waitForImagesToLoad(canvas);
        console.log('All images loaded');
        
        console.log('Converting DOM to PNG...');
        const dataUrl = await htmlToImage.toPng(canvas, {
            quality: 0.92,
            pixelRatio: 1.5,
            backgroundColor: '#ffffff',
            cacheBust: false,
            skipFonts: false,
            useCORS: true
        });
        console.log('PNG generated successfully');
        
        const link = document.createElement('a');
        link.download = `actor-profile-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
    } catch (error) {
        console.error('Error exporting PNG:', error);
        alert(`Failed to export PNG: ${error.message}. Please check the console for details.`);
    }
}

async function waitForImagesToLoad(container) {
    const images = container.querySelectorAll('img');
    const promises = [];
    
    console.log(`Checking ${images.length} images for loading...`);
    
    images.forEach((img, index) => {
        if (!img.src || img.src === '' || img.src === window.location.href) {
            return;
        }
        
        if (img.complete && img.naturalHeight !== 0) {
            return;
        }
        
        promises.push(new Promise((resolve) => {
            const timeout = setTimeout(() => {
                resolve();
            }, 5000);
            
            if (img.complete) {
                clearTimeout(timeout);
                resolve();
            } else {
                img.onload = () => {
                    clearTimeout(timeout);
                    resolve();
                };
                img.onerror = () => {
                    clearTimeout(timeout);
                    resolve();
                };
            }
        }));
    });
    
    await Promise.all(promises);
}

function loadHtmlToImage() {
    return new Promise((resolve, reject) => {
        if (window.htmlToImage) {
            resolve(window.htmlToImage);
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.min.js';
        script.async = true;
        
        script.onload = () => {
            if (window.htmlToImage) {
                resolve(window.htmlToImage);
            } else {
                reject(new Error('html-to-image library not loaded correctly'));
            }
        };
        
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function preloadHtmlToImage() {
    if (!window.htmlToImage && !document.querySelector('script[src*="html-to-image"]')) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.min.js';
        script.async = true;
        document.head.appendChild(script);
    }
}

async function exportProject() {
    try {
        const images = await getAllImagesFromIndexedDB();
        const projectData = {
            variables: appState.variables,
            images: appState.images,
            embeddedImages: {}
        };
        
        for (const record of images) {
            const dataURL = await blobToDataURL(record.blob);
            projectData.embeddedImages[record.id] = dataURL;
        }
        
        const json = JSON.stringify(projectData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.download = `actor-project-${Date.now()}.json`;
        link.href = url;
        link.click();
        
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error exporting project:', error);
        alert('Failed to export project.');
    }
}

async function importProject(file) {
    if (!file) return;
    
    try {
        const text = await file.text();
        const projectData = JSON.parse(text);
        const sanitizedProject = sanitizeImportedProjectData(projectData);

        if (!sanitizedProject) {
            alert('Invalid project file.');
            return;
        }
        
        appState.variables = { ...DEFAULT_VARIABLES, ...sanitizedProject.variables };
        appState.images = { ...DEFAULT_IMAGES, ...sanitizedProject.images };
        
        if (sanitizedProject.embeddedImages) {
            for (const [imageId, dataURL] of Object.entries(sanitizedProject.embeddedImages)) {
                try {
                    const blob = await dataURLToBlob(dataURL);
                    await saveImageToIndexedDB(imageId, blob);
                } catch (error) {
                    console.error('Error importing image:', imageId, error);
                }
            }
        }
        
        saveToLocalStorage();
        saveStateToHistory();
        updateVariablesPanel();
        renderTemplate();
        renderImageLibrary();
        
        alert('Project imported successfully!');
    } catch (error) {
        console.error('Error importing project:', error);
        alert('Failed to import project. Please check the file format.');
    }
}

function setupExportHandlers() {
    const exportPngBtn = document.getElementById('exportPngBtn');
    const exportProjectBtn = document.getElementById('exportProjectBtn');
    const importProjectBtn = document.getElementById('importProjectBtn');
    const projectImportInput = document.getElementById('projectImportInput');
    
    exportPngBtn.onclick = exportToPNG;
    exportProjectBtn.onclick = exportProject;
    
    importProjectBtn.onclick = () => {
        projectImportInput.click();
    };
    
    projectImportInput.onchange = (e) => {
        const file = e.target.files[0];
        importProject(file);
        projectImportInput.value = '';
    };
}
