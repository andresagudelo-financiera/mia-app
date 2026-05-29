const { chromium } = require('/Users/jorgeagudelo/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.goto('http://localhost:3000/clase-oculta', { waitUntil: 'networkidle', timeout: 30000 });

  // Hero section
  await page.screenshot({ path: '/tmp/clase-oculta-hero.png', fullPage: false });

  // Scroll to Claudia bio section
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.50));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: '/tmp/clase-oculta-claudia.png', fullPage: false });

  // Scroll to community/photos section
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.60));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: '/tmp/clase-oculta-community.png', fullPage: false });

  // Scroll to photo grid
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.70));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: '/tmp/clase-oculta-gallery.png', fullPage: false });

  // Final CTA
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/clase-oculta-cta.png', fullPage: false });

  await browser.close();
  console.log('Done');
})();
