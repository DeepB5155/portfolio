import { initLoader }     from './loader.js';
import { initTheme }      from './theme.js';
import { initNav }        from './nav.js';
import { initThreeHero }  from './three-hero.js';
import { initAnimations } from './animations.js';
import { initCursor }     from './cursor.js';
import { initModals }     from './modal.js';
import { initContactForm } from './contact.js';
import { initGithubProjects } from './github-projects.js';
import { initUniverse } from './universe.js';
import { initGame } from './fps-game.js';

// One broken feature (for example 3D on a device without WebGL) must never stop the rest of the site from starting
function safe(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.catch === 'function') result.catch(err => console.warn(`${name} failed`, err));
  } catch (err) {
    console.warn(`${name} failed`, err);
  }
}

async function boot() {
  safe('theme', initTheme);
  safe('nav', initNav);
  safe('cursor', initCursor);

  if (typeof gsap !== 'undefined') {
    gsap.set('.hero-anim', { opacity: 0, y: 30 });
  }

  try { await initLoader(); } catch (err) { console.warn('loader failed', err); }
  safe('hero 3D', initThreeHero);
  safe('animations', initAnimations);
  safe('modals', initModals);
  safe('contact form', initContactForm);
  safe('github projects', initGithubProjects);
  safe('project universe', initUniverse);
  safe('game', initGame);
  safe('orbit', positionOrbitItems);

  // If the entrance animation cannot run (no GSAP, no ScrollTrigger or reduced motion), make sure the hero content is still visible
  const noHeroAnim = typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (noHeroAnim) document.querySelectorAll('.hero-anim').forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });
}

function positionOrbitItems() {
  // Inner ring: 5 items
  const ring1Items = document.querySelectorAll('.orbit-ring-1 .orbit-item');
  ring1Items.forEach((el, i) => {
    const angle = (i / ring1Items.length) * 2 * Math.PI;
    const r = 125; // px from center
    el.style.marginLeft = `${Math.cos(angle) * r}px`;
    el.style.marginTop  = `${Math.sin(angle) * r}px`;
  });

  // Outer ring: 8 items
  const ring2Items = document.querySelectorAll('.orbit-ring-2 .orbit-item');
  ring2Items.forEach((el, i) => {
    const angle = (i / ring2Items.length) * 2 * Math.PI;
    const r = 215;
    el.style.marginLeft = `${Math.cos(angle) * r}px`;
    el.style.marginTop  = `${Math.sin(angle) * r}px`;
  });
}

document.addEventListener('DOMContentLoaded', boot);
