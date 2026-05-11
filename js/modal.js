import { projectsData } from './projects-data.js';
import { processData } from './process-data.js';

export function initModals() {
  const cards = document.querySelectorAll('.project-card');
  const processSteps = document.querySelectorAll('.process-step');
  const backdrop = document.getElementById('project-modal');
  const closeBtn = document.querySelector('.modal-close');
  const modalBody = document.getElementById('modal-body');
  const modalContent = document.querySelector('.modal-content');

  if (!backdrop || !modalBody) return;

  // Open Modal (Generic function)
  const openModalWithData = (data) => {
    populateModal(data, modalBody);
    document.body.style.overflow = 'hidden';
    backdrop.classList.add('is-active');
    
    gsap.fromTo(backdrop, 
      { opacity: 0 }, 
      { opacity: 1, duration: 0.4, ease: 'power2.out' }
    );
    gsap.fromTo(modalContent, 
      { opacity: 0, scale: 0.95, y: 20 }, 
      { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'power3.out', delay: 0.1 }
    );
  };

  // Projects Listener
  cards.forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const projectId = card.getAttribute('data-project-id');
      if (projectId && projectsData[projectId]) {
        openModalWithData(projectsData[projectId]);
      }
    });
  });

  // Process Steps Listener
  processSteps.forEach(step => {
    step.addEventListener('click', (e) => {
      const processId = step.getAttribute('data-process-id');
      if (processId && processData[processId]) {
        openModalWithData(processData[processId]);
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
      }
    });
  };

  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && backdrop.classList.contains('is-active')) {
      closeModal();
    }
  });
}

function populateModal(data, container) {
  const tagsHtml = data.techStack.map(tech => `<span class="tag">${tech}</span>`).join('');
  const featuresHtml = data.features.map(f => `
    <div class="feature-item">
      <div class="feature-title">${f.title}</div>
      <div class="feature-desc">${f.desc}</div>
    </div>
  `).join('');

  const linksHtml = [];
  if (data.github) {
    linksHtml.push(`<a href="${data.github}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost" style="padding: 0.5rem 1rem;">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
      GitHub Repo
    </a>`);
  }
  if (data.live) {
    linksHtml.push(`<a href="${data.live}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="padding: 0.5rem 1rem;">
      Live Demo
    </a>`);
  }

  container.innerHTML = `
    <div class="modal-tagline">${data.tagline}</div>
    <h2 class="modal-title">${data.title}</h2>
    <p class="modal-overview">${data.overview}</p>

    <div class="modal-section-title">Core Features</div>
    <div class="modal-features">
      ${featuresHtml}
    </div>

    <div class="modal-section-title">Technology Stack</div>
    <div class="modal-tech-list">
      ${tagsHtml}
    </div>

    ${linksHtml.length > 0 ? `<div class="modal-actions">${linksHtml.join('')}</div>` : ''}
  `;
}
