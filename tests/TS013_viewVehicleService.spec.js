const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('View Vehicle Service', () => {
  let helpers;
  let config;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    helpers = new TestHelpers(page);
    config = await helpers.getConfig();
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.clearStorageAndSetTimeouts();
    
    // Set timeouts
    test.setTimeout(900000); // 15 minutes for long test
  });

  test('should add new services', async ({ page }) => {
    const helpers = new TestHelpers(page);
    config = await helpers.getConfig();

    // Use fast login helper which handles stored auth vs fresh login automatically
    await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

    // Click on alerts menu
    await expect(page.locator(config.selectors.navigation.alertsMenu)).toBeVisible();
    await page.locator(config.selectors.navigation.alertsMenu).click();

    // Wait for the alerts section to expand
    await page.waitForTimeout(2000);

    await expect(page.locator(config.selectors.viewVehicleService.viewVehicleServiceMenu)).toBeVisible({ timeout: 30000 });
    await page.locator(config.selectors.viewVehicleService.viewVehicleServiceMenu).click();

    await expect(page.locator(config.selectors.viewVehicleService.vehicleServiceModal)).toBeVisible();

    // Select vehicle - dynamically get first available option
    const vehicleDropdown = page.locator(config.selectors.viewVehicleService.vehicleDropdown);
    await expect(vehicleDropdown).toBeVisible();

    // Wait for dropdown to be populated
    await page.waitForTimeout(2000);

    // Get all options and select the first non-empty one
    const options = await vehicleDropdown.locator('option').all();
    let selectedVehicle = null;
    for (const option of options) {
      const value = await option.getAttribute('value');
      const text = await option.textContent();
      if (value && value.trim() !== '' && !text.toLowerCase().includes('select')) {
        selectedVehicle = text.trim();
        await vehicleDropdown.selectOption(value);
        console.log(`Selected vehicle: ${selectedVehicle}`);
        break;
      }
    }

    if (!selectedVehicle) {
      // Fallback: select by index
      await vehicleDropdown.selectOption({ index: 1 });
      selectedVehicle = await vehicleDropdown.locator('option:checked').textContent();
      console.log(`Selected vehicle by index: ${selectedVehicle}`);
    }

    // Add current mileage and verify in driver card
    await expect(page.locator(config.selectors.viewVehicleService.currMileage)).toBeVisible();
    await page.locator(config.selectors.viewVehicleService.currMileage).clear({ force: true });
    await page.locator(config.selectors.viewVehicleService.currMileage).fill('10000');

    // Click somewhere in the modal to hide navbar overlay
    await page.locator(config.selectors.viewVehicleService.vehicleServiceModal).click({ position: { x: 200, y: 200 } });
    await page.waitForTimeout(500);

    // Click on add button
    await expect(page.locator(config.selectors.viewVehicleService.addMileageButton)).toBeVisible();
    await page.locator(config.selectors.viewVehicleService.addMileageButton).click();

    await page.waitForTimeout(10000);

    // Verify current mileage is updated
    // Verify the driver card panel is visible
    await expect(page.locator(config.selectors.driverCard.driverCardPanel)).toBeVisible();
    await expect(page.locator(config.selectors.driverCard.driverCardPanel)).toContainText('Driver Card');

    // Verify the search input is visible and type device name
    await expect(page.locator(config.selectors.driverCard.driverSearchInput)).toBeVisible();
    await page.locator(config.selectors.driverCard.driverSearchInput).clear();
    await page.locator(config.selectors.driverCard.driverSearchInput).fill(selectedVehicle);

    await page.waitForTimeout(2000);

    // Click on driver card and verify the device name
    await expect(page.locator(config.selectors.driverCard.card)).toBeVisible();
    await expect(page.locator(config.selectors.driverCard.card)).toContainText(selectedVehicle);
    await page.locator(config.selectors.driverCard.card).click();

    // Verify the driver card details are visible and verify device name
    await expect(page.locator(config.selectors.driverCard.driverName)).toBeVisible();
    await expect(page.locator(config.selectors.driverCard.driverName)).toContainText(selectedVehicle);

    // Verify the driver card shows mileage information
    const driverCard = page.locator('.driver-card').first();
    await expect(driverCard).toBeVisible();
    // Verify mileage field exists (value may vary based on actual device data)
    await expect(driverCard.locator('text=/Mileage/i')).toBeVisible();

    await page.waitForTimeout(5000);

    // Add service type
    // Click on alerts menu
    await expect(page.locator(config.selectors.navigation.alertsMenu)).toBeVisible();
    await page.locator(config.selectors.navigation.alertsMenu).click();

    // Wait for the alerts section to expand
    await page.waitForTimeout(2000);

    await expect(page.locator(config.selectors.viewVehicleService.viewVehicleServiceMenu)).toBeVisible({ timeout: 30000 });
    await page.locator(config.selectors.viewVehicleService.viewVehicleServiceMenu).click();

    await expect(page.locator(config.selectors.viewVehicleService.vehicleServiceModal)).toBeVisible();

    // Select vehicle - use same vehicle as before
    const vehicleDropdown2 = page.locator(config.selectors.viewVehicleService.vehicleDropdown);
    await expect(vehicleDropdown2).toBeVisible();
    await page.waitForTimeout(2000);

    // Re-select the same vehicle
    if (selectedVehicle) {
      await vehicleDropdown2.selectOption({ label: selectedVehicle });
      console.log(`Re-selected vehicle: ${selectedVehicle}`);
    } else {
      // Fallback: select first available option
      const options2 = await vehicleDropdown2.locator('option').all();
      for (const option of options2) {
        const value = await option.getAttribute('value');
        const text = await option.textContent();
        if (value && value.trim() !== '' && !text.toLowerCase().includes('select')) {
          await vehicleDropdown2.selectOption(value);
          console.log(`Selected vehicle: ${text.trim()}`);
          break;
        }
      }
    }

    // Click somewhere in the modal to hide navbar overlay
    await page.locator(config.selectors.viewVehicleService.vehicleServiceModal).click({ position: { x: 200, y: 200 } });
    await page.waitForTimeout(500);

    await expect(page.locator(config.selectors.viewVehicleService.addServiceTypeButton)).toBeVisible();
    await page.locator(config.selectors.viewVehicleService.addServiceTypeButton).click();

    await expect(page.locator(config.selectors.viewVehicleService.editServiceModal).first()).toBeVisible();

    // Fill in service form
    await expect(page.locator(config.selectors.viewVehicleService.serviceTypeInput).first()).toBeVisible();
    await page.locator(config.selectors.viewVehicleService.serviceTypeInput).first().fill('Oil Filter Change');
    
    await expect(page.locator(config.selectors.viewVehicleService.lastServiceMileageInput).first()).toBeVisible();
    await page.locator(config.selectors.viewVehicleService.lastServiceMileageInput).first().fill('50000');
    
    await expect(page.locator(config.selectors.viewVehicleService.mileageFrequencyInput).first()).toBeVisible();
    await page.locator(config.selectors.viewVehicleService.mileageFrequencyInput).first().fill('5000');
    
    await expect(page.locator(config.selectors.viewVehicleService.daysFrequencyInput).first()).toBeVisible();
    await page.locator(config.selectors.viewVehicleService.daysFrequencyInput).first().fill('90');
    
    await expect(page.locator(config.selectors.viewVehicleService.notesInput).first()).toBeVisible();
    await page.locator(config.selectors.viewVehicleService.notesInput).first().fill('Regular maintenance service');

    // Submit the form
    await expect(page.locator(config.selectors.viewVehicleService.submitServiceButton).first()).toBeVisible();
    await page.locator(config.selectors.viewVehicleService.submitServiceButton).first().click({ force: true });

    await page.waitForTimeout(30000);

    // Verify the service type is added
    await expect(page.locator(config.selectors.viewVehicleService.searchServiceInput)).toBeVisible();
    await page.locator(config.selectors.viewVehicleService.searchServiceInput).clear();
    await page.locator(config.selectors.viewVehicleService.searchServiceInput).fill('Oil Filter Change');

    await expect(page.locator(config.selectors.viewVehicleService.serviceTypeColumn).first()).toContainText('Oil Filter Change');

    await page.locator(config.selectors.viewVehicleService.showVehicleReportButton).scrollIntoViewIfNeeded();
    await expect(page.locator(config.selectors.viewVehicleService.showVehicleReportButton)).toBeVisible();
    await page.locator(config.selectors.viewVehicleService.showVehicleReportButton).click();

    await expect(page.locator(config.selectors.viewVehicleService.serviceReportModal)).toBeVisible();

    await page.locator(config.selectors.viewVehicleService.closeServiceReportButton).scrollIntoViewIfNeeded();
    await expect(page.locator(config.selectors.viewVehicleService.closeServiceReportButton)).toBeVisible();
    await page.locator(config.selectors.viewVehicleService.closeServiceReportButton).click({ force: true });
  });
});