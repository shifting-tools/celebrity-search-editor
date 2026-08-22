function isValidInternalImageId(value) {
    return typeof value === 'string' && /^img_[A-Za-z0-9]+$/.test(value);
}

function sanitizeImportedProjectImageState(imageState) {
    const safeState = {};
    const validKeys = Object.keys(DEFAULT_IMAGES || {});

    for (const key of validKeys) {
        const value = imageState && imageState[key];

        if (value === null || value === undefined || value === '') {
            safeState[key] = null;
            continue;
        }

        if (!isValidInternalImageId(value)) {
            safeState[key] = null;
            continue;
        }

        safeState[key] = value;
    }

    return safeState;
}

function sanitizeImportedProjectData(projectData) {
    if (!projectData || typeof projectData !== 'object') {
        return null;
    }

    if (!projectData.variables || typeof projectData.variables !== 'object') {
        return null;
    }

    if (!projectData.images || typeof projectData.images !== 'object') {
        return null;
    }

    const sanitizedImages = sanitizeImportedProjectImageState(projectData.images);
    const sanitizedEmbeddedImages = {};

    if (projectData.embeddedImages && typeof projectData.embeddedImages === 'object') {
        for (const [imageId, dataURL] of Object.entries(projectData.embeddedImages)) {
            if (!isValidInternalImageId(imageId)) {
                continue;
            }

            if (typeof dataURL !== 'string' || !/^data:image\//i.test(dataURL)) {
                continue;
            }

            sanitizedEmbeddedImages[imageId] = dataURL;
        }
    }

    for (const slot of Object.keys(sanitizedImages)) {
        const imageId = sanitizedImages[slot];
        if (imageId && !Object.prototype.hasOwnProperty.call(sanitizedEmbeddedImages, imageId)) {
            const isKnownLocalImage = isValidInternalImageId(imageId);
            if (!isKnownLocalImage) {
                sanitizedImages[slot] = null;
            }
        }
    }

    return {
        variables: projectData.variables,
        images: sanitizedImages,
        embeddedImages: sanitizedEmbeddedImages
    };
}

async function exportToPNG() {
    const canvas = document.getElementById('previewCanvas');
    if (!canvas) {
        console.error('Preview canvas element not found');
        alert('Preview canvas not found. Please refresh the page.');
        return;
    }
    
    const perfLog = {
        libraryLoad: 0,
        waitForImages: 0,
        domClone: 0,
        canvasRender: 0,
        pngEncode: 0,
        total: 0
    };
    
    const startTime = performance.now();
    
    try {
        console.log('Starting PNG export...');
        
        const libStart = performance.now();
        const htmlToImage = await loadHtmlToImage();
        perfLog.libraryLoad = performance.now() - libStart;
        console.log('html-to-image library loaded successfully');
        
        const waitStart = performance.now();
        await waitForImagesToLoad(canvas);
        perfLog.waitForImages = performance.now() - waitStart;
        console.log('All images loaded');
        
        const cloneStart = performance.now();
        
        const unfilledSlots = checkUnfilledPhotoSlots(canvas);
        if (unfilledSlots.length > 0) {
            throw new Error(`Unfilled photo slot(s): ${unfilledSlots.join(', ')}. Please fill all photo slots before exporting.`);
        }
        
        console.log('Converting DOM to PNG...');
        const dataUrl = await htmlToImage.toPng(canvas, {
            quality: 0.92,
            pixelRatio: 1.5,
            backgroundColor: '#ffffff',
            cacheBust: false,
            skipFonts: false,
            useCORS: true
        });
        perfLog.pngEncode = performance.now() - cloneStart;
        console.log('PNG generated successfully, data URL length:', dataUrl.length);
        
        const link = document.createElement('a');
        link.download = `celebrity-search-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
        
        perfLog.total = performance.now() - startTime;
        console.log('PNG Export Performance (ms):', perfLog);
    } catch (error) {
        console.error('Error exporting PNG:', error);
        console.error('Error details:', error.message, error.stack);
        
        if (error.message && error.message.includes('Unfilled photo slot')) {
            alert(`Export failed: ${error.message}`);
        } else {
            alert(`Failed to export PNG: ${error.message}. Please check the console for details.`);
        }
    }
}

async function waitForImagesToLoad(container) {
    const images = container.querySelectorAll('img');
    const promises = [];
    
    console.log(`Checking ${images.length} images for loading...`);
    
    images.forEach((img, index) => {
        // Skip images without src or with empty src
        if (!img.src || img.src === '' || img.src === window.location.href) {
            return;
        }
        
        // Check if image is already loaded
        if (img.complete && img.naturalHeight !== 0) {
            console.log(`Image ${index} already loaded:`, img.src.substring(0, 50) + '...');
            return;
        }
        
        // Wait for image to load
        promises.push(new Promise((resolve) => {
            const timeout = setTimeout(() => {
                console.warn(`Image ${index} loading timeout:`, img.src.substring(0, 50) + '...');
                resolve(); // Resolve anyway to not block export
            }, 5000);
            
            if (img.complete) {
                clearTimeout(timeout);
                resolve();
            } else {
                img.onload = () => {
                    clearTimeout(timeout);
                    console.log(`Image ${index} loaded:`, img.src.substring(0, 50) + '...');
                    resolve();
                };
                img.onerror = () => {
                    clearTimeout(timeout);
                    console.warn(`Image ${index} failed to load:`, img.src.substring(0, 50) + '...');
                    resolve(); // Resolve anyway to not block export
                };
            }
        }));
    });
    
    await Promise.all(promises);
    console.log('Image loading check complete');
}

function checkUnfilledPhotoSlots(container) {
    const imageSlots = container.querySelectorAll('[data-image-slot]');
    const unfilledSlots = [];
    
    imageSlots.forEach(img => {
        if (!img.src || img.src === '' || img.src === window.location.href) {
            unfilledSlots.push(img.dataset.imageSlot || img.id);
        }
    });
    
    return unfilledSlots;
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
        link.download = `celebrity-project-${Date.now()}.json`;
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
