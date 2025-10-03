const { chromium } = require('@playwright/test');

async function generateAuthState() {
  const browser = await chromium.launch({ headless: false }); // Run in headed mode for easier debugging
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    console.log('Navigating to login page...');
    await page.goto('https://www.gpsandfleet-server1.com/gpsandfleet/adminnew/view/login.php');

    console.log('Please log in manually in the browser window that opened.');
    console.log('After successful login, press any key to continue...');

    // Wait for user input
    process.stdin.setRawMode(true);
    process.stdin.resume();
    await new Promise(resolve => process.stdin.once('data', resolve));
    process.stdin.setRawMode(false);
    process.stdin.pause();

    // Save authentication state
    await context.storageState({ path: 'storageState.json' });
    console.log('✅ Authentication state saved to storageState.json');
    console.log('You can now run your tests with the saved session!');

  } catch (error) {
    console.error('❌ Failed to generate auth state:', error);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  generateAuthState();
}

module.exports = generateAuthState;