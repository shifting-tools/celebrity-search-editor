let currentImageSlot = null;

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

async function useLibraryImage(imageId) {
    try {
        const dataURL = await loadImageFromLibrary(imageId);
        if (dataURL && currentImageSlot) {
            appState.images[currentImageSlot] = imageId;
            saveToLocalStorage();
            saveStateToHistory();
            renderTemplate();
            currentImageSlot = null;
        }
    } catch (error) {
        console.error('Error using library image:', error);
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

async function loadTemplateImages() {
    const imageSlots = ['image1', 'image2', 'song1', 'song2', 'song3', 'articleImage1', 'articleLogo1', 'articleImage2', 'articleLogo2'];
    
    for (const slot of imageSlots) {
        const imageId = appState.images[slot];
        if (imageId) {
            const dataURL = await loadImageFromLibrary(imageId);
            const imgElement = document.getElementById(slot);
            if (imgElement && dataURL) {
                imgElement.src = dataURL;
                imgElement.style.display = 'block';
                const placeholder = imgElement.parentElement.querySelector('.image-placeholder');
                if (placeholder) {
                    placeholder.style.display = 'none';
                }
            }
        }
    }
}

function setupImageHandlers() {
    const imageInput = document.getElementById('imageInput');
    const addImageBtn = document.getElementById('addImageBtn');
    
    addImageBtn.onclick = () => {
        currentImageSlot = null;
        imageInput.click();
    };
    
    imageInput.onchange = (e) => {
        const file = e.target.files[0];
        handleImageUpload(file);
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
