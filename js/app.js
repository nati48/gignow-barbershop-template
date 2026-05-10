/* ============================================
   APP.JS — General UI Logic
   ============================================ */

// ── Mobile Menu Toggle ──────────────────────
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

function closeMobileMenu() {
  if (!mobileMenu || !mobileMenuBtn) return;
  mobileMenu.classList.add('hidden');
  mobileMenuBtn.querySelector('i').className = 'fa-solid fa-bars text-2xl';
  // Remove blur from background
  document.querySelectorAll('body > *:not(nav):not(#booking-modal-overlay):not(#dashboard-overlay)').forEach(el => {
    el.style.filter = '';
  });
}

if (mobileMenuBtn && mobileMenu) {
  mobileMenuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
    const icon = mobileMenuBtn.querySelector('i');
    if (mobileMenu.classList.contains('hidden')) {
      icon.className = 'fa-solid fa-bars text-2xl';
      // Remove blur
      document.querySelectorAll('body > *:not(nav):not(#booking-modal-overlay):not(#dashboard-overlay)').forEach(el => {
        el.style.filter = '';
      });
    } else {
      icon.className = 'fa-solid fa-xmark text-2xl';
      // Add blur
      document.querySelectorAll('body > *:not(nav):not(#booking-modal-overlay):not(#dashboard-overlay)').forEach(el => {
        el.style.filter = 'blur(8px)';
        el.style.transition = 'filter 0.3s ease';
      });
    }
  });

  // Close menu on ANY click inside it (links AND buttons)
  mobileMenu.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('click', () => closeMobileMenu());
  });
}

// ── Navbar scroll effect ────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    navbar.classList.add('navbar-scrolled');
  } else {
    navbar.classList.remove('navbar-scrolled');
  }
});

// ── Smooth scroll for anchor links ──────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
