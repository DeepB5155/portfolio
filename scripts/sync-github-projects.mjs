// Generates data/github-projects.json from the owner's public GitHub repos.
// Every public, non-fork, non-archived repo is included automatically.
// Hide a repo by adding the topic "hide-from-portfolio" (or "no-portfolio").
// Usage: node scripts/sync-github-projects.mjs
// Env:   GITHUB_OWNER (default DeepB5155), ONLY_TOPIC (optional: include only repos with this topic),
//        EXCLUDE_REPOS (comma-separated repo names), GITHUB_TOKEN (optional)
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OWNER = process.env.GITHUB_OWNER || 'DeepB5155';
const ONLY_TOPIC = (process.env.ONLY_TOPIC || '').toLowerCase();
const HIDE_TOPICS = ['hide-from-portfolio', 'no-portfolio'];
const EXCLUDED_NAMES = new Set([
  OWNER.toLowerCase(), // the GitHub profile README repo
  'portfolio',
  ...(process.env.EXCLUDE_REPOS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
]);
const TOKEN = process.env.GITHUB_TOKEN;
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'github-projects.json');

const headers = {
  'User-Agent': 'portfolio-sync',
  Accept: 'application/vnd.github+json',
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {})
};

async function gh(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${url}`);
  return res.json();
}

async function listRepos() {
  const repos = [];
  for (let page = 1; ; page++) {
    const batch = await gh(`https://api.github.com/users/${OWNER}/repos?per_page=100&sort=pushed&page=${page}`);
    repos.push(...batch);
    if (batch.length < 100) return repos;
  }
}

async function topLanguages(repo) {
  try {
    const langs = await gh(repo.languages_url);
    const entries = Object.entries(langs).sort((a, b) => b[1] - a[1]);
    return {
      names: entries.slice(0, 5).map(([name]) => name),
      bytes: Object.fromEntries(entries.slice(0, 5)),
      size: entries.reduce((sum, [, bytes]) => sum + bytes, 0)
    };
  } catch {
    return { names: repo.language ? [repo.language] : [], bytes: {}, size: 0 };
  }
}

async function findCover(repo) {
  const base = `https://raw.githubusercontent.com/${OWNER}/${repo.name}/${repo.default_branch}`;
  for (const file of ['screenshots/cover.png', 'screenshots/cover.jpg', 'screenshots/cover.webp']) {
    try {
      const res = await fetch(`${base}/${file}`, { method: 'HEAD' });
      if (res.ok) return `${base}/${file}`;
    } catch { /* try next */ }
  }
  return null;
}

function humanize(name) {
  return name.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

async function fetchReadme(repo) {
  for (const name of ['README.md', 'readme.md', 'Readme.md']) {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${OWNER}/${repo.name}/${repo.default_branch}/${name}`);
      if (res.ok) return await res.text();
    } catch { /* try next */ }
  }
  return '';
}

function readmeSummary(md) {
  const text = md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  for (const block of text.split(/\n\s*\n/)) {
    const line = block.replace(/[*_`>]/g, '').replace(/\s+/g, ' ').trim();
    if (line.length >= 40 && !/^(#|[-=|]|\d+\.)/.test(line)) {
      return line.length > 200 ? line.slice(0, 197).replace(/\s+\S*$/, '').replace(/[\s,;:\-–]+$/, '') + '…' : line;
    }
  }
  return '';
}

function readmeImage(md, repo) {
  const base = `https://raw.githubusercontent.com/${OWNER}/${repo.name}/${repo.default_branch}`;
  for (const m of md.matchAll(/!\[[^\]]*\]\(([^)\s]+)[^)]*\)/g)) {
    const src = m[1];
    if (/shields\.io|badge|svg$|\.gif$/i.test(src)) continue;
    if (/^https?:\/\//i.test(src)) return src;
    return `${base}/${src.replace(/^\.?\//, '')}`;
  }
  return null;
}

const repos = (await listRepos()).filter(r => {
  const topics = (r.topics || []).map(t => t.toLowerCase());
  return !r.fork && !r.archived && !r.private &&
    !EXCLUDED_NAMES.has(r.name.toLowerCase()) &&
    !HIDE_TOPICS.some(t => topics.includes(t)) &&
    (!ONLY_TOPIC || topics.includes(ONLY_TOPIC));
});

const projects = [];
for (const repo of repos) {
  const readme = await fetchReadme(repo);
  const langs = await topLanguages(repo);
  projects.push({
    id: repo.name,
    title: humanize(repo.name),
    description: (repo.description || '').trim() || readmeSummary(readme),
    url: repo.html_url,
    live: repo.homepage || null,
    languages: langs.names,
    langBytes: langs.bytes,
    size: langs.size,
    createdAt: repo.created_at,
    topics: repo.topics || [],
    stars: repo.stargazers_count,
    pushedAt: repo.pushed_at,
    cover: (await findCover(repo)) || readmeImage(readme, repo)
  });
}

// Stable order and no timestamp, so the file only changes when repo data changes.
projects.sort((a, b) => b.pushedAt.localeCompare(a.pushedAt));

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify({ owner: OWNER, projects }, null, 2) + '\n');
console.log(`Wrote ${projects.length} project(s) to ${OUT}`);
