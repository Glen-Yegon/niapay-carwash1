// script.js - JS for NIAPAY hero animations & small interactions

// Initialize AOS (Animate On Scroll)
AOS.init({
  duration: 900,
  easing: 'ease-out-cubic',
  once: true
});

// Small helper to split title text into span.letter elements for stagger animation
function splitAndAnimateTitle(selector) {
  const el = document.querySelector(selector);
  if (!el) return;
  const text = el.textContent.trim();
  el.innerHTML = ''; // clear
  const fragment = document.createDocumentFragment();

  // create spans for each character (preserve spaces)
  [...text].forEach((ch, i) => {
    const span = document.createElement('span');
    span.className = 'letter';
    span.textContent = ch;
    fragment.appendChild(span);
  });
  el.appendChild(fragment);

  // staggered animation using JS (CSS transitions)
  const letters = el.querySelectorAll('.letter');
  letters.forEach((lt, i) => {
    // use small delay per letter
    const delay = 60 * i; // ms
    setTimeout(() => {
      lt.style.transition = 'transform 520ms cubic-bezier(.2,.9,.2,1), opacity 520ms ease';
      lt.style.opacity = '1';
      lt.style.transform = 'translateY(0) rotateX(0deg) scale(1)';
    }, delay + 250); // initial delay before starting sequence
  });
}

// Call split + animate on DOM ready
document.addEventListener('DOMContentLoaded', function () {
  splitAndAnimateTitle('#niapay-title');

  // Menu placeholder: simple accessible toggle (we'll use later for actual menu)
  const menuBtn = document.getElementById('menu-btn');
  menuBtn.addEventListener('click', function () {
    const expanded = this.getAttribute('aria-expanded') === 'true';
    this.setAttribute('aria-expanded', (!expanded).toString());
    // placeholder UX: gentle pulse to indicate action (replace with real drawer later)
    this.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(0.98)' },
      { transform: 'scale(1)' }
    ], { duration: 300, easing: 'ease-in-out' });
    // You can replace the alert with actual mobile menu open code later
    // For now, no blocking modal/alert to keep demo smooth.
  });

  // CTA 'Start Experience' click — smooth demo behavior (placeholder)
  const cta = document.getElementById('cta-start');
  cta.addEventListener('click', function (e) {
    e.preventDefault();
    // scroll to hero content (just a visual nudge); replace with real onboarding later
    document.querySelector('.hero-content').scrollIntoView({ behavior: 'smooth', block: 'center' });
    // subtle pulse on CTA to show it's acknowledged
    this.animate([
      { transform: 'translateY(0)' },
      { transform: 'translateY(-6px)' },
      { transform: 'translateY(0)' }
    ], { duration: 420, easing: 'cubic-bezier(.2,.9,.2,1)' });
  });
});


// Simple newsletter form behavior
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".newsletter-form");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = form.querySelector("input").value;
    alert(`Thank you for subscribing, ${email}!`);
    form.reset();
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const footer = document.querySelector(".footer");
  footer.style.opacity = 0;
  footer.style.transform = "translateY(30px)";
  setTimeout(() => {
    footer.style.transition = "all 1s ease";
    footer.style.opacity = 1;
    footer.style.transform = "translateY(0)";
  }, 300);
});

