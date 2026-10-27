// Single source of project data for the site.
// 1) data/github-projects.json  - built hourly by the GitHub Action (rich details: code size, README text, covers)
// 2) GitHub API (live)          - tells us right now which repos exist, so new/deleted repos show up instantly
// If the live call fails (rate limit, offline), the synced file is used on its own.

const DEFAULT_OWNER = 'DeepB5155';
const EXCLUDED_NAMES = ['portfolio'];
const HIDE_TOPICS = ['hide-from-portfolio', 'no-portfolio'];
const CACHE_KEY = 'gh-live-repos-v1';
const CACHE_MS = 10 * 60 * 1000;

let pending = null;

const humanize = (name) => name.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, c => c.toUpperCase());

async function loadSynced() {
  try {
    const res = await fetch('data/github-projects.json', { cache: 'no-cache' });
    if (res.ok) return await res.json();
  } catch { /* fall through */ }
  return { owner: DEFAULT_OWNER, projects: [] };
}

async function loadLive(owner) {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    if (cached && cached.owner === owner && Date.now() - cached.time < CACHE_MS) return cached.repos;
  } catch { /* ignore cache errors */ }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`https://api.github.com/users/${owner}/repos?per_page=100&sort=pushed`, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal
    });
    if (!res.ok) return null;
    const repos = await res.json();
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ owner, time: Date.now(), repos })); } catch { /* ignore */ }
    return repos;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function isShown(repo, owner) {
  const topics = (repo.topics || []).map(t => t.toLowerCase());
  const name = repo.name.toLowerCase();
  return !repo.fork && !repo.archived && !repo.private &&
    name !== owner.toLowerCase() && !EXCLUDED_NAMES.includes(name) &&
    !HIDE_TOPICS.some(t => topics.includes(t));
}

async function build() {
  const synced = await loadSynced();
  const owner = synced.owner || DEFAULT_OWNER;
  const syncedProjects = synced.projects || [];

  const live = await loadLive(owner);
  if (!live) return syncedProjects;

  const syncedByUrl = new Map(syncedProjects.map(p => [String(p.url).toLowerCase(), p]));
  return live
    .filter(r => isShown(r, owner))
    .map(r => {
      const s = syncedByUrl.get(r.html_url.toLowerCase());
      return {
        id: r.name,
        title: s?.title || humanize(r.name),
        description: (r.description || '').trim() || s?.description || '',
        url: r.html_url,
        live: r.homepage || null,
        languages: s?.languages?.length ? s.languages : (r.language ? [r.language] : []),
        size: s?.size || Math.max(1, (r.size || 1) * 1024),
        langBytes: s?.langBytes || (r.language ? { [r.language]: 1 } : {}),
        createdAt: r.created_at || s?.createdAt || null,
        topics: r.topics || [],
        stars: r.stargazers_count || 0,
        pushedAt: r.pushed_at,
        cover: s?.cover || null
      };
    })
    .sort((a, b) => String(b.pushedAt).localeCompare(String(a.pushedAt)));
}

export function loadGithubProjects() {
  if (!pending) pending = build();
  return pending;
}
