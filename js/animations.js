export function initAnimations() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  // Generic fade-up for section children
  document.querySelectorAll('.reveal').forEach(el => {
    gsap.fromTo(el, { opacity: 0, y: 40 }, {
      opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' }
    });
  });

  // Hero entrance (runs once on load)
  const heroItems = document.querySelectorAll('.hero-anim');
  gsap.fromTo(heroItems, { opacity: 0, y: 30 }, {
    opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.12, delay: 0.3
  });

  // Service cards stagger
  gsap.fromTo('.service-card', { opacity: 0, y: 50 }, {
    opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.1,
    scrollTrigger: { trigger: '#services', start: 'top 75%' }
  });

  // Process steps stagger
  gsap.fromTo('.process-step', { opacity: 0, y: 40 }, {
    opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.15,
    scrollTrigger: {
      trigger: '#process', start: 'top 70%',
      onEnter: () => {
        // Animate the connector line fill
        const fill = document.querySelector('.process-line-fill');
        if (fill) fill.style.width = '100%';
        // Light up step nodes precisely as the line hits them
        document.querySelectorAll('.step-node').forEach((n, i) => {
          setTimeout(() => n.classList.add('active'), 125 + (i * 250));
        });
      }
    }
  });

  // Project cards
  gsap.fromTo('.project-card', { opacity: 0, y: 60 }, {
    opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.12,
    scrollTrigger: { trigger: '#work', start: 'top 72%' }
  });

  // CTA section
  gsap.fromTo('#cta .cta-inner > *', { opacity: 0, y: 30 }, {
    opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.15,
    scrollTrigger: { trigger: '#cta', start: 'top 75%' }
  });

  // Contact
  gsap.fromTo('#contact .reveal', { opacity: 0, x: -30 }, {
    opacity: 1, x: 0, duration: 0.8, ease: 'power3.out', stagger: 0.1,
    scrollTrigger: { trigger: '#contact', start: 'top 75%' }
  });
}
