// auth.js - handles signup and login form submissions
document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signup-form');
  const loginForm = document.getElementById('login-form');

  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = signupForm.querySelector('#name').value.trim();
      const email = signupForm.querySelector('#email').value.trim();
      const password = signupForm.querySelector('#password').value;
      const msg = document.getElementById('signup-message');
      msg.textContent = '';

      fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      })
      .then(r => r.json().then(payload => ({ ok: r.ok, payload })))
      .then(({ ok, payload }) => {
        if (!ok) throw payload;
        msg.textContent = 'Account created. You can now log in.';
        msg.className = 'auth-message success';
        setTimeout(() => { window.location = '/login'; }, 900);
      })
      .catch(err => {
        msg.textContent = err.error || 'Failed to create account';
        msg.className = 'auth-message error';
      });
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = loginForm.querySelector('#email').value.trim();
      const password = loginForm.querySelector('#password').value;
      const msg = document.getElementById('login-message');
      msg.textContent = '';

      fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      .then(r => r.json().then(payload => ({ ok: r.ok, payload })))
      .then(({ ok, payload }) => {
        if (!ok) throw payload;
        msg.textContent = 'Login successful';
        msg.className = 'auth-message success';
        // Use the redirect URL from the server response
        setTimeout(() => { 
          window.location = payload.redirect || '/';
        }, 600);
      })
      .catch(err => {
        msg.textContent = err.error || 'Invalid credentials';
        msg.className = 'auth-message error';
      });
    });
  }
});
