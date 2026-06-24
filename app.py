import os
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv

import database
import nlp_engine

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app)  # Enable CORS for all routes (useful for development)

# Initialize database table on startup
database.init_db()

@app.route('/')
def index():
    """Serves the main single-page application."""
    return render_template('index.html')

@app.route('/api/status', methods=['GET'])
def get_status():
    """Checks if the Gemini API key is configured on the backend."""
    api_key = os.getenv('GEMINI_API_KEY')
    return jsonify({
        'success': True,
        'gemini_active': bool(api_key and api_key.strip())
    })


@app.route('/api/generate', methods=['POST'])
def generate_notes():
    """
    API endpoint to generate study notes, summaries, and key points from text.
    Request body: { "content": "long text here", "title": "optional title" }
    """
    data = request.get_json() or {}
    content = data.get('content', '').strip()
    title = data.get('title', '').strip() or 'Untitled Study Material'
    
    if not content:
        return jsonify({
            'success': False,
            'message': 'Study content cannot be empty.'
        }), 400
        
    # Get Gemini API key from environment variables (optional)
    api_key = os.getenv('GEMINI_API_KEY')
    
    # Process text using the NLP engine
    try:
        results = nlp_engine.generate_study_materials(content, api_key)
        return jsonify({
            'success': True,
            'title': title,
            'original_text': content,
            'summary': results['summary'],
            'key_points': results['key_points'],
            'structured_notes': results['structured_notes']
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'An error occurred during note generation: {str(e)}'
        }), 500

@app.route('/api/notes', methods=['GET'])
def get_notes():
    """
    API endpoint to retrieve all saved notes (summary meta only).
    """
    try:
        notes = database.get_all_notes()
        return jsonify({
            'success': True,
            'notes': notes
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to retrieve notes: {str(e)}'
        }), 500

@app.route('/api/notes', methods=['POST'])
def save_note():
    """
    API endpoint to save a generated note to the database.
    Request body: { "title", "original_text", "summary", "key_points", "structured_notes" }
    """
    data = request.get_json() or {}
    title = data.get('title', '').strip() or 'Untitled Note'
    original_text = data.get('original_text', '').strip()
    summary = data.get('summary', '').strip()
    key_points = data.get('key_points', '').strip()
    structured_notes = data.get('structured_notes', '').strip()
    
    if not all([original_text, summary, key_points, structured_notes]):
        return jsonify({
            'success': False,
            'message': 'Missing required fields to save note.'
        }), 400
        
    try:
        note_id = database.save_note(title, original_text, summary, key_points, structured_notes)
        return jsonify({
            'success': True,
            'note_id': note_id,
            'message': 'Note saved successfully!'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to save note: {str(e)}'
        }), 500

@app.route('/api/notes/<int:note_id>', methods=['GET'])
def get_note(note_id):
    """
    API endpoint to retrieve a detailed note by its ID.
    """
    try:
        note = database.get_note_by_id(note_id)
        if note is None:
            return jsonify({
                'success': False,
                'message': 'Note not found.'
            }), 404
            
        return jsonify({
            'success': True,
            'note': note
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to fetch note: {str(e)}'
        }), 500

@app.route('/api/notes/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    """
    API endpoint to delete a note by its ID.
    """
    try:
        success = database.delete_note(note_id)
        if not success:
            return jsonify({
                'success': False,
                'message': 'Note not found or already deleted.'
            }), 404
            
        return jsonify({
            'success': True,
            'message': 'Note deleted successfully.'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to delete note: {str(e)}'
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    # Run server on all interfaces (useful for docker/external devices)
    app.run(host='0.0.0.0', port=port, debug=True)
