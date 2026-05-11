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
  hamburger?.addEventListener('click', () => {
    const open = hamburger.classList.toggle('open');
    mobileMenu?.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });

  // Close on mobile link click
  mLinks?.forEach(link => {
    link.addEventListener('click', () => {
      hamburger?.classList.remove('open');
      mobileMenu?.classList.remove('open');
      document.body.style.overflow = '';
    });
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
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
    });
  });
}
