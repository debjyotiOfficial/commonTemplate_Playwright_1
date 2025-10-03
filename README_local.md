# Playwright Fleet Management Tests

This project contains Playwright E2E tests for the fleet management system, converted from the original Cypress test suite.

## Project Structure

```
cypress-to-playwright-converted/
├── tests/                 # Playwright test files (converted from Cypress)
├── utils/                 # Helper utilities and shared functions
├── fixtures/              # Test data and configuration files
├── package.json          # Node.js dependencies and scripts
├── playwright.config.js  # Playwright configuration
└── README.md             # This file
```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Install browsers:**
   ```bash
   npx playwright install
   ```

3. **Run tests:**
   ```bash
   npm test
   ```

## Available Scripts

- `npm test` - Run all tests
- `npm run test:headed` - Run tests in headed mode
- `npm run test:debug` - Run tests in debug mode
- `npm run test:ui` - Run tests with UI mode
- `npm run test:chrome` - Run tests only in Chromium
- `npm run test:firefox` - Run tests only in Firefox
- `npm run test:webkit` - Run tests only in WebKit
- `npm run test:report` - Show test report

## Key Features

### Test Helpers
The `utils/test-helpers.js` file provides common functionality:
- Login automation
- Configuration loading
- Element interaction helpers
- Table verification
- Modal handling
- Screenshot capture

### Configuration Management
Tests use the `fixtures/tlr-config.json` file for:
- URLs and endpoints
- Login credentials
- Element selectors
- Timeouts
- Test data

### Example Usage

```javascript
const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Device Management', () => {
  test('should display list of devices', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    // Login using helper
    await helpers.login();
    
    // Navigate to devices
    const config = await helpers.loadConfig();
    await helpers.navigateToMenuItem(config.selectors.navigation.listOfDevices, {
      waitForModal: true,
      modalSelector: config.selectors.devList.container
    });
    
    // Verify table
    await helpers.waitForTable(config.selectors.devList.deviceTable);
  });
});
```

## Converted Test Files

The following test files have been converted from Cypress to Playwright:

### Core Functionality Tests
- `TS001_listOfDevice.spec.js` - Device list management
- `TS002_addEditDevices.spec.js` - Device creation and editing
- `TS003_ChangeTimezone.spec.js` - Timezone configuration
- `TS004_viewEditUser.spec.js` - User management
- `TS005_subgroup.spec.js` - Subgroup management
- `TS006_trackInfoDisplayOptions.spec.js` - Display options
- `TS007_pulsingIcon.spec.js` - Icon settings

### Report Tests
- Various report generation and verification tests
- Geofence and landmark reporting
- Mileage and utilization reports
- Driver safety and alert reports

### Dashcam Tests
- Live video streaming
- Alert management
- Video on demand
- Snapshot functionality

## Migration from Cypress

### Key Differences

| Cypress | Playwright |
|---------|------------|
| `cy.visit()` | `await page.goto()` |
| `cy.get()` | `await page.locator()` |
| `cy.click()` | `await element.click()` |
| `cy.type()` | `await element.fill()` |
| `cy.should()` | `await expect()` |
| `cy.wait()` | `await page.waitForTimeout()` |

### Benefits of Playwright
- Better handling of modern web apps
- Multiple browser support (Chrome, Firefox, Safari)
- Improved debugging capabilities
- Built-in waiting strategies
- Better screenshot and video recording

## Configuration

### Timeouts
The default timeouts are configured for the fleet management application:
- Action timeout: 10 seconds
- Navigation timeout: 30 seconds
- Report generation: Up to 200 seconds (for complex reports)

### Browsers
Tests run on:
- Chromium (default)
- Firefox
- WebKit (Safari engine)

## Debugging

### Debug Mode
```bash
npm run test:debug
```

### UI Mode
```bash
npm run test:ui
```

### Screenshots
Screenshots are automatically captured on test failures and saved to `test-results/`.

## Contributing

When adding new tests:

1. Use the TestHelpers class for common operations
2. Load configuration from the JSON file
3. Follow the established patterns from existing tests
4. Add proper error handling and timeouts
5. Include meaningful assertions

## Support

For issues related to:
- Test failures: Check the HTML report (`npm run test:report`)
- Configuration: Review `fixtures/tlr-config.json`
- Selectors: Verify element selectors are still valid
- Timeouts: Adjust timeouts in `playwright.config.js` if needed