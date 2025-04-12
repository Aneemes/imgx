const allowedFormats = ["png", "jpg", "jpeg", "webp", "heic", "heif", "gif"];
let compressedImageData = null;

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('uploadForm').addEventListener('submit', handleCompressSubmit);
    document.getElementById('remove-image').addEventListener('click', resetCompressInterface);

    const qualitySlider = document.getElementById('quality-slider');
    if (qualitySlider) {
        qualitySlider.addEventListener('input', function () {
            updateQualityValue(qualitySlider.value);
        });
    }

    document.getElementById('file-input').addEventListener('change', handleCompressFileChange);
});

function updateQualityValue(value) {
    const qualityValue = document.getElementById('quality-value');
    if (qualityValue) {
        qualityValue.textContent = value + '%';
    }
}

function handleCompressFileChange(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('preview');
    const fileLabel = document.getElementById('file-label');
    const fileNameDisplay = document.getElementById('file-name-display');
    const removeButton = document.getElementById('remove-image');
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();

    // Validate format
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

    // Show file name and size
    fileLabel.textContent = "Change image file";
    fileNameDisplay.innerHTML = `
        ${file.name}
        <div class="file-size-warning">
            File size: ${(file.size / (1024 * 1024)).toFixed(2)} MB
        </div>`;

    const reader = new FileReader();
    reader.onload = function (e) {
        preview.src = e.target.result;
        preview.style.display = 'block';
        removeButton.style.display = 'flex';
    };
    reader.readAsDataURL(file);

    document.getElementById('result-column').classList.remove('d-none');
}

function handleCompressSubmit(event) {
    event.preventDefault();
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

    const fileInput = document.getElementById('file-input');
    const qualitySlider = document.getElementById('quality-slider');
    const file = fileInput.files[0];
    const maxSize = 10 * 1024 * 1024;

    if (!file) {
        alert('Please choose an image to compress.');
        return;
    }

    if (file.size > maxSize) {
        alert('File size exceeds the 10MB limit. Please choose a smaller file.');
        return;
    }

    // Show loading
    document.getElementById('compress-btn').style.display = 'none';
    document.getElementById('loading-spinner').style.display = 'block';

    const quality = qualitySlider ? qualitySlider.value : 80;

    const formData = new FormData();
    formData.append('image', file);
    formData.append('quality', quality);

    fetch('/compress', {
        method: 'POST',
        credentials: 'include',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': csrfToken
        }
    })
        .then(response => {
            if (!response.ok) throw new Error('Network error');
            return response.blob();
        })
        .then(blob => {
            compressedImageData = blob;
            const objectURL = URL.createObjectURL(blob);
            showCompressResult(objectURL, file.name);
        })
        .catch(err => {
            console.error('Compression error:', err);
            alert('Failed to compress image. Please try again.');
        })
        .finally(() => {
            document.getElementById('loading-spinner').style.display = 'none';
            document.getElementById('compress-btn').style.display = 'block';
        });
}

function showCompressResult(objectURL, originalFilename) {
    const resultContainer = document.getElementById('result-container');

    const baseName = originalFilename.substring(0, originalFilename.lastIndexOf('.')) || originalFilename;
    const filename = `${baseName}_compressed.${originalFilename.split('.').pop()}`;

    resultContainer.innerHTML = `
        <img src="${objectURL}" alt="Compressed Preview" id="result-image" class="preview-image" style="display: block;">
        <a href="#" id="download-link" class="download-link" onclick="downloadCompressedImage('${filename}')">
            Download Compressed File
        </a>
        <button class="btn btn-sm btn-outline-secondary mt-3" onclick="resetCompressInterface()">Compress Another Image</button>
    `;
}

function downloadCompressedImage(filename) {
    if (compressedImageData) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(compressedImageData);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    return false;
}

function resetCompressInterface() {
    const fileInput = document.getElementById('file-input');
    fileInput.value = '';

    const preview = document.getElementById('preview');
    preview.src = '#';
    preview.style.display = 'none';

    document.getElementById('file-name-display').textContent = '';
    document.getElementById('file-label').textContent = 'Choose an image file';
    document.getElementById('remove-image').style.display = 'none';

    const resultContainer = document.getElementById('result-container');
    resultContainer.innerHTML = `
        <div class="text-muted" id="placeholder-content">
            <p>Your compressed image will appear here</p>
        </div>`;

    const successMessage = document.querySelector('.compression-success');
    if (successMessage) successMessage.remove();

    document.getElementById('compress-btn').disabled = false;
    document.getElementById('compress-btn').style.display = 'block';
    document.getElementById('loading-spinner').style.display = 'none';
}
