import sqlite3
import os
import shutil

# Determine database path
# Vercel deployment has a read-only filesystem except for /tmp.
# Note: SQLite database is ephemeral on Vercel and resets when instances recycle.
IS_VERCEL = os.environ.get('VERCEL') == '1' or os.environ.get('VERCEL_ENV') is not None

if IS_VERCEL:
    DATABASE_PATH = '/tmp/notes.db'
    # Copy pre-existing notes.db to /tmp if it doesn't exist there yet to preserve any existing notes
    repo_db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'notes.db')
    if os.path.exists(repo_db_path) and not os.path.exists(DATABASE_PATH):
        try:
            shutil.copy2(repo_db_path, DATABASE_PATH)
        except Exception as e:
            # Fallback to normal execution if copy fails
            pass
else:
    DATABASE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'notes.db')

def get_db_connection(db_path=DATABASE_PATH):
    """Establishes a connection to the SQLite database with row factory enabled."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db(db_path=DATABASE_PATH):
    """Initializes the SQLite database and creates the notes table if it doesn't exist."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            original_text TEXT NOT NULL,
            summary TEXT NOT NULL,
            key_points TEXT NOT NULL,
            structured_notes TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def save_note(title, original_text, summary, key_points, structured_notes, db_path=DATABASE_PATH):
    """Saves a generated note to the database and returns the new note's ID."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO notes (title, original_text, summary, key_points, structured_notes)
        VALUES (?, ?, ?, ?, ?)
    ''', (title, original_text, summary, key_points, structured_notes))
    conn.commit()
    note_id = cursor.lastrowid
    conn.close()
    return note_id

def get_all_notes(db_path=DATABASE_PATH):
    """Retrieves all saved notes from the database, ordered by creation date (newest first)."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute('SELECT id, title, summary, created_at FROM notes ORDER BY created_at DESC')
    rows = cursor.fetchall()
    conn.close()
    
    notes = []
    for row in rows:
        notes.append({
            'id': row['id'],
            'title': row['title'],
            'summary': row['summary'],
            'created_at': row['created_at']
        })
    return notes

def get_note_by_id(note_id, db_path=DATABASE_PATH):
    """Retrieves a single detailed note by its database ID."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM notes WHERE id = ?', (note_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row is None:
        return None
        
    return {
        'id': row['id'],
        'title': row['title'],
        'original_text': row['original_text'],
        'summary': row['summary'],
        'key_points': row['key_points'],
        'structured_notes': row['structured_notes'],
        'created_at': row['created_at']
    }

def delete_note(note_id, db_path=DATABASE_PATH):
    """Deletes a note from the database by its ID."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM notes WHERE id = ?', (note_id,))
    conn.commit()
    deleted_rows = cursor.rowcount
    conn.close()
    return deleted_rows > 0
