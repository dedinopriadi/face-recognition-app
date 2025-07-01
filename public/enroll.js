// File upload handling
const imageInput = document.getElementById('image');
const uploadArea = document.getElementById('uploadArea');
const previewArea = document.getElementById('previewArea');
const imagePreview = document.getElementById('imagePreview');
const removeImage = document.getElementById('removeImage');
const enrollForm = document.getElementById('enrollForm');
const submitBtn = document.getElementById('submitBtn');
const loadingModal = document.getElementById('loadingModal');
const successModal = document.getElementById('successModal');
const successOkBtn = document.getElementById('successOkBtn');
const enrollAgainBtn = document.getElementById('enrollAgainBtn');
const errorModal = document.getElementById('errorModal');
const errorOkBtn = document.getElementById('errorOkBtn');
const errorModalMsg = document.getElementById('errorModalMsg');

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
enrollForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(enrollForm);
    const name = formData.get('name').trim();
    const file = formData.get('image');

    if (!name || !file) {
        alert('Please fill in all required fields');
        return;
    }

    // Show loading
    submitBtn.disabled = true;
    loadingModal.classList.remove('hidden');

    try {
        const response = await fetch('/api/face/enroll', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        loadingModal.classList.add('hidden');
        submitBtn.disabled = false;
        if (response.ok) {
            // Show success modal
            loadingModal.classList.add('hidden');
            successModal.classList.remove('hidden');
        } else {
            loadingModal.classList.add('hidden');
            errorModalMsg.textContent = result.error || 'Failed to enroll face.';
            errorModal.classList.remove('hidden');
        }
    } catch (error) {
        loadingModal.classList.add('hidden');
        submitBtn.disabled = false;
        errorModalMsg.textContent = 'An error occurred. Please try again.';
        errorModal.classList.remove('hidden');
    }
});

// Add event listener for click on uploadArea
uploadArea.addEventListener('click', function() {
    imageInput.click();
});

// Tambahkan handler untuk tombol modal
if (successOkBtn && successModal) {
    successOkBtn.addEventListener('click', function() {
        successModal.classList.add('hidden');
        window.location.href = '/enroll';
    });
}
if (enrollAgainBtn && successModal) {
    enrollAgainBtn.addEventListener('click', function() {
        successModal.classList.add('hidden');
        // Reset form and preview
        enrollForm.reset();
        imageInput.value = '';
        uploadArea.classList.remove('hidden');
        previewArea.classList.add('hidden');
    });
}
if (errorOkBtn && errorModal) {
    errorOkBtn.addEventListener('click', function() {
        errorModal.classList.add('hidden');
    });
} 