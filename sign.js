// script.js - Auth page interactions & simple three.js scene

// ---------- FORM TOGGLE & INTERACTIONS ----------
document.addEventListener('DOMContentLoaded', () => {
  const toggles = document.querySelectorAll('.toggle-btn');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');

  toggles.forEach(btn => {
    btn.addEventListener('click', () => {
      toggles.forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.target;
      if (target === 'login') {
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
      } else {
        signupForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
      }
      // set data-state for CSS if needed
      document.getElementById('authCard').setAttribute('data-state', target);
    });
  });

  // Password show/hide toggles
  document.querySelectorAll('.pw-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const targetId = toggle.dataset.target;
      const input = document.getElementById(targetId);
      if (!input) return;
      if (input.type === 'password') { input.type = 'text'; toggle.textContent = 'Hide'; }
      else { input.type = 'password'; toggle.textContent = 'Show'; }
    });
  });

  // Back button
  document.getElementById('backBtn').addEventListener('click', (e) => {
    e.preventDefault();
    window.history.back();
  });
});

