import { initLoader }     from './loader.js';
import { initTheme }      from './theme.js';
import { initNav }        from './nav.js';
import { initThreeHero }  from './three-hero.js';
import { initAnimations } from './animations.js';
import { initCursor }     from './cursor.js';
import { initModals }     from './modal.js';
import { initContactForm } from './contact.js';

async function boot() {
  initTheme();
  initNav();
  initCursor();
  
  if (typeof gsap !== 'undefined') {
    gsap.set('.hero-anim', { opacity: 0, y: 30 });
  }

  await initLoader();
  initThreeHero();
  initAnimations();
  initModals();
  initContactForm();
  positionOrbitItems();
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
