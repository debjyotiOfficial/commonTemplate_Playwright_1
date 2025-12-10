const fs = require('fs');
const path = require('path');

// Path to the stored authentication state
const AUTH_FILE = path.join(__dirname, '..', '.auth', 'user.json');

class TestHelpers {
  constructor(page) {
    this.page = page;
    this.config = null;
  }

  /**
   * Check if we have a valid stored authentication session
   * @returns {boolean} true if auth file exists and has valid data
   * NOTE: On BrowserStack, we always return false to force fresh login
   * because the local auth file cookies aren't loaded into the remote browser
   */
  hasStoredAuth() {
    // On BrowserStack, always perform fresh login
    // The BROWSERSTACK_BUILD_NAME env var is set by browserstack-node-sdk
    if (process.env.BROWSERSTACK_BUILD_NAME || process.env.BROWSERSTACK_USERNAME) {
      console.log('Running on BrowserStack - will perform fresh login');
      return false;
    }

    try {
      if (fs.existsSync(AUTH_FILE)) {
        const authData = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
        // Check if we have cookies (basic validation)
        return authData.cookies && authData.cookies.length > 0;
      }
    } catch (error) {
      console.log('No valid stored auth found:', error.message);
    }
    return false;
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
   * This method checks for stored auth first (local runs) and performs fresh login on BrowserStack
   * @param {string} pagePath - The URL or path to navigate to after login
   */
  async loginAndNavigateToPage(pagePath) {
    if (!this.config) {
      this.config = await this.getConfig();
    }

    // Check if we already have a stored authentication session
    // If storageState is loaded by Playwright config, we can skip login
    if (this.hasStoredAuth()) {
      console.log('Using stored authentication session (skipping login)...');
      try {
        // Navigate directly to the page - session cookies are already loaded
        await this.navigateToPage(pagePath);

        // Verify we're actually logged in by checking if we got redirected to login page
        const currentUrl = this.page.url();
        if (currentUrl.includes('login.php') || currentUrl.includes('client_login')) {
          console.log('Session expired or invalid, falling back to fresh login...');
          await this.performFreshLogin();
          await this.navigateAfterLogin(pagePath);
        }
      } catch (e) {
        console.log(`Stored auth navigation failed: ${e.message}`);
        console.log('Falling back to fresh login...');
        await this.performFreshLogin();
        await this.navigateAfterLogin(pagePath);
      }
    } else {
      console.log('No stored auth found, performing fresh login...');
      // Perform fresh login
      await this.performFreshLogin();
      await this.navigateAfterLogin(pagePath);
    }
  }

  /**
   * Navigate to page after login is complete
   * @param {string} pagePath - The URL or path to navigate to
   */
  async navigateAfterLogin(pagePath) {
    const baseUrl = 'https://www.gpsandfleet3.net';
    const fullUrl = pagePath.startsWith('http') ? pagePath : `${baseUrl}${pagePath}`;

    console.log(`Navigating to ${fullUrl}...`);
    await this.page.goto(fullUrl, {
      waitUntil: 'load',
      timeout: 120000
    });

    // Wait for page to load completely
    await this.page.waitForLoadState('networkidle').catch(() => {
      console.log('Network idle timeout after login, continuing...');
    });
    await this.page.waitForTimeout(5000);

    console.log('Page loaded successfully');
  }

  /**
   * Perform fresh login (used when no stored auth is available)
   * This is called on BrowserStack or first local run
   */
  async performFreshLogin() {
    if (!this.config) {
      this.config = await this.getConfig();
    }

    console.log('Performing login...');

    // Navigate to login page - use mainAdminLoginPage for consistency
    await this.page.goto(this.config.urls.mainAdminLoginPage);

    // Wait for and fill username field
    const usernameField = this.page.locator(this.config.selectors.login.usernameFieldBackup);
    await usernameField.waitFor({ state: 'visible', timeout: 30000 });
    await usernameField.clear();
    await usernameField.fill(this.config.credentials.demo.usernameBackup);

    // Wait for and fill password field
    const passwordField = this.page.locator(this.config.selectors.login.passwordFieldBackup);
    await passwordField.waitFor({ state: 'visible', timeout: 30000 });
    await passwordField.clear();
    await passwordField.fill(this.config.credentials.demo.passwordBackup);

    // Wait for and click submit button
    const submitButton = this.page.locator(this.config.selectors.login.submitButtonBackup);
    await submitButton.waitFor({ state: 'visible' });
    await submitButton.click();

    // Wait for navigation to complete
    await this.page.waitForLoadState('networkidle', { timeout: 30000 });

    // Small buffer to ensure session/cookies are fully established
    await this.page.waitForTimeout(3000);

    console.log('Login completed');
  }

  /**
   * Navigate directly to a page without login
   * Use this when authentication state is already loaded via storageState
   * @param {string} pagePath - The URL to navigate to
   * @param {number} retries - Number of retry attempts for flaky network
   */
  async navigateToPage(pagePath, retries = 3) {
    if (!this.config) {
      this.config = await this.getConfig();
    }

    // Auth is stored for gpsandfleet3.net domain, so always use that domain
    const baseUrl = 'https://www.gpsandfleet3.net';
    const fullUrl = pagePath.startsWith('http') ? pagePath : `${baseUrl}${pagePath}`;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Navigating directly to ${fullUrl}...${attempt > 1 ? ` (attempt ${attempt})` : ''}`);
        await this.page.goto(fullUrl, {
          waitUntil: 'load',  // Wait for full page load
          timeout: 120000  // 2 minutes per attempt
        });

        // Wait for network to settle, but don't fail if it takes too long
        await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
          console.log('Network idle timeout, continuing...');
        });

        await this.page.waitForTimeout(5000); // Wait for page to stabilize
        console.log('Page loaded successfully');
        return; // Success, exit the retry loop
      } catch (e) {
        console.log(`Navigation attempt ${attempt} failed: ${e.message}`);
        if (attempt === retries) {
          throw e; // Last attempt failed, rethrow
        }
        console.log('Retrying navigation...');
        await this.page.waitForTimeout(3000); // Brief pause before retry
      }
    }
  }

  async clearStorageAndSetTimeouts() {
    // IMPORTANT: Do NOT clear cookies if we have stored auth
    // The storageState is loaded by Playwright and clearing cookies would destroy the session
    if (!this.hasStoredAuth()) {
      // Only clear cookies if we don't have stored authentication
      await this.page.context().clearCookies();
      console.log('Cleared cookies (no stored auth)');
    } else {
      console.log('Preserving cookies (using stored auth session)');
    }
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
