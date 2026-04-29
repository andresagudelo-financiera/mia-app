const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto('http://localhost:3000/calculadoras/rentabilidad', { waitUntil: 'networkidle' });
  
  const content = await page.content();
  console.log('HTML CONTENT:', content.substring(0, 1500));
  
  await browser.close();
})();
