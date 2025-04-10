import io
import os
from flask import Flask, request, render_template, send_from_directory, send_file, Response
from PIL import Image
from werkzeug.utils import secure_filename

app = Flask(__name__)
ALLOWED_INPUT_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif', 'tif', 'svg', 'heic'}
ALLOWED_OUTPUT_FORMATS = {'png', 'jpg', 'jpeg', 'webp'}
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_INPUT_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/convert', methods=['GET', 'POST'])
def convert():
    if request.method == 'POST':
        file = request.files.get('image')
        output_format = request.form.get('format')
        
        # Check for AJAX request (wants direct download)
        is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'

        if file and allowed_file(file.filename) and output_format in ALLOWED_OUTPUT_FORMATS:
            original_filename = secure_filename(file.filename)
            new_filename = os.path.splitext(original_filename)[0] + f'.{output_format}'
            
            # Process image in memory
            image = Image.open(file).convert("RGB")  # Ensures compatibility
            
            # Prepare in-memory file
            img_io = io.BytesIO()
            format_map = {'jpg': 'JPEG', 'jpeg': 'JPEG', 'png': 'PNG', 'webp': 'WEBP'}
            image.save(img_io, format=format_map.get(output_format.lower(), output_format.upper()), quality=95)
            img_io.seek(0)
            
            # If it's an AJAX request, respond with a direct download
            if is_ajax:
                return send_file(
                    img_io,
                    mimetype=f'image/{output_format}',
                    as_attachment=True,
                    download_name=new_filename
                )
            
            # For traditional form submit, render the template with the processed file
            return render_template(
                'convert-image.html',
                conversion_success=True,
                filename=new_filename,
                mime_type=f'image/{output_format}'
            )

    # Default rendering for GET or invalid POST
    return render_template('convert-image.html')

@app.errorhandler(413)
def request_entity_too_large(error):
    return render_template('convert-image.html', error="File too large (max 10MB)"), 413

@app.errorhandler(404)
def page_not_found(error):
    return render_template('404.html'), 404

if __name__ == '__main__':
    app.run(debug=True)