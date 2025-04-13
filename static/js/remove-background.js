const allowedFormats = ["png", "jpg", "jpeg", "webp", "heic", "heif", "gif"];
let processedImageData = null;

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('removeBackgroundForm').addEventListener('submit', handleRemoveBgSubmit);
    document.getElementById('remove-image').addEventListener('click', resetInterface);
    document.getElementById('file-input').addEventListener('change', handleFileChange);
});

const getCSRFToken = () => {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
};

function handleFileChange(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('preview');
    const fileLabel = document.getElementById('file-label');
    const fileNameDisplay = document.getElementById('file-name-display');
    const removeButton = document.getElementById('remove-image');
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();

    //validate formats
    if (!allowedFormats.includes(ext)) {
        fileLabel.textContent = "Choose an image file";
        fileNameDisplay.innerHTML = `
            <div class="file-size-warning exceeded">
                Unsupported file format: <strong>.${ext}</strong>. Please upload PNG, JPG, JPEG, or WEBP.
            </div>`;
        event.target.value = '';
        preview.style.display = 'none';
        removeButton.style.display = 'none';
        return;
    }
    // Check file size
    if (file.size > maxSize) {
        fileLabel.textContent = "Choose an image file";
        fileNameDisplay.innerHTML = `
            <div class="file-size-warning exceeded">
                File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 10MB limit.
            </div>`;
        event.target.value = '';
        preview.style.display = 'none';
        removeButton.style.display = 'none';
        return;
    }

    if (file) {
        const objectURL = URL.createObjectURL(file);
        preview.src = objectURL;
        preview.style.display = 'block';
        fileLabel.textContent = 'Change image';
        fileNameDisplay.textContent = file.name;
        removeButton.style.display = 'flex';

        document.querySelector('.preview-container').style.display = 'block';
    }
}

function handleRemoveBgSubmit(event) {
    event.preventDefault();

    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];

    if (!file) {
        alert("Please select an image file.");
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        alert('File size exceeds 10MB limit.');
        return;
    }

    document.getElementById('remove-btn').style.display = 'none';
    document.getElementById('loading-spinner').style.display = 'block';

    const formData = new FormData();
    formData.append('image', file);

    fetch('/remove-background', {
        method: 'POST',
        credentials: 'include',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCSRFToken()
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error during background removal');
        }
        return response.blob();
    })
    .then(blob => {
        const objectURL = URL.createObjectURL(blob);
        processedImageData = blob;

        showBgRemovalResult(objectURL);

        document.getElementById('loading-spinner').style.display = 'none';
        const successMsg = document.createElement('div');
        successMsg.className = 'conversion-success text-center mt-3';
        successMsg.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="me-1">
                <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
            </svg>
            Background removed successfully!
        `;
        document.getElementById('removeBackgroundForm').appendChild(successMsg);
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Background removal failed. Please try again.');
        document.getElementById('remove-btn').style.display = 'block';
        document.getElementById('loading-spinner').style.display = 'none';
    });
}

function showBgRemovalResult(objectURL) {
    const resultContainer = document.getElementById('result-container');

    resultContainer.innerHTML = `
        <img src="${objectURL}" alt="Background Removed Preview" id="result-image" class="preview-image" style="display: block;">
        <a href="#" id="download-link" class="download-link" onclick="downloadBgRemovedImage('background-removed.png')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right: 6px;">
                <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
            </svg>
            Download PNG
        </a>
        <button class="btn btn-sm btn-outline-secondary mt-3" onclick="resetInterface()">Try Another Image</button>
    `;
}

function downloadBgRemovedImage(filename) {
    if (processedImageData) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(processedImageData);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    return false;
}

function resetInterface() {
    // Clear file input
    const fileInput = document.getElementById('file-input');
    fileInput.value = '';

    // Hide preview
    const preview = document.getElementById('preview');
    preview.src = '#';
    preview.style.display = 'none';

    // Clear file name and reset label
    document.getElementById('file-label').textContent = 'Choose an image file';
    document.getElementById('file-name-display').textContent = '';
    document.querySelector('.preview-container').style.display = 'none';

    // Show remove button again
    document.getElementById('remove-btn').style.display = 'block';

    document.getElementById('remove-image').style.display = 'none';


    // Clear result
    document.getElementById('result-container').innerHTML = `
        <div class="text-muted" id="placeholder-content">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" viewBox="0 0 16 16" class="mb-3 opacity-25">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
            </svg>
            <p>Your processed image will appear here</p>
        </div>
    `;

    // Remove success messages
    document.querySelectorAll('.conversion-success').forEach(el => el.remove());

    // Reset data
    processedImageData = null;
}
