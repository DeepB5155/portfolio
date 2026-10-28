// Free Website Audit: runs Google PageSpeed Insights (Lighthouse) on a visitor's site and turns the result into a lead.
const API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
// Optional: add a Google API key (restricted to your site by HTTP referrer) for a higher request quota.
// Set it in index.html: <meta name="psi-key" content="YOUR_KEY">
const apiKey = () => {
  const meta = document.querySelector('meta[name="psi-key"]');
  return meta ? meta.content.trim() : '';
};
const WHATSAPP = '917096769375';
const CACHE_MS = 15 * 60 * 1000;
const TIMEOUT_MS = 100000;

const CATS = [
  ['performance', 'Performance'],
  ['accessibility', 'Accessibility'],
  ['best-practices', 'Best practices'],
  ['seo', 'SEO']
];
const VITALS = [
  ['first-contentful-paint', 'First paint'],
  ['largest-contentful-paint', 'Main content'],
  ['total-blocking-time', 'Blocking time'],
  ['cumulative-layout-shift', 'Layout shift'],
  ['speed-index', 'Speed index']
];
const STEPS = [
  'Opening your site like a real visitor…',
  'Measuring loading speed and Core Web Vitals…',
  'Checking accessibility for every kind of user…',
  'Reviewing SEO and best practices…',
  'Almost there, building your report…'
];

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

const tone = (score) => (score >= 0.9 ? 'good' : score >= 0.5 ? 'warn' : 'bad');
const grade = (pct) => (pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 65 ? 'C' : pct >= 50 ? 'D' : 'F');

function normalizeUrl(input) {
  let raw = input.trim();
  if (!raw) throw new Error('empty');
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) raw = `https://${raw}`;
  let u;
  try { u = new URL(raw); } catch { throw new Error('invalid'); }
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('invalid');
  const host = u.hostname;
  if (!host.includes('.') || /\s/.test(host)) throw new Error('invalid');
  if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0)/i.test(host) || host.endsWith('.local')) throw new Error('private');
  return u.href;
}

function plain(text) {
  const clean = String(text || '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/`/g, '');
  const first = clean.split(/\.\s/)[0];
  return first.length > 170 ? `${first.slice(0, 167)}…` : first.replace(/\.$/, '') + '.';
}

function parse(json) {
  const lr = json && json.lighthouseResult;
  if (!lr || !lr.categories) throw new Error('bad-response');
  if (lr.runtimeError) throw new Error('page-failed');
  const scores = CATS.map(([id, label]) => ({ id, label, score: lr.categories[id] ? lr.categories[id].score : null })).filter(c => c.score !== null);
  if (!scores.length) throw new Error('bad-response');
  const vitals = VITALS.map(([id, label]) => {
    const a = lr.audits[id];
    return a ? { label, value: a.displayValue || '–', score: a.score } : null;
  }).filter(Boolean);

  const issues = [];
  CATS.forEach(([catId, catLabel]) => {
    const cat = lr.categories[catId];
    if (!cat) return;
    cat.auditRefs.forEach(ref => {
      const a = lr.audits[ref.id];
      if (!a || ref.group === 'metrics' || ref.group === 'hidden') return;
      const mode = a.scoreDisplayMode;
      if (!['numeric', 'binary', 'metricSavings'].includes(mode)) return;
      const savingsMs = (a.details && a.details.overallSavingsMs) || 0;
      const failing = a.score !== null && a.score < 0.9;
      if (!failing && !(mode === 'metricSavings' && savingsMs > 150)) return;
      const impact = ref.weight > 0 ? ref.weight * (1 - (a.score === null ? 0.5 : a.score)) : Math.min(10, savingsMs / 400);
      if (impact <= 0) return;
      issues.push({ category: catLabel, title: a.title, detail: a.displayValue || '', why: plain(a.description), impact, severity: a.score !== null && a.score < 0.5 ? 'bad' : 'warn' });
    });
  });
  issues.sort((x, y) => y.impact - x.impact);
  const seen = new Set();
  const top = issues.filter(i => (seen.has(i.title) ? false : seen.add(i.title))).slice(0, 6);

  const shot = lr.audits['final-screenshot'] && lr.audits['final-screenshot'].details && lr.audits['final-screenshot'].details.data;
  return {
    finalUrl: lr.finalUrl || lr.requestedUrl,
    scores,
    vitals,
    issues: top,
    totalIssues: issues.length,
    screenshot: typeof shot === 'string' && shot.startsWith('data:image/') ? shot : ''
  };
}

async function fetchAudit(url, strategy, signal) {
  const params = new URLSearchParams({ url, strategy, locale: 'en' });
  CATS.forEach(([id]) => params.append('category', id));
  if (apiKey()) params.set('key', apiKey());
  const res = await fetch(`${API}?${params}`, { signal });
  let body = null;
  try { body = await res.json(); } catch { /* ignore */ }
  if (!res.ok) {
    const msg = (body && body.error && body.error.message) || '';
    if (res.status === 429 || /quota/i.test(msg)) throw new Error('busy');
    if (/FAILED_DOCUMENT_REQUEST|ERRORED_DOCUMENT_REQUEST|DNS|Lighthouse returned error|unable to reach|not reachable/i.test(msg)) throw new Error('page-failed');
    throw new Error('api');
  }
  return parse(body);
}

const ERRORS = {
  empty: 'Please type your website address first, for example yourwebsite.com.',
  invalid: 'That does not look like a website address. Try something like yourwebsite.com.',
  private: 'I can only check public websites that are online. Localhost and private addresses cannot be reached.',
  'page-failed': 'Google could not load that page. Please check the address is correct, public and online, then try again.',
  busy: 'The free audit service is busy right now. Please try again in a minute, or message me and I will audit it manually.',
  timeout: 'The check took too long. Big or slow sites can time out, so please try again, or try the desktop option.',
  network: 'Could not reach the audit service. Please check your internet connection and try again.',
  api: 'The audit service returned an error. Please try again in a moment.',
  'bad-response': 'The audit service returned an unexpected result. Please try again.'
};

export function initSiteAudit() {
  const form = document.getElementById('auditForm');
  if (!form) return;
  const input = document.getElementById('auditUrl');
  const goBtn = document.getElementById('auditGo');
  const status = document.getElementById('auditStatus');
  const result = document.getElementById('auditResult');
  const strategyBtns = [...form.querySelectorAll('[data-strategy]')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let strategy = 'mobile';
  let running = false;
  let ticker = 0;

  strategyBtns.forEach(btn => btn.addEventListener('click', () => {
    strategy = btn.dataset.strategy;
    strategyBtns.forEach(b => { const on = b === btn; b.classList.toggle('is-active', on); b.setAttribute('aria-checked', String(on)); });
  }));

  function setStatus(kind, text, action) {
    clearInterval(ticker);
    status.hidden = !text;
    status.className = `audit-status ${kind || ''}`;
    status.textContent = '';
    if (!text) return;
    if (kind === 'loading') {
      const spin = el('span', 'audit-spinner');
      spin.setAttribute('aria-hidden', 'true');
      const msg = el('span', 'audit-status-text', text);
      const timer = el('span', 'audit-timer', '0s');
      status.append(spin, msg, timer);
      const started = Date.now();
      ticker = setInterval(() => {
        const s = Math.round((Date.now() - started) / 1000);
        timer.textContent = `${s}s`;
        msg.textContent = STEPS[Math.min(STEPS.length - 1, Math.floor(s / 6))];
      }, 1000);
    } else {
      status.append(el('span', 'audit-status-text', text));
      if (action) {
        const btn = el('button', 'btn btn-primary', action.label);
        btn.type = 'button';
        btn.addEventListener('click', action.onClick);
        status.append(btn);
      }
    }
  }

  // Used when the instant report is not available: turn the visitor's address into a manual-audit request
  function offerManual(url, text) {
    setStatus('error', text, {
      label: 'Request a free manual audit',
      onClick: () => {
        const message = document.getElementById('message');
        const project = document.getElementById('project');
        if (message) { message.value = `Hi Deep, please run a free website audit on ${url} and tell me what to improve.`; message.dispatchEvent(new Event('input', { bubbles: true })); }
        if (project) project.value = 'web';
        const contact = document.getElementById('contact');
        if (contact) contact.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        const name = document.getElementById('name');
        if (name) setTimeout(() => name.focus({ preventScroll: true }), 600);
      }
    });
  }

  function cacheGet(key) {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const { t, data } = JSON.parse(raw);
      return Date.now() - t < CACHE_MS ? data : null;
    } catch { return null; }
  }
  function cacheSet(key, data) {
    try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), data })); } catch { /* storage full or blocked */ }
  }

  function gauge(c) {
    const pct = Math.round(c.score * 100);
    const wrap = el('div', `audit-gauge ${tone(c.score)}`);
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('aria-hidden', 'true');
    const track = document.createElementNS(NS, 'circle');
    const arc = document.createElementNS(NS, 'circle');
    [track, arc].forEach(n => { n.setAttribute('cx', '50'); n.setAttribute('cy', '50'); n.setAttribute('r', '42'); n.setAttribute('fill', 'none'); n.setAttribute('stroke-width', '8'); });
    track.setAttribute('class', 'g-track');
    arc.setAttribute('class', 'g-arc');
    arc.setAttribute('stroke-linecap', 'round');
    const C = 2 * Math.PI * 42;
    arc.setAttribute('stroke-dasharray', String(C));
    arc.setAttribute('stroke-dashoffset', String(reduceMotion ? C * (1 - c.score) : C));
    arc.setAttribute('transform', 'rotate(-90 50 50)');
    svg.append(track, arc);
    if (!reduceMotion) requestAnimationFrame(() => requestAnimationFrame(() => arc.setAttribute('stroke-dashoffset', String(C * (1 - c.score)))));
    const num = el('div', 'audit-gauge-num', String(pct));
    wrap.append(svg, num, el('div', 'audit-gauge-label', c.label));
    wrap.setAttribute('role', 'img');
    wrap.setAttribute('aria-label', `${c.label}: ${pct} out of 100`);
    return wrap;
  }

  function summaryText(r, strat) {
    const scoreLine = r.scores.map(s => `${s.label} ${Math.round(s.score * 100)}`).join(', ');
    const issueLines = r.issues.map(i => `- ${i.title}${i.detail ? ` (${i.detail})` : ''}`).join('\n');
    return `Hi Deep, I ran your free website audit on ${r.finalUrl} (${strat}).\nScores: ${scoreLine}.\n${issueLines ? `Top issues:\n${issueLines}\n` : ''}I would like help improving this.`;
  }

  function render(r, strat) {
    result.textContent = '';
    const avg = Math.round((r.scores.reduce((s, c) => s + c.score, 0) / r.scores.length) * 100);
    const head = el('div', 'audit-head');
    if (r.screenshot) {
      const img = el('img', 'audit-shot');
      img.src = r.screenshot;
      img.alt = 'Screenshot of your page as Google loaded it';
      img.width = 120;
      head.append(img);
    }
    const headText = el('div', 'audit-head-text');
    headText.append(el('p', 'audit-url', r.finalUrl));
    const verdict = avg >= 90 ? 'Strong foundation. A few finishing touches left.' : avg >= 65 ? 'Decent, but visitors (and Google) are losing out.' : 'Real problems here: they are costing you visitors and trust.';
    headText.append(el('h3', 'audit-verdict', verdict));
    headText.append(el('p', 'audit-sub', `Checked as a ${strat} visitor. ${r.totalIssues ? `${r.totalIssues} things can be improved.` : 'Nothing major to fix.'}`));
    const badge = el('div', `audit-grade ${tone(avg / 100)}`);
    badge.append(el('span', 'audit-grade-letter', grade(avg)), el('span', 'audit-grade-sub', `${avg}/100 overall`));
    head.append(headText, badge);

    const gauges = el('div', 'audit-gauges');
    r.scores.forEach(c => gauges.append(gauge(c)));

    const vitals = el('div', 'audit-vitals');
    r.vitals.forEach(v => {
      const item = el('div', `audit-vital ${v.score === null ? '' : tone(v.score)}`);
      item.append(el('span', 'audit-vital-label', v.label), el('strong', 'audit-vital-value', v.value));
      vitals.append(item);
    });

    result.append(head, gauges, vitals);

    if (r.issues.length) {
      result.append(el('h4', 'audit-h4', 'What I would fix first'));
      const list = el('ol', 'audit-issues');
      r.issues.forEach(i => {
        const li = el('li', `audit-issue ${i.severity}`);
        const top = el('div', 'audit-issue-top');
        top.append(el('span', 'audit-issue-cat', i.category), el('strong', 'audit-issue-title', i.title));
        if (i.detail) top.append(el('span', 'audit-issue-detail', i.detail));
        li.append(top, el('p', 'audit-issue-why', i.why));
        list.append(li);
      });
      result.append(list);
    }

    const cta = el('div', 'audit-cta');
    cta.append(el('h4', 'audit-cta-title', avg >= 90 ? 'Want to keep it this way, or build something new?' : 'I can fix all of this for you.'));
    cta.append(el('p', 'audit-cta-text', 'Send me this report and you get a clear plan and quote within 24 hours. No obligation.'));
    const actions = el('div', 'audit-cta-actions');
    const fix = el('button', 'btn btn-primary btn-lg', 'Send me this report');
    fix.type = 'button';
    fix.addEventListener('click', () => sendToContact(r, strat));
    const wa = el('a', 'btn btn-ghost btn-lg', 'Chat on WhatsApp');
    wa.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(summaryText(r, strat))}`;
    wa.target = '_blank';
    wa.rel = 'noopener noreferrer';
    const again = el('button', 'audit-link', 'Check another site');
    again.type = 'button';
    again.addEventListener('click', () => { result.hidden = true; input.value = ''; input.focus(); });
    actions.append(fix, wa, again);
    cta.append(actions);
    result.append(cta);
    result.hidden = false;
    result.setAttribute('tabindex', '-1');
    result.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  function sendToContact(r, strat) {
    const message = document.getElementById('message');
    const project = document.getElementById('project');
    if (message) { message.value = summaryText(r, strat); message.dispatchEvent(new Event('input', { bubbles: true })); }
    if (project) project.value = 'web';
    const contact = document.getElementById('contact');
    if (contact) contact.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    const name = document.getElementById('name');
    if (name) setTimeout(() => name.focus({ preventScroll: true }), 600);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (running) return;
    let url;
    try { url = normalizeUrl(input.value); } catch (err) { setStatus('error', ERRORS[err.message] || ERRORS.invalid); input.focus(); return; }

    const key = `audit:${strategy}:${url}`;
    const cached = cacheGet(key);
    result.hidden = true;
    if (cached) { setStatus('', ''); render(cached, strategy); return; }
    if (!apiKey()) {
      offerManual(url, 'The instant report is being connected. In the meantime, send me your address and I will audit it personally and reply within 24 hours, free.');
      return;
    }

    running = true;
    goBtn.disabled = true;
    goBtn.textContent = 'Checking…';
    setStatus('loading', STEPS[0]);
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const data = await fetchAudit(url, strategy, ctrl.signal);
      cacheSet(key, data);
      setStatus('', '');
      render(data, strategy);
    } catch (err) {
      const code = err.name === 'AbortError' ? 'timeout' : ERRORS[err.message] ? err.message : (err instanceof TypeError ? 'network' : 'api');
      if (code === 'busy') offerManual(url, ERRORS.busy); else setStatus('error', ERRORS[code]);
    } finally {
      clearTimeout(timeout);
      running = false;
      goBtn.disabled = false;
      goBtn.textContent = 'Run free audit';
    }
  });
}
