#!/usr/bin/env node
// Launch a persistent (headed) Chrome session against merokirana so a human
// can log in once. The session is saved to ./profile so later ./probe.js runs
// can reuse the authenticated cookies/localStorage without re-logging-in.
//
// Usage:
//   node login.js          -> open browser, wait for login, then exit
//
// The browser stays open until you press Ctrl+C. While it's open you can log in.

const path = require('path');
const { chromium } = require('playwright');

const PROFILE_DIR = path.join(__dirname, 'profile');
const HOME = 'https://www.merokirana.com/';

function detectLoggedIn(page) {
  return page.evaluate(() => {
    try {
      const ls = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        ls[k] = localStorage.getItem(k);
      }
      return JSON.stringify(ls);
    } catch (e) {
      return null;
    }
  });
}

(async () => {
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1360, height: 900 },
  });
  const page = ctx.pages()[0] || await ctx.newPage();

  await page.goto(HOME, { waitUntil: 'domcontentloaded' });
  console.log('Browser opened. Log in to MeroKirana in the window.');
  console.log('Waiting ... press Ctrl+C anywhere in this terminal when done.');

  // Poll: print localStorage keys every few seconds so we can see when a token appears.
  const seen = new Set();
  const iv = setInterval(async () => {
    try {
      const ls = await detectLoggedIn(page);
      const keys = Object.keys(JSON.parse(ls));
      const tokenish = keys.filter((k) => /token|auth|code|session/i.test(k));
      for (const k of tokenish) {
        if (!seen.has(k)) {
          seen.add(k);
          console.log('[new]', k);
        }
      }
    } catch (e) {}
  }, 3000);

  process.on('SIGINT', async () => {
    clearInterval(iv);
    await ctx.close();
    console.log('\nSession saved to', PROFILE_DIR);
    process.exit(0);
  });
})();
