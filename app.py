import io
import os
from flask import Flask, request, render_template, send_from_directory, send_file, Response
from PIL import Image
from werkzeug.utils import secure_filename
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_wtf.csrf import CSRFProtect
from flask_wtf.csrf import generate_csrf
from flask import make_response
from flask_cors import CORS


app = Flask(__name__)
csrf = CSRFProtect(app)
csrf.init_app(app)

app.config['WTF_CSRF_TIME_LIMIT'] = None
app.config['WTF_CSRF_METHODS'] = ['POST', 'PUT', 'PATCH', 'DELETE']
app.config['WTF_CSRF_HEADERS'] = ['X-CSRFToken']

app.config['SECRET_KEY'] = "shouldprobalychangethislater"

# Flask backend
CORS(app, supports_credentials=True, origins=["https://imgx-pearl.vercel.app/"])


ALLOWED_INPUT_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif', 'tif', 'svg', 'heic'}
ALLOWED_OUTPUT_FORMATS = {'png', 'jpg', 'jpeg', 'webp'}
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB

# rate limiter
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["2000 per day", "500 per hour"],
    storage_uri="memory://",
)



def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_INPUT_EXTENSIONS



@app.route('/get-csrf-token', methods=['GET'])
def get_csrf_token():
    response = make_response('', 204)
    # Set the CSRF token in the cookie
    response.set_cookie('csrf_token', generate_csrf())
    return response


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/convert', methods=['GET', 'POST'])
@limiter.limit("5/minute", override_defaults=False, methods=['POST'])
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

@app.route("/compress", methods=['GET', 'POST'])
@limiter.limit("5/minute", override_defaults=False, methods=['POST'])
def compress():
    if request.method == 'POST':
        file = request.files.get('image')
        quality = request.form.get('quality')

        is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'

        if file and allowed_file(file.filename):
            try:
                quality = int(quality)
                quality = max(1, min(quality, 100))  # Clamp between 1 and 100
            except (ValueError, TypeError):
                quality = 75  # Default fallback quality

            original_filename = secure_filename(file.filename)
            output_format = os.path.splitext(original_filename)[1][1:].lower()  # Extract format from filename
            new_filename = os.path.splitext(original_filename)[0] + f'_compressed.{output_format}'

            image = Image.open(file).convert("RGB")  # Normalize for consistent compression
            img_io = io.BytesIO()

            format_map = {'jpg': 'JPEG', 'jpeg': 'JPEG', 'png': 'PNG', 'webp': 'WEBP'}
            image.save(img_io, format=format_map.get(output_format, output_format.upper()), quality=quality, optimize=True)
            img_io.seek(0)

            if is_ajax:
                return send_file(
                    img_io,
                    mimetype=f'image/{output_format}',
                    as_attachment=True,
                    download_name=new_filename
                )

            return render_template(
                'compress-image.html',
                compression_success=True,
                filename=new_filename,
                mime_type=f'image/{output_format}'
            )

    # Default rendering for GET or invalid POST
    return render_template('compress-image.html')


@app.errorhandler(413)
def request_entity_too_large(error):
    return render_template('convert-image.html', error="File too large (max 10MB)"), 413

@app.errorhandler(404)
def page_not_found(error):
    return render_template('404.html'), 404

@app.errorhandler(429)
def too_many_requests(error):
    return render_template('429.html'), 429

if __name__ == '__main__':
    app.run(debug=True)