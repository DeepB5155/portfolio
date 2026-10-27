import { projectsData } from './projects-data.js';
import { loadGithubProjects } from './github-data.js';

const esc = (value) => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isHttp = (url) => /^https?:\/\//i.test(url || '');
const normalize = (url) => String(url || '').toLowerCase().replace(/\/+$/, '');

function formatDate(iso) {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleDateString('en', { month: 'short', year: 'numeric' });
}

function cardHtml(p) {
  const initial = esc((p.title || '?').charAt(0).toUpperCase());
  const cover = isHttp(p.cover)
    ? `<img src="${esc(p.cover)}" alt="${esc(p.title)} screenshot" loading="lazy" decoding="async"/>`
    : initial;
  const tags = [...(p.languages || []).slice(0, 3), ...(p.topics || []).slice(0, 2)]
    .map(t => `<span class="tag tag-neutral">${esc(t)}</span>`).join('');
  const live = isHttp(p.live)
    ? `<a href="${esc(p.live)}" target="_blank" rel="noopener noreferrer">Live</a>` : '';
  const stars = p.stars > 0 ? `★ ${esc(p.stars)} · ` : '';

  return `
    <article class="more-card glass-card" data-langs="${esc((p.languages || []).join('|'))}">
      <div class="more-cover" aria-hidden="${isHttp(p.cover) ? 'false' : 'true'}">${cover}</div>
      <div class="more-body">
        <h4 class="more-title">${esc(p.title)}</h4>
        <p class="more-desc">${esc(p.description || 'No description yet.')}</p>
        <div class="more-tags">${tags}</div>
        <div class="more-meta">
          <span>${stars}Updated ${esc(formatDate(p.pushedAt))}</span>
          <span class="more-links">${live}<a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">Code</a></span>
        </div>
      </div>
    </article>`;
}

export async function initGithubProjects() {
  const section = document.getElementById('more-projects');
  if (!section) return;

  const all = await loadGithubProjects();

  const featured = new Set(Object.values(projectsData).map(p => normalize(p.github)));
  const projects = all.filter(p => isHttp(p.url) && !featured.has(normalize(p.url)));
  if (projects.length === 0) return;

  const grid = section.querySelector('.more-grid');
  const chips = section.querySelector('.filter-chips');
  grid.innerHTML = projects.map(cardHtml).join('');

  const languages = [...new Set(projects.flatMap(p => p.languages || []))].sort();
  if (languages.length > 1) {
    chips.innerHTML = ['All', ...languages]
      .map((l, i) => `<button type="button" class="filter-chip" data-filter="${esc(l)}" aria-pressed="${i === 0}">${esc(l)}</button>`)
      .join('');

    chips.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-chip');
      if (!btn) return;
      const filter = btn.dataset.filter;
      chips.querySelectorAll('.filter-chip').forEach(c => c.setAttribute('aria-pressed', String(c === btn)));
      grid.querySelectorAll('.more-card').forEach(card => {
        const langs = card.dataset.langs.split('|');
        card.hidden = filter !== 'All' && !langs.includes(filter);
      });
    });
  }

  section.hidden = false;
}
