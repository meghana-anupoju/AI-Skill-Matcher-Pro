

import os
import nltk

def initialize_app():
    """
    Run initialization tasks for the Flask application.
    """
    upload_folder = os.path.join(os.path.dirname(__file__), '..', 'uploads')
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)

    # Download NLTK data if not present
    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        print("NLTK 'punkt' not found. Downloading...")
        nltk.download('punkt')
    try:
        nltk.data.find('corpora/stopwords')
    except LookupError:
        print("NLTK 'stopwords' not found. Downloading...")
        nltk.download('stopwords')

    print("Application initialization complete.")
