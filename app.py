

"""
Flask backend for AI Skill Matcher
Handles resume uploads, skill extraction, analysis, and real-time updates.
"""
import os
import re
import json
import sqlite3
import uuid
from datetime import datetime
from queue import Queue
from flask import Flask, request, jsonify, send_from_directory, Response, g, session, redirect, url_for, render_template
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
import PyPDF2
# Optional NLP module (provides improved skill extraction when installed)
import sys
# Ensure backend folder is on sys.path so we can import local nlp.py regardless of how the app is started
sys.path.insert(0, os.path.dirname(__file__))
try:
    import nlp as nlp_module
except Exception:
    nlp_module = None


app = Flask(
    __name__,
    template_folder='templates',
    static_folder='static',
    static_url_path='/static'
)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max upload
app.config['TEMPLATES_AUTO_RELOAD'] = True  # Enable template auto-reload
CORS(app)
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
# Minimal secret key for session cookies (override via SECRET_KEY env var in production)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-key')


# DB and SSE setup
DB_PATH = os.path.join(os.path.dirname(__file__), 'data.db')
subscribers = []


def get_db():
    """Get a database connection for the current request context."""
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DB_PATH)
        db.row_factory = sqlite3.Row
    return db


def init_db():
    """Initialize the resumes table if it does not exist."""
    db = get_db()
    db.execute('''CREATE TABLE IF NOT EXISTS resumes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        extracted_text TEXT,
        extracted_skills TEXT,
        created_at TEXT NOT NULL
    )''')
    # Users table for simple auth (email + password hash)
    db.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
    )''')
    db.commit()


@app.teardown_appcontext
def close_connection(exception):
    """Close the database connection at the end of the request."""
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

# Simple skill lists
TECH_SKILLS = ["Python", "JavaScript", "Java", "C++", "React", "Node.js", "SQL", "MongoDB", "AWS", "Docker", "Kubernetes", "Git", "DevOps", "Agile", "Scrum"]
SOFT_SKILLS = ["Leadership", "Communication", "Teamwork", "Problem Solving", "Critical Thinking", "Adaptability", "Time Management", "Project Management", "Creativity", "Analytical Thinking"]


def extract_text(file_path):
    """Extract text from a PDF or TXT file."""
    if file_path.lower().endswith('.pdf'):
        try:
            with open(file_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                return "\n".join([page.extract_text() or "" for page in reader.pages])
        except Exception as e:
            print(f"Error extracting PDF text: {e}")
            return ""
    elif file_path.lower().endswith('.txt'):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            print(f"Error reading TXT file: {e}")
            return ""
    return ""


def extract_skills(text):
    """Extract technical skills, soft skills, and certifications from text."""
    text_lower = text.lower()
    tech = [skill for skill in TECH_SKILLS if skill.lower() in text_lower]
    soft = [skill for skill in SOFT_SKILLS if skill.lower() in text_lower]
    certs = re.findall(r"certified in ([\w\s]+)|([\w\s]+) certification|([\w\s]+) certified", text, re.IGNORECASE)
    certs_flat = [c.strip() for tup in certs for c in tup if c]
    return {"technical_skills": tech, "soft_skills": soft, "certifications": certs_flat}


def analyze_match(candidate_skills, job_skills):
    """Analyze skill match between candidate and job requirements."""
    candidate_set = set(s.lower() for s in candidate_skills)
    job_set = set(s.lower() for s in job_skills)
    matching = candidate_set & job_set
    missing = job_set - candidate_set
    additional = candidate_set - job_set
    percent = round(len(matching) / len(job_set) * 100, 2) if job_set else 0
    return {
        "match_percentage": percent,
        "matching_skills": list(matching),
        "missing_skills": list(missing),
        "additional_skills": list(additional)
    }


@app.route('/')
def index():
    """Serve the main frontend page."""
    # Require login before serving the main app
    if not session.get('user_id'):
        return redirect(url_for('login_page'))
    return render_template('index.html')


@app.route('/api/upload-resume', methods=['POST'])
def upload_resume():
    """Handle resume file upload, extract skills, and store in DB."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    original_filename = secure_filename(file.filename)
    unique_prefix = uuid.uuid4().hex
    saved_filename = f"{unique_prefix}_{original_filename}"
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], saved_filename)
    try:
        file.save(file_path)
    except Exception as e:
        return jsonify({'error': f'Failed to save file: {e}'}), 500
    text = extract_text(file_path)
    # Prefer NLP module extraction when available
    if nlp_module:
        try:
            skills = nlp_module.extract_skills(text)
        except Exception as e:
            print('NLP extraction failed, falling back to simple extractor:', e)
            skills = extract_skills(text)
    else:
        skills = extract_skills(text)
    db = get_db()
    cur = db.cursor()
    created_at = datetime.utcnow().isoformat()
    cur.execute(
        'INSERT INTO resumes (filename, file_path, extracted_text, extracted_skills, created_at) VALUES (?, ?, ?, ?, ?)',
        (original_filename, file_path, text, json.dumps(skills), created_at)
    )
    db.commit()
    resume_id = cur.lastrowid
    # Notify SSE subscribers
    message = json.dumps({
        'type': 'resume_uploaded',
        'resume_id': resume_id,
        'filename': original_filename,
        'saved_filename': saved_filename
    })
    for q in list(subscribers):
        try:
            q.put(message)
        except Exception:
            pass
    return jsonify({
        'success': True,
        'resume_id': resume_id,
        'filename': original_filename,
        'saved_filename': saved_filename,
        'extracted_skills': skills,
        'text_preview': text[:500]
    })


@app.route('/api/analyze-match', methods=['POST'])
def api_analyze_match():
    """Analyze skill match between candidate and job skills."""
    data = request.get_json()
    candidate_skills = data.get('candidate_skills', [])
    job_skills = data.get('job_skills', [])
    result = analyze_match(candidate_skills, job_skills)
    return jsonify({'success': True, 'match_analysis': result})


@app.route('/api/resume/<int:resume_id>', methods=['GET'])
def get_resume(resume_id):
    """Get resume details by ID."""
    db = get_db()
    cur = db.cursor()
    cur.execute('SELECT * FROM resumes WHERE id = ?', (resume_id,))
    row = cur.fetchone()
    if not row:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({
        'id': row['id'],
        'filename': row['filename'],
        'extracted_text': row['extracted_text'],
        'extracted_skills': json.loads(row['extracted_skills']) if row['extracted_skills'] else {}
    })



@app.route('/api/resume/<int:resume_id>/analysis', methods=['GET'])
def analyze_resume(resume_id):
    """Return chart-ready metrics for a resume: skill gap values, salary estimates, and overall score."""
    db = get_db()
    cur = db.cursor()
    cur.execute('SELECT * FROM resumes WHERE id = ?', (resume_id,))
    row = cur.fetchone()
    if not row:
        return jsonify({'error': 'Not found'}), 404
    skills = json.loads(row['extracted_skills']) if row['extracted_skills'] else {}
    tech_skills = skills.get('technical_skills', [])
    soft_skills = skills.get('soft_skills', [])
    certs = skills.get('certifications', [])
    tech_count = len(tech_skills)
    soft_count = len(soft_skills)
    cert_count = len(certs)

    # If NLP module offers a scoring helper, use it for a more consistent score & breakdown
    score = None
    breakdown = None
    if nlp_module:
        try:
            score_info = nlp_module.compute_match_score({
                'technical_skills': tech_skills,
                'soft_skills': soft_skills,
                'certifications': certs
            })
            score = int(score_info.get('score', 0))
            breakdown = score_info.get('breakdown', None)
        except Exception as e:
            print('NLP scoring failed, falling back to simple heuristic:', e)

    if score is None:
        # legacy heuristic fallback
        score = min(99, 40 + tech_count * 8 + soft_count * 4 + cert_count * 6)
        breakdown = {
            'technical_pct': min(100, tech_count * 8),
            'soft_pct': min(100, soft_count * 6),
            'cert_pct': min(100, cert_count * 10)
        }

    competency_values = [
        breakdown.get('technical_pct', 0),
        breakdown.get('soft_pct', 0),
        breakdown.get('cert_pct', 0),
        score
    ]
    salary_mapping = {
        'python': 95000,
        'react': 85000,
        'machine_learning': 120000,
        'aws': 110000,
        'docker': 100000,
        'node.js': 90000,
        'javascript': 85000,
        'sql': 80000
    }
    salary_labels = []
    salary_values = []
    for s in tech_skills[:6]:
        key = s.lower().replace(' ', '_')
        val = salary_mapping.get(key)
        if val:
            salary_labels.append(s)
            salary_values.append(val)
    if not salary_labels:
        salary_labels = ['General']
        salary_values = [60000]
    result = {
        'resume_id': row['id'],
        'filename': row['filename'],
        'score': score,
        'match_score': score,
        'breakdown': breakdown,
        'skills': {
            'technical_skills': tech_skills,
            'soft_skills': soft_skills,
            'certifications': certs
        },
        'skill_gap': {
            'labels': ['Technical Skills', 'Soft Skills', 'Certifications', 'Overall Match'],
            'values': competency_values
        },
        'salary': {
            'labels': salary_labels,
            'values': salary_values
        }
    }
    return jsonify(result)



@app.route('/api/roadmap', methods=['GET'])
def get_roadmap():
    """Generate a simple career roadmap based on the latest resume or optional resume_id query param."""
    resume_id = request.args.get('resume_id', None)
    db = get_db()
    cur = db.cursor()
    if resume_id:
        cur.execute('SELECT * FROM resumes WHERE id = ?', (resume_id,))
        row = cur.fetchone()
    else:
        cur.execute('SELECT * FROM resumes ORDER BY id DESC LIMIT 1')
        row = cur.fetchone()
    if not row:
        roadmap = {
            'phases': [
                {'phase': 'Foundation', 'skills': ['Programming basics', 'Version control'], 'projects': ['Build a simple app']},
                {'phase': 'Intermediate', 'skills': ['Web development', 'APIs'], 'projects': ['Deploy a REST API']},
                {'phase': 'Advanced', 'skills': ['System design', 'Cloud'], 'projects': ['Design a scalable system']}
            ]
        }
        return jsonify(roadmap)
    skills = json.loads(row['extracted_skills']) if row['extracted_skills'] else {}
    tech = skills.get('technical_skills', [])
    phases = [
        {'phase': 'Foundation', 'skills': tech[:3] or ['Programming basics'], 'projects': ['Complete beginner projects']},
        {'phase': 'Intermediate', 'skills': tech[3:6] or ['Build full-stack app'], 'projects': ['Contribute to an open-source project']},
        {'phase': 'Advanced', 'skills': tech[6:10] or ['System design', 'Scaling'], 'projects': ['Design a production system']}
    ]
    roadmap = {'phases': phases}
    # notify SSE subscribers that roadmap updated
    msg = json.dumps({'type': 'roadmap_updated', 'resume_id': row['id']})
    for q in list(subscribers):
        try:
            q.put(msg)
        except Exception:
            pass
    return jsonify(roadmap)



@app.route('/api/interview-questions', methods=['GET'])
def get_interview_questions():
    """Return simple interview questions based on latest resume or resume_id param."""
    resume_id = request.args.get('resume_id', None)
    db = get_db()
    cur = db.cursor()
    if resume_id:
        cur.execute('SELECT * FROM resumes WHERE id = ?', (resume_id,))
        row = cur.fetchone()
    else:
        cur.execute('SELECT * FROM resumes ORDER BY id DESC LIMIT 1')
        row = cur.fetchone()
    base_questions = [
        {'category': 'Behavioral', 'difficulty': 'Medium', 'question': 'Tell me about a time you led a team project.'},
        {'category': 'Behavioral', 'difficulty': 'Easy', 'question': 'Describe a challenging problem you solved.'}
    ]
    if not row:
        return jsonify({'questions': base_questions})
    skills = json.loads(row['extracted_skills']) if row['extracted_skills'] else {}
    tech = skills.get('technical_skills', [])
    tech_questions = [
        {'category': 'Technical', 'difficulty': 'Hard', 'question': f'Explain how you would design a system that uses {s}.'}
        for s in tech[:5]
    ]
    questions = base_questions + tech_questions
    # emit SSE event for interview update
    msg = json.dumps({'type': 'interview_updated', 'resume_id': row['id']})
    for q in list(subscribers):
        try:
            q.put(msg)
        except Exception:
            pass
    return jsonify({'questions': questions})



@app.route('/api/resumes', methods=['GET'])
def list_resumes():
    """List all uploaded resumes with basic info."""
    db = get_db()
    cur = db.cursor()
    cur.execute('SELECT id, filename, created_at FROM resumes ORDER BY id DESC')
    rows = cur.fetchall()
    return jsonify({'resumes': [dict(r) for r in rows]})


# --- Simple auth pages and APIs ---
@app.route('/signup')
def signup_page():
    """Serve the signup page."""
    if session.get('user_id'):
        return redirect(url_for('index'))
    return render_template('signup.html')


@app.route('/login')
def login_page():
    """Serve the login page."""
    if session.get('user_id'):
        return redirect(url_for('index'))
    return render_template('login.html')


@app.route('/api/signup', methods=['POST'])
def api_signup():
    """Create a new user with email + password (hashed)."""
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    name = data.get('name') or ''
    if not email or not password:
        return jsonify({'error': 'email and password required'}), 400
    db = get_db()
    cur = db.cursor()
    cur.execute('SELECT id FROM users WHERE email = ?', (email,))
    if cur.fetchone():
        return jsonify({'error': 'User with that email already exists'}), 400
    pw_hash = generate_password_hash(password)
    created_at = datetime.utcnow().isoformat()
    cur.execute('INSERT INTO users (email, name, password_hash, created_at) VALUES (?, ?, ?, ?)',
                (email, name, pw_hash, created_at))
    db.commit()
    user_id = cur.lastrowid
    return jsonify({'success': True, 'user_id': user_id, 'email': email})


@app.route('/api/login', methods=['POST'])
def api_login():
    """Verify credentials and return a minimal payload on success."""
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    if not email or not password:
        return jsonify({'error': 'email and password required'}), 400
    db = get_db()
    cur = db.cursor()
    cur.execute('SELECT id, email, name, password_hash FROM users WHERE email = ?', (email,))
    row = cur.fetchone()
    if not row:
        return jsonify({'error': 'Invalid credentials'}), 400
    stored_hash = row['password_hash']
    if not check_password_hash(stored_hash, password):
        return jsonify({'error': 'Invalid credentials'}), 400
    # Set session
    session['user_id'] = row['id']
    session['user_email'] = row['email']
    session['user_name'] = row['name']
    return jsonify({
        'success': True, 
        'user': {'id': row['id'], 'email': row['email'], 'name': row['name']},
        'redirect': url_for('index')
    })


@app.route('/logout')
def logout():
    """Clear user session and redirect to login."""
    session.clear()
    return redirect(url_for('login_page'))



# Real-time updates via SSE (publish/subscribe)
@app.route('/stream')
def stream():
    """Server-Sent Events endpoint for real-time updates."""
    def gen():
        q = Queue()
        subscribers.append(q)
        try:
            while True:
                msg = q.get()
                yield f"data: {msg}\n\n"
        except GeneratorExit:
            pass
        finally:
            try:
                subscribers.remove(q)
            except ValueError:
                pass
    return Response(gen(), mimetype='text/event-stream')



@app.route('/api/resume/<int:resume_id>/download', methods=['GET'])
def download_resume(resume_id):
    """Download the stored resume file associated with resume_id."""
    db = get_db()
    cur = db.cursor()
    cur.execute('SELECT file_path, filename FROM resumes WHERE id = ?', (resume_id,))
    row = cur.fetchone()
    if not row:
        return jsonify({'error': 'Not found'}), 404
    file_path = row['file_path']
    original_filename = row['filename'] or None
    # Resolve relative paths relative to this file
    if not os.path.isabs(file_path):
        candidate = os.path.join(os.path.dirname(__file__), file_path)
        if os.path.exists(candidate):
            file_path = candidate
    if not os.path.exists(file_path):
        return jsonify({'error': 'File not found on server'}), 404
    directory = os.path.dirname(file_path)
    saved_name = os.path.basename(file_path)
    # Prefer download_name (Flask 2.x); fall back to attachment_filename for older versions
    try:
        return send_from_directory(directory, saved_name, as_attachment=True, download_name=original_filename or saved_name)
    except TypeError:
        return send_from_directory(directory, saved_name, as_attachment=True, attachment_filename=original_filename or saved_name)


if __name__ == '__main__':
    with app.app_context():
        init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)



# Ensure DB is ready before processing requests (one-time init)
_db_initialized = False

@app.before_request
def auth_check():
    """Check authentication for protected routes."""
    # List of routes that don't require authentication
    public_routes = [
        '/login',
        '/signup',
        '/api/login',
        '/api/signup'
    ]
    
    # Always allow access to static files
    if request.path.startswith('/static/'):
        return None
        
    # Check if the requested path is public
    if request.path not in public_routes:
        if not session.get('user_id'):
            if request.path.startswith('/api/'):
                return jsonify({'error': 'Not authenticated'}), 401
            return redirect(url_for('login_page'))

@app.before_request
def ensure_db_on_request():
    """Ensure the database is initialized."""
    global _db_initialized
    if not _db_initialized:
        init_db()
        _db_initialized = True

@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors by returning a JSON response."""
    return jsonify(error=str(e)), 404
