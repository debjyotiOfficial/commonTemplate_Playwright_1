const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testUrls() {
  // Load config
  const configPath = path.join(__dirname, 'fixtures', 'tlr-config.json');
  const configData = fs.readFileSync(configPath, 'utf-8');
  const config = JSON.parse(configData).testConfig;
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // List of login URLs to test
  const urlsToTest = [
    { name: 'mainAdminLoginPage', url: config.urls.mainAdminLoginPage },
    { name: 'loginPage', url: config.urls.loginPage },
    { name: 'backupLoginPage', url: config.urls.backupLoginPage },
    { name: 'fleetDashboard3 (target)', url: config.urls.fleetDashboard3 }
  ];
  
  for (const urlTest of urlsToTest) {
    try {
      console.log(`\nTesting ${urlTest.name}: ${urlTest.url}`);
      
      await page.goto(urlTest.url, { 
        waitUntil: 'domcontentloaded',
        timeout: 10000 
      });
      
      console.log(`✅ SUCCESS - ${urlTest.name} loaded`);
      console.log(`   URL: ${page.url()}`);
      console.log(`   Title: ${await page.title()}`);
      
      await page.screenshot({ path: `debug-${urlTest.name}.png` });
      
    } catch (error) {
      console.log(`❌ FAILED - ${urlTest.name}: ${error.message}`);
    }
    
    await page.waitForTimeout(2000);
  }
  
  await browser.close();
}

testUrls();