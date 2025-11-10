"""
Preload NLP models into the project for offline / reproducible use.

What this script does:
- downloads the sentence-transformers model 'all-MiniLM-L6-v2' and saves it under
  backend/../models/sentence_transformers/all-MiniLM-L6-v2
- downloads the spaCy model 'en_core_web_sm' into the environment and copies the
  installed package into backend/../models/spacy/en_core_web_sm so the project can
  load it from a local path.

Usage (after installing requirements):
    python backend\scripts\preload_models.py

Note: spaCy model is installed into the Python environment (spacy.cli.download).
This script then copies the package files into the project `models/` folder so
`backend/nlp.py` can load it from there (no network required at runtime).
"""
import os
import shutil
import logging

try:
    from sentence_transformers import SentenceTransformer
except Exception as e:
    raise SystemExit('sentence-transformers is required. Please install requirements: %s' % e)

import subprocess
import sys


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MODELS_DIR = os.path.join(ROOT, 'models')


def ensure_dir(path):
    if not os.path.isdir(path):
        os.makedirs(path, exist_ok=True)


def download_sentence_transformer(model_name='all-MiniLM-L6-v2'):
    print('Downloading sentence-transformers model:', model_name)
    local_path = os.path.join(MODELS_DIR, 'sentence_transformers', model_name)
    ensure_dir(os.path.dirname(local_path))
    # This will download model weights (from HF) to cache and load them; then we save locally
    model = SentenceTransformer(model_name)
    print('Saving model to', local_path)
    model.save(local_path)
    print('Sentence-transformer saved.')


def download_spacy_model(model_name='en_core_web_sm'):
    print('Downloading spaCy model:', model_name)
    # Use the environment's python to invoke spaCy download so we avoid importing spacy
    try:
        subprocess.check_call([sys.executable, '-m', 'spacy', 'download', model_name])
    except Exception as e:
        print('Warning: spaCy download failed:', e)
        return
    # Try to locate the installed package by running a small python snippet that imports the package
    try:
        # This prints the package __file__ path which we can copy
        cmd = [sys.executable, '-c', f"import importlib; m=importlib.import_module('{model_name}'); print(m.__file__)" ]
        out = subprocess.check_output(cmd, universal_newlines=True).strip()
        pkg_file = out
        pkg_path = os.path.dirname(pkg_file)
        target = os.path.join(MODELS_DIR, 'spacy', model_name)
        if os.path.isdir(target):
            print('spaCy model already copied to', target)
            return
        print('Copying spaCy package files from', pkg_path, 'to', target)
        ensure_dir(os.path.dirname(target))
        shutil.copytree(pkg_path, target)
        print('spaCy model copied to', target)
    except Exception as e:
        print('Warning: failed to locate or copy spaCy package into models/:', e)
        print('spaCy model is still installed in the environment and can be loaded by name.')


def main():
    ensure_dir(MODELS_DIR)
    download_sentence_transformer()
    download_spacy_model()
    print('\nDone. Models are available under:')
    print('  -', os.path.join(MODELS_DIR, 'sentence_transformers'))
    print('  -', os.path.join(MODELS_DIR, 'spacy'))
    print('\nYou can now set MODEL_DIR to the project "models/" folder or let backend/nlp.py')
    print('use the default MODEL_DIR to load models locally.')


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    main()
