/* Production URLs are served from this checkout by Playwright routing.
   EVERY event, Google request and Web3Forms submission is intercepted locally. */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, devices } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const ORIGIN = 'https://klarekante-hausverwaltung.de';
const TRACKER = 'https://plausible.io/js/pa-Hq0u0PME5BWAIW0bO0PDH.js';
const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).concat('support/index.html');
let browser, tracker;

before(async () => {
  tracker = process.env.PLAUSIBLE_TRACKER_FILE ? fs.readFileSync(process.env.PLAUSIBLE_TRACKER_FILE, 'utf8') : await (await fetch(TRACKER)).text();
  assert.ok(tracker.includes('transformRequest'), 'Actual account tracker must support the privacy filter');
  browser = await chromium.launch({ headless: true, ...(process.env.TEST_BROWSER_CHANNEL ? { channel: process.env.TEST_BROWSER_CHANNEL } : {}) });
});
after(async () => { if (browser) await browser.close(); });

async function open(url = ORIGIN + '/', opts = {}) {
  const context = await browser.newContext(opts.mobile ? devices['Pixel 7'] : {});
  const state = { events: [], forms: [], google: [], scripts: [], errors: [], mode: 'success' };
  // Plausible's documented test flag bypasses its WebDriver filter only in this test browser.
  await context.addInitScript(() => { window.__plausible = true; });
  await context.route('**/*', async route => {
    const req = route.request(), u = new URL(req.url());
    if (req.url() === TRACKER) {
      state.scripts.push(req.headers());
      if (opts.blockTracker) return route.abort();
      if (opts.delayTracker) await state.trackerGate;
      return route.fulfill({ contentType: 'text/javascript', body: tracker });
    }
    if (u.hostname === 'plausible.io' && u.pathname === '/api/event') {
      state.events.push({ ...JSON.parse(req.postData()), requestHeaders: req.headers() });
      return route.fulfill({ status: 202, body: '{}' });
    }
    if (u.hostname === 'api.web3forms.com') {
      state.forms.push(JSON.parse(req.postData()));
      if (state.formGate) await state.formGate;
      if (state.mode === 'network') return route.abort();
      return route.fulfill({ status: state.mode === 'http' ? 500 : 200, contentType: 'application/json',
        body: state.mode === 'json' ? '{' : JSON.stringify({ success: state.mode === 'string' ? 'true' : state.mode !== 'failure' }) });
    }
    if (/google|doubleclick|gstatic/.test(u.hostname)) {
      state.google.push(req.url());
      return route.fulfill({ contentType: 'text/javascript', body: '' });
    }
    if (['klarekante-hausverwaltung.de', 'www.klarekante-hausverwaltung.de', 'localhost', '127.0.0.1',
      'preview.example.com', 'staging.klarekante-hausverwaltung.de', 'portal.klarekante-hausverwaltung.de',
      'nicospringhetti-del.github.io', 'klarekante-hausverwaltung.de.evil.example'].includes(u.hostname)) {
      let file = path.join(ROOT, decodeURIComponent(u.pathname));
      if (u.pathname.endsWith('/')) file = path.join(file, 'index.html');
      if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
      if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(ROOT, '404.html');
      const ext = path.extname(file);
      return route.fulfill({ contentType: ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[ext] || 'application/octet-stream', body: fs.readFileSync(file) });
    }
    return route.abort();
  });
  if (opts.delayTracker) state.trackerGate = new Promise(resolve => { state.releaseTracker = resolve; });
  const page = await context.newPage();
  page.on('pageerror', e => state.errors.push(e.message));
  await page.goto(url, { waitUntil: opts.delayTracker ? 'domcontentloaded' : 'load',
    referer: 'https://www.google.com/search?q=PRIVATE_EMAIL%40example.com#PRIVATE' });
  state.page = page; state.close = () => context.close();
  state.count = name => state.events.filter(e => e.n === name).length;
  state.wait = async (name, count = 1) => { await page.waitForFunction(() => window.plausible && window.plausible.l); await waitFor(() => state.count(name) >= count); };
  return state;
}
async function waitFor(predicate) {
  const until = Date.now() + 5000;
  while (!predicate()) { if (Date.now() > until) throw new Error('Timed out waiting for intercepted event'); await new Promise(r => setTimeout(r, 10)); }
}
async function fill(state, kind) {
  const p = state.page;
  if (kind === 'kontakt') {
    await p.locator('#leistungsart').selectOption('WEG-Verwaltung');
    await p.locator('#name').fill('PRIVATE_NAME');
    await p.locator('#email').fill('PRIVATE_EMAIL@example.com');
    await p.locator('#plz').fill('PRIVATE_ADDRESS');
    await p.locator('#einheiten').selectOption({ index: 1 });
  } else {
    await p.locator('#rr-name').fill('PRIVATE_NAME');
    await p.locator('#rr-telefon').fill('069123456789');
  }
}
function privateSafe(state) {
  assert.ok(!JSON.stringify(state.events).includes('PRIVATE'), 'No URL/query/referrer/form secrets in analytics');
  assert.ok(!JSON.stringify(state.events).includes('069123456789'), 'No submitted telephone number in analytics');
  for (const event of state.events) {
    assert.equal(event.d, 'klarekante-hausverwaltung.de');
    assert.equal(new URL(event.u).hostname, 'klarekante-hausverwaltung.de');
    assert.ok(!event.u.includes('#'));
    if (event.r) assert.equal(new URL(event.r).pathname, '/');
  }
}

test('All 15 HTML documents: one head include and one pageview, no Google before consent', async () => {
  for (const file of pages) {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    assert.equal((html.match(/src="\/analytics\.js"/g) || []).length, 1, file);
    assert.ok(html.indexOf('src="/analytics.js"') < html.indexOf('</head>'));
    const s = await open(ORIGIN + '/' + file + '?email=PRIVATE_EMAIL&ref=PRIVATE_SOURCE&utm_source=PRIVATE_SOURCE#PRIVATE');
    try {
      await s.wait('pageview');
      assert.equal(s.count('pageview'), 1, file);
      assert.equal(s.scripts.length, 1);
      assert.ok(!s.scripts[0].referer);
      assert.equal(s.google.length, 0);
      assert.deepEqual(s.errors, []);
      assert.equal(await s.page.evaluate(() => localStorage.length), 0);
      assert.equal((await s.page.context().cookies()).length, 0);
      privateSafe(s);
    } finally { await s.close(); }
  }
});

test('Local/preview/staging/portal/unknown paths and nonstandard ports load no Plausible', async () => {
  for (const url of ['http://localhost/', 'http://127.0.0.1/', 'https://preview.example.com/',
    'https://staging.klarekante-hausverwaltung.de/', 'https://portal.klarekante-hausverwaltung.de/',
    'https://nicospringhetti-del.github.io/', 'https://klarekante-hausverwaltung.de.evil.example/',
    ORIGIN + ':8443/', ORIGIN + '/portal', ORIGIN + '/PRIVATE_NAME', 'http://klarekante-hausverwaltung.de/']) {
    const s = await open(url);
    try { assert.equal(s.scripts.length, 0, url); assert.equal(s.events.length, 0, url); }
    finally { await s.close(); }
  }
});

test('www works; QR keys become only fixed campaign labels, unknown keys disappear', async () => {
  for (const [key, label] of [['b', 'briefkasten'], ['f', 'friseur-geschaefte'], ['p', 'persoenlich'], ['m', 'multiplikator'], ['PRIVATE', null]]) {
    const s = await open('https://www.klarekante-hausverwaltung.de/rueckruf?k=' + key + '&utm_campaign=PRIVATE');
    try {
      await s.wait('pageview');
      const u = new URL(s.events.find(e => e.n === 'pageview').u);
      assert.equal(u.searchParams.get('utm_campaign'), label);
      assert.equal(u.searchParams.get('utm_source'), label ? 'visitenkarte' : null);
      assert.ok(!u.searchParams.has('k')); privateSafe(s);
    } finally { await s.close(); }
  }
});

test('Navigation push/pop/replace counts once; anchors and free queries never count again', async () => {
  const s = await open();
  try {
    await s.wait('pageview');
    await s.page.evaluate(() => { history.pushState({}, '', '/weg-verwaltung-frankfurt?email=PRIVATE'); });
    await s.wait('pageview', 2);
    await s.page.evaluate(() => { history.pushState({}, '', '#PRIVATE'); });
    assert.equal(s.count('pageview'), 2);
    await s.page.evaluate(() => { history.replaceState({}, '', '/mietverwaltung-frankfurt?utm_source=PRIVATE'); });
    await s.wait('pageview', 3);
    await s.page.evaluate(() => history.back());
    await s.wait('pageview', 4);
    assert.equal(s.count('pageview'), 4);
    privateSafe(s);
  } finally { await s.close(); }
});

for (const kind of ['kontakt', 'rueckruf']) {
  const formId = kind === 'kontakt' ? 'kontaktformular' : 'rueckrufformular';
  const event = kind === 'kontakt' ? 'Anfrage_Gesendet' : 'Rueckruf_Gesendet';
  const url = ORIGIN + (kind === 'kontakt' ? '/' : '/rueckruf?k=b');
  test(`${kind}: real first input once, server-confirmed success once, duplicate submission ignored`, async () => {
    const s = await open(url, { mobile: true });
    try {
      await s.wait('pageview');
      await s.page.locator('#consent-decline').click();
      await s.page.locator('#' + formId + ' button[type=submit]').click();
      assert.equal(s.forms.length, 0);
      assert.equal(s.count('Formular_Begonnen'), 0);
      await s.page.evaluate(id => { const f = document.querySelector('#' + id + ' input:not([type=hidden])'); f.dispatchEvent(new Event('input', { bubbles: true })); }, formId);
      assert.equal(s.count('Formular_Begonnen'), 0);
      await fill(s, kind);
      await s.wait('Formular_Begonnen');
      s.formGate = new Promise(resolve => { s.releaseForm = resolve; });
      await s.page.evaluate(id => { const form = document.getElementById(id); form.requestSubmit(); form.requestSubmit(); }, formId);
      await waitFor(() => s.forms.length === 1);
      assert.equal(s.count(event), 0, 'No success before response');
      s.releaseForm();
      await s.wait(event);
      assert.equal(s.count(event), 1);
      assert.equal(s.count('Formular_Begonnen'), 1);
      assert.equal(s.count('Form: Submission'), 0);
      assert.equal(s.google.length, 0);
      if (kind === 'rueckruf') {
        assert.equal(s.forms[0].kanal, 'Visitenkarte Briefkasten');
        assert.ok(s.forms[0].subject.includes('Visitenkarte Briefkasten'));
        assert.ok((await s.page.locator('.brand').getAttribute('href')).includes('k=b'));
      }
      privateSafe(s); assert.deepEqual(s.errors, []);
    } finally { await s.close(); }
  });

  test(`${kind}: rejected/HTTP/network/JSON/nonboolean responses never report success; retry works`, async () => {
    const s = await open(url);
    try {
      await s.wait('pageview'); await s.page.locator('#consent-decline').click(); await fill(s, kind);
      for (const mode of ['failure', 'http', 'network', 'json', 'string']) {
        s.mode = mode;
        await s.page.locator('#' + formId + ' button[type=submit]').click();
        await s.page.locator(kind === 'kontakt' ? '#form-note.err' : '#rr-note.err').waitFor();
        assert.equal(s.count(event), 0, mode);
      }
      assert.equal(s.forms.length, 5);
      s.mode = 'success';
      await s.page.locator('#' + formId + ' button[type=submit]').click(); await s.wait(event);
      assert.equal(s.count(event), 1); assert.equal(s.count('Formular_Begonnen'), 1);
      privateSafe(s);
    } finally { await s.close(); }
  });
}

test('Contact links retain Google C3/C4 after consent; Plausible is independent of consent', async () => {
  const s = await open();
  try {
    await s.wait('pageview'); await s.page.locator('#consent-accept').click();
    // Prevent the OS protocol chooser; retain normal DOM/Google/Plausible click handlers.
    await s.page.evaluate(() => document.addEventListener('click', e => {
      if (e.target.closest('a[href^="tel:"],a[href^="mailto:"]')) e.preventDefault();
    }, true));
    await s.page.locator('a[href^="tel:"]').first().click();
    await s.wait('Telefon_Klick');
    await s.page.locator('a[href^="mailto:"]').first().click();
    await s.wait('Email_Klick');
    assert.equal(s.count('Telefon_Klick'), 1); assert.equal(s.count('Email_Klick'), 1);
    await fill(s, 'kontakt'); await s.page.locator('#kontaktformular button[type=submit]').click(); await s.wait('Anfrage_Gesendet');
    const conversions = await s.page.evaluate(() => dataLayer.filter(x => x[0] === 'event' && x[1] === 'conversion').map(x => x[2].send_to));
    assert.deepEqual(conversions.sort(), ['AW-18440139228/L2H3CIXQ8IodENzj-NhE', 'AW-18440139228/PcSQCIjQ8IodENzj-NhE', 'AW-18440139228/EWX_CP_P8IodENzj-NhE'].sort());
    assert.equal(s.google.length, 1); privateSafe(s);
  } finally { await s.close(); }
});

test('Delayed SDK flushes queued events once and strips sensitive URL parameters', async () => {
  const s = await open(ORIGIN + '/rueckruf?k=b&email=PRIVATE', { delayTracker: true });
  try {
    await s.page.locator('#consent-decline').click(); await fill(s, 'rueckruf');
    await s.page.locator('#rueckrufformular button[type=submit]').click();
    await s.page.locator('#rr-note.ok').waitFor();
    assert.equal(s.events.length, 0);
    s.releaseTracker(); await s.wait('Rueckruf_Gesendet'); await s.wait('pageview');
    assert.equal(s.count('Formular_Begonnen'), 1); assert.equal(s.count('Rueckruf_Gesendet'), 1); privateSafe(s);
  } finally { await s.close(); }
});

test('Delayed SDK preserves the original page of queued navigation; duplicate bootstrap does not duplicate tracking', async () => {
  const s = await open(ORIGIN + '/?email=PRIVATE', { delayTracker: true });
  try {
    await s.page.evaluate(() => history.pushState({}, '', '/rueckruf?k=b&email=PRIVATE'));
    await s.page.addScriptTag({ content: fs.readFileSync(path.join(ROOT, 'analytics.js'), 'utf8') });
    assert.equal(s.scripts.length, 1);
    s.releaseTracker(); await s.wait('pageview', 2);
    assert.deepEqual(s.events.filter(e => e.n === 'pageview').map(e => new URL(e.u).pathname), ['/', '/rueckruf']);
    assert.equal(new URL(s.events.filter(e => e.n === 'pageview')[1].u).searchParams.get('utm_campaign'), 'briefkasten');
    privateSafe(s);
  } finally { await s.close(); }
});

test('Blocked SDK or missing/throwing analytics never breaks either form', async () => {
  for (const kind of ['kontakt', 'rueckruf']) for (const mode of ['blocked', 'missing', 'throws']) {
    const s = await open(ORIGIN + (kind === 'kontakt' ? '/' : '/rueckruf?k=b'), { blockTracker: true });
    try {
      await s.page.locator('#consent-decline').click(); await fill(s, kind);
      if (mode !== 'blocked') await s.page.evaluate(mode => { window.kkAnalytics = mode === 'missing' ? undefined : () => { throw new Error('Blocked analytics'); }; }, mode);
      await s.page.locator('#' + (kind === 'kontakt' ? 'kontaktformular' : 'rueckrufformular') + ' button[type=submit]').click();
      await s.page.locator(kind === 'kontakt' ? '#form-note.ok' : '#rr-note.ok').waitFor();
      assert.equal(s.forms.length, 1); assert.equal(s.events.length, 0); assert.deepEqual(s.errors, []);
    } finally { await s.close(); }
  }
});

test('SDK engagement on simulated hidden lifecycle reports sanitized URL and depth without extra pageviews', async () => {
  const s = await open(ORIGIN + '/?email=PRIVATE#PRIVATE');
  try {
    await s.wait('pageview');
    await s.page.locator('#consent-decline').click();
    await s.page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await s.page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    // Headless Edge does not reliably blur/hide tabs. Emulate that browser signal.
    await s.page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await s.wait('engagement');
    assert.ok(s.events.find(e => e.n === 'engagement').sd > 0);
    assert.equal(s.count('pageview'), 1); privateSafe(s);
  } finally { await s.close(); }
});
