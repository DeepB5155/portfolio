export function initNav() {
  const nav = document.getElementById('nav');
  const hamburger = document.getElementById('nav-hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  const mLinks = mobileMenu?.querySelectorAll('.m-link');
  const navLinks = document.querySelectorAll('.nav-link');

  // Scroll glass effect
  window.addEventListener('scroll', () => {
    nav?.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  // Hamburger toggle
  const setMenu = (open) => {
    hamburger?.classList.toggle('open', open);
    hamburger?.setAttribute('aria-expanded', String(open));
    hamburger?.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    mobileMenu?.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };

  hamburger?.addEventListener('click', () => setMenu(!hamburger.classList.contains('open')));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && hamburger?.classList.contains('open')) setMenu(false);
  });

  // Close on mobile link click
  mLinks?.forEach(link => {
    link.addEventListener('click', () => setMenu(false));
  });

  // Active section highlighting
  const sections = document.querySelectorAll('section[id]');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === `#${entry.target.id}`));
      }
    });
  }, { threshold: 0.4 });
  sections.forEach(s => observer.observe(s));

  // Smooth scroll
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); }
    });
  });
}
