
const allowedFormats = ["png", "jpg", "jpeg", "webp"];
let convertedImageData = null;

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('uploadForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('remove-image').addEventListener('click', resetInterface);
});

function handleFileChange(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('preview');
    const formatSelect = document.getElementById('format');
    const fileLabel = document.getElementById('file-label');
    const fileNameDisplay = document.getElementById('file-name-display');
    const removeButton = document.getElementById('remove-image');
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!file) return;

    // Check file size
    if (file.size > maxSize) {
        // Display warning
        fileLabel.textContent = "Choose an image file";
        fileNameDisplay.innerHTML = `
            <div class="file-size-warning exceeded">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right: 4px;">
                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                    <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                </svg>
                File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 10MB limit.
            </div>`;
        
        // Clear the file input
        event.target.value = '';
        
        // Hide preview if it was shown
        preview.style.display = 'none';
        removeButton.style.display = 'none';
        
        // Reset select box
        formatSelect.innerHTML = '<option value="" disabled selected>Select format</option>';
        
        return;
    }

    // Update the file name display
    fileLabel.textContent = "Change image file";
    // Show file name with size
    fileNameDisplay.innerHTML = `
        ${file.name}
        <div class="file-size-warning">
            File size: ${(file.size / (1024 * 1024)).toFixed(2)} MB
        </div>`;
    
    // Preview
    const reader = new FileReader();
    reader.onload = function(e) {
        preview.src = e.target.result;
        preview.style.display = 'block';
        removeButton.style.display = 'flex'; // Show the remove button
    };
    reader.readAsDataURL(file);

    // Get file extension
    const ext = file.name.split('.').pop().toLowerCase();

    // Build conversion options
    formatSelect.innerHTML = '<option value="" disabled selected>Select format</option>';
    allowedFormats
        .filter(fmt => fmt !== ext)
        .forEach(fmt => {
            const opt = document.createElement('option');
            opt.value = fmt;
            opt.textContent = fmt.toUpperCase();
            formatSelect.appendChild(opt);
        });
        
    // Always show the result column
    document.getElementById('result-column').classList.remove('d-none');
}

function resetInterface() {
    // Reset the file input
    const fileInput = document.getElementById('file-input');
    fileInput.value = '';
    
    // Reset preview
    const preview = document.getElementById('preview');
    preview.style.display = 'none';
    preview.src = '#';
    
    // Reset file name
    document.getElementById('file-name-display').textContent = '';
    document.getElementById('file-label').textContent = 'Choose an image file';
    
    // Hide the remove button
    document.getElementById('remove-image').style.display = 'none';
    
    // Reset select box
    const formatSelect = document.getElementById('format');
    formatSelect.innerHTML = '<option value="" disabled selected>Select format</option>';
    
    // Reset the result container
    const resultContainer = document.getElementById('result-container');
    resultContainer.innerHTML = `
        <div class="text-muted" id="placeholder-content">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" viewBox="0 0 16 16" class="mb-3 opacity-25">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
            </svg>
            <p>Your converted image will appear here</p>
        </div>
    `;
    
    // Reset any success message
    const successMessage = document.querySelector('.conversion-success');
    if (successMessage) {
        successMessage.remove();
    }
    
    // Enable the convert button
    document.getElementById('convert-btn').disabled = false;
    document.getElementById('convert-btn').style.display = 'block';
    document.getElementById('loading-spinner').style.display = 'none';
}

function handleFormSubmit(event) {
    event.preventDefault();
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');


    // Check file size again before submission
    const file = document.getElementById('file-input').files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (file && file.size > maxSize) {
        alert('File size exceeds the 10MB limit. Please choose a smaller file.');
        return;
    }
    
    const fileInput = document.getElementById('file-input');
    const formatSelect = document.getElementById('format');
    
    // Validate inputs
    if (!fileInput.files.length || !formatSelect.value) {
        alert('Please select both an image and output format');
        return;
    }
    
    // Show loading state
    document.getElementById('convert-btn').style.display = 'none';
    document.getElementById('loading-spinner').style.display = 'block';
    
    // Create FormData from the form
    const formData = new FormData();
    formData.append('image', fileInput.files[0]);
    formData.append('format', formatSelect.value);
    
    // Send AJAX request
    fetch('/convert', {
        method: 'POST',
        credentials: 'include',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': csrfToken
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.blob();
    })
    .then(blob => {
        // Create URL for the blob
        const objectURL = URL.createObjectURL(blob);
        convertedImageData = blob;
        
        // Update the result view
        showConversionResult(objectURL, formatSelect.value);
        
        // Hide loading state
        document.getElementById('loading-spinner').style.display = 'none';
        
        // Add success message
        const form = document.getElementById('uploadForm');
        const successMsg = document.createElement('div');
        successMsg.className = 'conversion-success text-center mt-3';
        successMsg.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16" style="margin-right: 5px;">
                <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
            </svg>
            Image converted successfully!
        `;
        form.appendChild(successMsg);
    })
    .catch(error => {
        console.error('Error during conversion:', error);
        document.getElementById('convert-btn').style.display = 'block';
        document.getElementById('loading-spinner').style.display = 'none';
        alert('Error converting image. Please try again.');
    });
}

function showConversionResult(objectURL, format) {
    const resultContainer = document.getElementById('result-container');
    
    // Generate a filename based on the original filename and format
    const originalFilename = document.getElementById('file-input').files[0].name;
    const baseName = originalFilename.substring(0, originalFilename.lastIndexOf('.')) || originalFilename;
    const filename = `${baseName}.${format}`;
    
    resultContainer.innerHTML = `
        <img src="${objectURL}" alt="Converted Preview" id="result-image" class="preview-image" style="display: block;">
        <a href="#" id="download-link" class="download-link" onclick="downloadConvertedImage('${filename}', 'image/${format}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right: 6px;">
                <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
            </svg>
            Download Converted File
        </a>
        <button class="btn btn-sm btn-outline-secondary mt-3" onclick="resetInterface()">Convert Another Image</button>
    `;
}

function downloadConvertedImage(filename, mimeType) {
    if (convertedImageData) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(convertedImageData);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    return false;
}