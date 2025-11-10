"""Smoke test script: create user, login, upload sample resume, fetch analysis."""
import requests
import time
import json

BASE = 'http://127.0.0.1:5000'

def main():
    s = requests.Session()
    # signup
    payload = {'email': 'smoketest+local@example.com', 'password': 'Pass1234', 'name': 'Smoke Tester'}
    r = s.post(BASE + '/api/signup', json=payload)
    print('signup:', r.status_code, r.text)
    # login
    r = s.post(BASE + '/api/login', json={'email': payload['email'], 'password': payload['password']})
    print('login:', r.status_code, r.text)
    time.sleep(1)
    # upload sample resume
    path = 'backend/sample_resume.txt'
    with open(path, 'rb') as fh:
        files = {'file': ('sample_resume.txt', fh, 'text/plain')}
        r = s.post(BASE + '/api/upload-resume', files=files)
    print('upload:', r.status_code, r.text)
    if r.status_code != 200:
        return
    data = r.json()
    resume_id = data.get('resume_id')
    if not resume_id:
        print('No resume id in upload response')
        return
    # fetch analysis
    r = s.get(f"{BASE}/api/resume/{resume_id}/analysis")
    print('analysis:', r.status_code)
    try:
        print(json.dumps(r.json(), indent=2))
    except Exception:
        print(r.text)

if __name__ == '__main__':
    main()
