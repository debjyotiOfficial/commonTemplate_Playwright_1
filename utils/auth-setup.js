const { chromium } = require('@playwright/test');

async function globalSetup() {
  console.log('Starting authentication setup...');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('Navigating to login page...');
    await page.goto('https://www.gpsandfleet-server1.com/gpsandfleet/adminnew/view/login.php');

    console.log('Waiting for page to load...');
    await page.waitForLoadState('networkidle');

    console.log('Checking if login elements are present...');
    await page.waitForSelector('#username', { timeout: 10000 });
    await page.waitForSelector('#password', { timeout: 10000 });
    await page.waitForSelector('.submit', { timeout: 10000 });

    console.log('Filling in credentials...');
    await page.fill('#username', 'debjyoti');
    await page.fill('#password', '@Debjyoti0411');

    console.log('Clicking submit button...');
    await page.click('.submit');

    console.log('Waiting for navigation after login...');
    await page.waitForNavigation({ timeout: 30000 });

    console.log('Checking current URL after login...');
    console.log('Current URL:', page.url());

    console.log('Saving authentication state...');
    await page.context().storageState({ path: 'storageState.json' });

    console.log('Authentication state saved to storageState.json');
  } catch (error) {
    console.error('Authentication setup failed:', error);
    console.log('Current URL:', page.url());
    console.log('Page title:', await page.title());
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  globalSetup().catch(console.error);
}

module.exports = globalSetup;