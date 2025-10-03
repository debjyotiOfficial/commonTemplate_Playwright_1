const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function debugLogin() {
  // Load config
  const configPath = path.join(__dirname, 'fixtures', 'tlr-config.json');
  const configData = fs.readFileSync(configPath, 'utf-8');
  const config = JSON.parse(configData).testConfig;
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('1. Navigating to login page:', config.urls.backAdminLoginPage);
    await page.goto(config.urls.backAdminLoginPage, { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    console.log('2. Page loaded, taking screenshot');
    await page.screenshot({ path: 'debug-login-page.png' });
    
    console.log('3. Current URL:', page.url());
    console.log('4. Page title:', await page.title());
    
    // Check if username field exists
    const usernameField = await page.$(config.selectors.login.usernameFieldBackup);
    console.log('5. Username field found:', !!usernameField);
    
    if (usernameField) {
      console.log('6. Filling username:', config.credentials.demo.usernameBackup);
      await page.fill(config.selectors.login.usernameFieldBackup, config.credentials.demo.usernameBackup);
    }
    
    // Check if password field exists
    const passwordField = await page.$(config.selectors.login.passwordFieldBackup);
    console.log('7. Password field found:', !!passwordField);
    
    if (passwordField) {
      console.log('8. Filling password');
      await page.fill(config.selectors.login.passwordFieldBackup, config.credentials.demo.passwordBackup);
    }
    
    console.log('9. Taking screenshot before submit');
    await page.screenshot({ path: 'debug-before-submit.png' });
    
    // Check if submit button exists
    const submitButton = await page.$(config.selectors.login.submitButtonBackup);
    console.log('10. Submit button found:', !!submitButton);
    
    if (submitButton) {
      console.log('11. Clicking submit button');
      await page.click(config.selectors.login.submitButtonBackup);
      
      console.log('12. Waiting for navigation...');
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      
      console.log('13. After login URL:', page.url());
      await page.screenshot({ path: 'debug-after-login.png' });
    }
    
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('Error during login:', error.message);
    await page.screenshot({ path: 'debug-error.png' });
  } finally {
    await browser.close();
  }
}

debugLogin();