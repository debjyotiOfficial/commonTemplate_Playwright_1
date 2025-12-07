const fs = require('fs');
const path = require('path');

class TestHelpers {
  constructor(page) {
    this.page = page;
    this.config = null;
  }

  async getConfig() {
    if (!this.config) {
      const configPath = path.join(__dirname, '..', 'fixtures', 'tlr-config.json');
      const configData = fs.readFileSync(configPath, 'utf-8');
      this.config = JSON.parse(configData).testConfig;
    }
    return this.config;
  }

  async login() {
    if (!this.config) {
      this.config = await this.getConfig();
    }

    // Use backup admin login page directly (as in original Cypress test)
    await this.page.goto(this.config.urls.backAdminLoginPage, {
      waitUntil: 'networkidle',
      timeout: this.config.timeouts.pageLoad
    });

    // Fill username field
    await this.page.waitForSelector(this.config.selectors.login.usernameFieldBackup, {
      state: 'visible',
      timeout: this.config.timeouts.wait
    });
    await this.page.locator(this.config.selectors.login.usernameFieldBackup).clear();
    await this.page.locator(this.config.selectors.login.usernameFieldBackup)
      .fill(this.config.credentials.demo.usernameBackup);

    // Fill password field
    await this.page.waitForSelector(this.config.selectors.login.passwordFieldBackup, {
      state: 'visible',
      timeout: this.config.timeouts.wait
    });
    await this.page.locator(this.config.selectors.login.passwordFieldBackup).clear();
    await this.page.locator(this.config.selectors.login.passwordFieldBackup)
      .fill(this.config.credentials.demo.passwordBackup);

    // Click submit button
    await this.page.locator(this.config.selectors.login.submitButtonBackup).click();

    // Wait for automatic redirect to index.php after successful login
    await this.page.waitForLoadState('networkidle', { timeout: this.config.timeouts.pageLoad });
    await this.page.waitForTimeout(this.config.timeouts.wait);

    // Navigate to the fleet dashboard (as shown in the video workflow)
    // Use 'load' event which is faster than domcontentloaded for this platform
    await this.page.goto('https://www.gpsandfleet-server1.com/gpsandfleet/client/fleetdemo/maps/index2_unified.php', {
      waitUntil: 'load',
      timeout: 800000 // 1.5 minutes timeout
    });

    // Wait for key elements to be ready instead of arbitrary time
    try {
      // Wait for the main UI elements to be visible (faster than waiting arbitrary time)
      await this.page.waitForSelector('body', { state: 'visible', timeout: 30000 });
      console.log('Unified platform loaded successfully');
    } catch (error) {
      console.log('Platform taking longer to load, continuing with extra wait...');
      await this.page.waitForTimeout(10000);
    }
  }

  /**
   * Login and navigate to a specific page
   * This is a reusable method that performs login and then navigates to any specified URL
   * @param {string} pagePath - The URL or path to navigate to after login
   */
  async loginAndNavigateToPage(pagePath) {
    if (!this.config) {
      this.config = await this.getConfig();
    }

    console.log('Performing login...');

    // Navigate to login page
    await this.page.goto(this.config.urls.backAdminLoginPage, {
      waitUntil: 'networkidle',
      timeout: this.config.timeouts.pageLoad
    });

    // Fill username field
    await this.page.waitForSelector(this.config.selectors.login.usernameFieldBackup, {
      state: 'visible',
      timeout: 30000
    });
    await this.page.locator(this.config.selectors.login.usernameFieldBackup).clear();
    await this.page.locator(this.config.selectors.login.usernameFieldBackup)
      .fill(this.config.credentials.demo.usernameBackup);

    // Fill password field
    await this.page.waitForSelector(this.config.selectors.login.passwordFieldBackup, {
      state: 'visible',
      timeout: 30000
    });
    await this.page.locator(this.config.selectors.login.passwordFieldBackup).clear();
    await this.page.locator(this.config.selectors.login.passwordFieldBackup)
      .fill(this.config.credentials.demo.passwordBackup);

    // Click submit button
    await this.page.locator(this.config.selectors.login.submitButtonBackup).click();

    // Wait for login to complete
    await this.page.waitForLoadState('networkidle', { timeout: 30000 });
    await this.page.waitForTimeout(3000);

    // Navigate to the specified page
    const fullUrl = pagePath.startsWith('http') ? pagePath : `https://www.gpsandfleet3.net${pagePath}`;

    console.log(`Navigating to ${fullUrl}...`);
    await this.page.goto(fullUrl, {
      waitUntil: 'load',
      timeout: 120000
    });

    // Wait for page to load completely
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(5000);

    console.log('Page loaded successfully');
  }

  async clearStorageAndSetTimeouts() {
    // Clear cookies only - storage will be cleared after navigation
    await this.page.context().clearCookies();
  }

  async clearStorageAfterNavigation() {
    // Clear local storage and session storage after navigating to a page
    try {
      await this.page.evaluate(() => {
        if (typeof localStorage !== 'undefined') {
          localStorage.clear();
        }
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.clear();
        }
      });
    } catch (error) {
      console.log('Storage clearing skipped (not available):', error.message);
    }
  }

  async waitForElementVisible(selector, timeout = 30000) {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
  }

  async waitForElementAndClick(selector, timeout = 30000) {
    await this.waitForElementVisible(selector, timeout);
    await this.page.locator(selector).click();
  }

  async clickWithWait(selector, waitTime = 2000) {
    await this.page.locator(selector).click();
    await this.page.waitForTimeout(waitTime);
  }

  async navigateToDevicesList(config) {
    // Wait extra time for unified platform to fully load
    await this.page.waitForTimeout(15000);

    // Try multiple selectors for the Account menu (different platforms have different selectors)
    const accountMenuSelectors = [
      config.selectors.navigation.accountsMenu,  // .icon.icon--xl.icon--account-settings
      config.selectors.navigation.devMenu,       // #account
      '#account',
      '.icon--account-settings',
      '[data-menu="account"]',
      'text=Account Settings'
    ];

    let menuClicked = false;
    for (const selector of accountMenuSelectors) {
      try {
        const element = this.page.locator(selector).first();
        if (await element.isVisible({ timeout: 5000 }).catch(() => false)) {
          await element.click();
          console.log(`Clicked account menu using selector: ${selector}`);
          menuClicked = true;
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!menuClicked) {
      throw new Error('Could not find Account menu with any known selector');
    }

    await this.page.waitForTimeout(2000);

    // Click on List of Devices
    await this.waitForElementAndClick(config.selectors.navigation.listOfDevices);

    // Wait for the devices panel to be visible with increased timeout
    await this.page.waitForSelector(config.selectors.devList.container, {
        state: 'visible',
        timeout: 60000 // 1 minute timeout for devices panel
    });
  }
}

module.exports = TestHelpers;