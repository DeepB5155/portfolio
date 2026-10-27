import { projectsData } from './projects-data.js';
import { processData } from './process-data.js';
import { galleryHtml, bindGallery, isLightboxOpen } from './lightbox.js';

export function initModals() {
  const cards = document.querySelectorAll('.project-card');
  const processSteps = document.querySelectorAll('.process-step');
  const backdrop = document.getElementById('project-modal');
  const closeBtn = document.querySelector('.modal-close');
  const modalBody = document.getElementById('modal-body');
  const modalContent = document.querySelector('.modal-content');

  if (!backdrop || !modalBody) return;

  let lastFocus = null;

  // Open Modal (Generic function)
  const openModalWithData = (data) => {
    lastFocus = document.activeElement;
    populateModal(data, modalBody);
    document.body.style.overflow = 'hidden';
    backdrop.classList.add('is-active');
    
    gsap.fromTo(backdrop, 
      { opacity: 0 }, 
      { opacity: 1, duration: 0.4, ease: 'power2.out' }
    );
    gsap.fromTo(modalContent, 
      { opacity: 0, scale: 0.95, y: 20 }, 
      { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'power3.out', delay: 0.1,
        onComplete: () => closeBtn.focus({ preventScroll: true }) }
    );
  };

  // Projects Listener
  cards.forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      const projectId = card.getAttribute('data-project-id');
      if (projectId && projectsData[projectId]) {
        openModalWithData(projectsData[projectId]);
      }
    });
  });

  // Opened from other modules (e.g. the 3D Project Universe)
  window.addEventListener('open-project', (e) => {
    if (e.detail) openModalWithData(e.detail);
  });

  // Process Steps Listener (keyboard accessible)
  processSteps.forEach(step => {
    step.setAttribute('role', 'button');
    step.setAttribute('tabindex', '0');
    step.setAttribute('aria-haspopup', 'dialog');

    const open = () => {
      const processId = step.getAttribute('data-process-id');
      if (processId && processData[processId]) {
        openModalWithData(processData[processId]);
      }
    };
    step.addEventListener('click', open);
    step.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });
  });

  // Close Modal
  const closeModal = () => {
    gsap.to(modalContent, { opacity: 0, scale: 0.95, y: 20, duration: 0.3, ease: 'power2.in' });
    gsap.to(backdrop, { 
      opacity: 0, 
      duration: 0.4, 
      ease: 'power2.in',
      onComplete: () => {
        backdrop.classList.remove('is-active');
        document.body.style.overflow = ''; // Restore body scroll
        modalBody.innerHTML = ''; // Clear content
        if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
      }
    });
  };

  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (!backdrop.classList.contains('is-active') || isLightboxOpen()) return;

    if (e.key === 'Escape') {
      closeModal();
    } else if (e.key === 'Tab') {
      const focusable = [...modalContent.querySelectorAll('a[href], button:not([disabled])')];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function safeUrl(url) {
  return /^https?:\/\//i.test(url) ? esc(url) : '#';
}

function populateModal(data, container) {
  const tagsHtml = data.techStack.map(tech => `<span class="tag">${esc(tech)}</span>`).join('');
  const featuresHtml = data.features.map(f => `
    <div class="feature-item">
      <div class="feature-title">${esc(f.title)}</div>
      <div class="feature-desc">${esc(f.desc)}</div>
    </div>
  `).join('');

  const linksHtml = [];
  if (data.github) {
    linksHtml.push(`<a href="${safeUrl(data.github)}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost" style="padding: 0.5rem 1rem;">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
      GitHub Repo
    </a>`);
  }
  if (data.live) {
    linksHtml.push(`<a href="${safeUrl(data.live)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="padding: 0.5rem 1rem;">
      Live Demo
    </a>`);
  }

  container.innerHTML = `
    <div class="modal-tagline">${esc(data.tagline)}</div>
    <h2 class="modal-title" id="modal-title-text">${esc(data.title)}</h2>
    <p class="modal-overview">${esc(data.overview)}</p>

    ${galleryHtml(data.images)}

    ${data.features.length > 0 ? `
    <div class="modal-section-title">Core Features</div>
    <div class="modal-features">
      ${featuresHtml}
    </div>` : ''}

    <div class="modal-section-title">Technology Stack</div>
    <div class="modal-tech-list">
      ${tagsHtml}
    </div>

    ${linksHtml.length > 0 ? `<div class="modal-actions">${linksHtml.join('')}</div>` : ''}
  `;

  if (data.images) bindGallery(container, data.images);
}
