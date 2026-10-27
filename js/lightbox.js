const esc = (value) => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let root = null;
let state = { images: [], index: 0, trigger: null };

function build() {
  root = document.createElement('div');
  root.className = 'lightbox';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Screenshot viewer');
  root.innerHTML = `
    <button type="button" class="lightbox-btn lightbox-close" aria-label="Close viewer">&times;</button>
    <button type="button" class="lightbox-btn lightbox-prev" aria-label="Previous screenshot">&#8249;</button>
    <figure class="lightbox-figure">
      <img class="lightbox-img" alt=""/>
      <figcaption class="lightbox-caption"></figcaption>
    </figure>
    <button type="button" class="lightbox-btn lightbox-next" aria-label="Next screenshot">&#8250;</button>
  `;
  document.body.appendChild(root);

  root.addEventListener('click', (e) => {
    if (e.target === root) close();
  });
  root.querySelector('.lightbox-close').addEventListener('click', close);
  root.querySelector('.lightbox-prev').addEventListener('click', () => step(-1));
  root.querySelector('.lightbox-next').addEventListener('click', () => step(1));
}

function render() {
  const { src, alt } = state.images[state.index];
  const img = root.querySelector('.lightbox-img');
  img.src = src;
  img.alt = alt;
  root.querySelector('.lightbox-caption').textContent = `${alt} (${state.index + 1} / ${state.images.length})`;
  const single = state.images.length < 2;
  root.querySelector('.lightbox-prev').hidden = single;
  root.querySelector('.lightbox-next').hidden = single;
}

function step(delta) {
  const n = state.images.length;
  state.index = (state.index + delta + n) % n;
  render();
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.stopImmediatePropagation();
    close();
  } else if (e.key === 'ArrowLeft') {
    step(-1);
  } else if (e.key === 'ArrowRight') {
    step(1);
  } else if (e.key === 'Tab') {
    const focusable = [...root.querySelectorAll('button:not([hidden])')];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

export function isLightboxOpen() {
  return !!root && root.classList.contains('is-open');
}

export function openLightbox(images, index = 0, trigger = null) {
  if (!images || images.length === 0) return;
  if (!root) build();
  state = { images, index, trigger };
  render();
  root.classList.add('is-open');
  document.addEventListener('keydown', onKeydown, true);
  root.querySelector('.lightbox-close').focus();
}

function close() {
  if (!isLightboxOpen()) return;
  root.classList.remove('is-open');
  document.removeEventListener('keydown', onKeydown, true);
  if (state.trigger && document.contains(state.trigger)) state.trigger.focus();
}

export function galleryHtml(images) {
  if (!images || images.length === 0) return '';
  const thumbs = images.map((img, i) => `
    <button type="button" class="gallery-thumb" data-index="${i}" aria-label="Open screenshot ${i + 1} of ${images.length}">
      <img src="${esc(img.src)}" alt="${esc(img.alt)}" loading="lazy" decoding="async"/>
    </button>`).join('');
  return `
    <div class="modal-section-title">Screenshots</div>
    <div class="modal-gallery">${thumbs}</div>`;
}

export function bindGallery(container, images) {
  container.querySelectorAll('.gallery-thumb').forEach(btn => {
    btn.addEventListener('click', () => openLightbox(images, Number(btn.dataset.index), btn));
  });
}
