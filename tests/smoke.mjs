// Duman testi: sunucuyu açar, 30 oyunun hepsini başlatır, Günün Turu + ilerleme ekranını dener.
// Kurulum (bir kez):  npm i -D playwright && npx playwright install chromium
// Çalıştırma:         npm test
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const PORT = 5400 + Math.floor(Math.random() * 400);
const server = spawn('node', ['server.mjs'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
const URL = `http://localhost:${PORT}/`;
const errors = [];
let browser;

try {
  for (let i = 0; i < 40; i++) {            // sunucu hazır olana kadar bekle
    try { if ((await fetch(URL)).ok) break; } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()));

  await page.goto(URL);
  await page.waitForFunction(() => document.body.dataset.appReady === 'true');
  assert.equal(await page.locator('.tile').count(), 30, '30 oyun kartı bekleniyordu');

  // 1) her oyun açılıyor ve arena doluyor
  for (let id = 1; id <= 30; id++) {
    await page.evaluate((n) => startGame(n), id);
    await page.waitForTimeout(450);
    const len = await page.evaluate(() => document.getElementById('arena').innerText.length);
    assert.ok(len > 0, `Oyun ${id} açılmadı (arena boş)`);
    await page.click('#closeBtn');
  }

  // 2) Günün Turu: 5 oyun sırayla, sonunda tamam
  await page.click('#dailyBtn');
  for (let k = 0; k < 5; k++) {
    await page.waitForTimeout(300);
    await page.evaluate(() => { addScore(100); finish('test'); });
    await page.waitForTimeout(200);
    if (k < 4) await page.click('#nextTourBtn');
  }
  await page.click('#closeBtn');
  assert.equal(await page.locator('#dailyDots i.on').count(), 5, 'tur noktaları dolmadı');
  assert.equal(await page.innerText('#streak'), '1', 'seri 1 olmalı');

  // 3) ilerleme ekranı + Escape ile kapanma
  await page.click('#progressBtn');
  assert.ok(await page.locator('#progressBody svg').count() > 0, 'radar çizilmedi');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.getElementById('progressModal').classList.contains('open')), false);

  assert.deepEqual(errors, [], 'konsol/sayfa hataları var');
  console.log('✓ duman testi geçti (30 oyun, günün turu, ilerleme ekranı)');
} catch (e) {
  console.error('✗ test başarısız:', e.message);
  if (errors.length) console.error(errors.join('\n'));
  process.exitCode = 1;
} finally {
  await browser?.close();
  server.kill();
}
