const STORAGE_KEYS = {
    VARIABLES: 'celebrity_editor_variables',
    IMAGES: 'celebrity_editor_images'
};

const DEFAULT_VARIABLES = {
    fname: "Hyunjin",
    lname: "Hwang",
    name: "Hyunjin",
    age: "26",
    occupation: "Rapper, Singer",
    location: "Seoul, South Korea",
    bio: "Hyunjin is a South Korean singer and member of the boy group Stray Kids. He is known for his powerful vocals and stage presence.",
    website: "Wikipedia >",
    bday: "20",
    bmonth: "March",
    byear: "2000",
    height: "1.79 m",
    school: "SOPA (2019), Seongnae Middle School, Global Cyber Academy",
    group: "Stray Kids",
    article1Title: "YouTube",
    article2Title: "Instagram",
    article1Text: "Hwang Hyun-jin - YouTube",
    article2Text: "Hwang Hyun-jin - Instagram",
    article1Date: "31 Oct 2025",
    article2Date: "15 Oct 2025",
    custom1Title: "What languages can Hyunjin speak?",
    custom1Value: "Hyunjin can speak Korean fluently, and has learnt English and Japanese through study.",
    custom2Title: "How tall is Hyunjin?",
    custom2Value: "Hyunjin is 1.79 meters tall, making him the tallest member in Stray Kids",
    custom3Title: "How old is Hyunjin?",
    custom3Value: "Hyunjin is 26 years old.",
};

const DEFAULT_IMAGES = {
    profile: null,
    image1: null,
    image2: null,
    image3: null,
    song1: null,
    song2: null,
    song3: null,
    articleImage1: null,
    articleLogo1: null,
    articleImage2: null,
    articleLogo2: null
};

let appState = {
    variables: { ...DEFAULT_VARIABLES },
    images: { ...DEFAULT_IMAGES }
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

const DB_NAME = 'CelebrityEditorDB';
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
