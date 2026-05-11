export function initCursor() {
  if (window.matchMedia('(pointer: coarse)').matches) return; // skip touch
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;

  let mx = -100, my = -100, rx = -100, ry = -100;

  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });

  // Lerp ring
  function animate() {
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    dot.style.transform  = `translate(${mx - 3}px, ${my - 3}px)`;
    ring.style.transform = `translate(${rx - 18}px, ${ry - 18}px)`;
    requestAnimationFrame(animate);
  }
  animate();

  // Hover states
  const hoverEls = document.querySelectorAll('a, button, .project-card, .service-card');
  hoverEls.forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('hovering'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hovering'));
  });

  // Magnetic CTA
  document.querySelectorAll('.btn-primary').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${x * 0.15}px, ${y * 0.2}px) translateY(-2px)`;
    });
    btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
  });
}
