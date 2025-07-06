// File upload handling
const imageInput = document.getElementById('image');
const uploadArea = document.getElementById('uploadArea');
const previewArea = document.getElementById('previewArea');
const imagePreview = document.getElementById('imagePreview');
const removeImage = document.getElementById('removeImage');
const recognizeForm = document.getElementById('recognizeForm');
const submitBtn = document.getElementById('submitBtn');
const loadingModal = document.getElementById('loadingModal');
const resultsArea = document.getElementById('resultsArea');
const successResult = document.getElementById('successResult');
const noMatchResult = document.getElementById('noMatchResult');
const errorResult = document.getElementById('errorResult');
const personName = document.getElementById('personName');
const confidence = document.getElementById('confidence');
const errorMessage = document.getElementById('errorMessage');

// Handle file selection
imageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            uploadArea.classList.add('hidden');
            previewArea.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
});

// Handle drag and drop
uploadArea.addEventListener('dragover', function(e) {
    e.preventDefault();
    uploadArea.classList.add('border-blue-400');
});

uploadArea.addEventListener('dragleave', function(e) {
    e.preventDefault();
    uploadArea.classList.remove('border-blue-400');
});

uploadArea.addEventListener('drop', function(e) {
    e.preventDefault();
    uploadArea.classList.remove('border-blue-400');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        imageInput.files = e.dataTransfer.files;
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            uploadArea.classList.add('hidden');
            previewArea.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
});

// Remove image
removeImage.addEventListener('click', function() {
    imageInput.value = '';
    uploadArea.classList.remove('hidden');
    previewArea.classList.add('hidden');
});

// Form submission
recognizeForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(recognizeForm);
    const file = formData.get('image');

    if (!file) {
        alert('Please select an image');
        return;
    }

    // Show loading
    submitBtn.disabled = true;
    loadingModal.classList.remove('hidden');
    resultsArea.classList.add('hidden');
    successResult.classList.add('hidden');
    noMatchResult.classList.add('hidden');
    errorResult.classList.add('hidden');

    try {
        const response = await fetch('/api/face/recognize', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        loadingModal.classList.add('hidden');
        submitBtn.disabled = false;
        resultsArea.classList.remove('hidden');

        if (response.ok && result.data && result.data.recognized) {
            // Success
            personName.textContent = result.data.person.name;
            let conf = (result.data.person && typeof result.data.person.confidence === 'number')
                ? result.data.person.confidence
                : (typeof result.data.confidence === 'number' ? result.data.confidence : null);
            confidence.textContent = conf !== null ? (conf * 100).toFixed(2) + '%' : '-';
            successResult.classList.remove('hidden');
        } else if (response.ok && result.data && !result.data.recognized) {
            // No match
            noMatchResult.classList.remove('hidden');
        } else {
            // Error
            errorMessage.textContent = result.error || 'Recognition failed';
            errorResult.classList.remove('hidden');
        }
    } catch (error) {
        loadingModal.classList.add('hidden');
        submitBtn.disabled = false;
        errorMessage.textContent = 'An error occurred. Please try again.';
        resultsArea.classList.remove('hidden');
        errorResult.classList.remove('hidden');
    }
}); 

// Add event listener for click on uploadArea
uploadArea.addEventListener('click', function() {
    imageInput.click();
}); 