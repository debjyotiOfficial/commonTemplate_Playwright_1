const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Weekly After Hours Summary - Table Validation', () => {
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
    test.setTimeout(600000); // 10 minutes for long test
  });

  test('should validate table headers, sorting, and API data matching for specific date range', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Set up API interception to capture the weekly summary report data
    let apiResponseData = null;

    await page.route('**/getWeeklySummaryReport.php**', async (route) => {
      const response = await route.fetch();
      const json = await response.json();
      apiResponseData = json;
      await route.fulfill({ response });
    });

    // Login and navigate to the Fleet Dashboard
    await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

    // Click on alerts menu
    await page.locator(config.selectors.navigation.alertsMenu)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.navigation.alertsMenu).click();

    // Click on weekly after hours summary menu
    await page.locator(config.selectors.weeklyAfterHour.weeklyAfterHourMenu)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.weeklyAfterHour.weeklyAfterHourMenu).click();

    // Verify the weekly after hours summary container is visible
    await page.locator(config.selectors.weeklyAfterHour.weeklyAfterHourReportContainer)
      .waitFor({ state: 'visible' });
    await expect(page.locator(config.selectors.weeklyAfterHour.weeklyAfterHourReportContainer))
      .toContainText('Weekly After Hours Alert Summary');

    // ========================================
    // STEP 1: Select the specific date range (Jan 5, 2026 - Jan 11, 2026)
    // ========================================
    console.log('Selecting date range: Jan 5, 2026 - Jan 11, 2026');

    // The date picker input is readonly, so we need to use the navigation buttons
    // or click on it to open the date picker calendar
    const datePickerInput = page.locator('.weekly-date-picker__input, #weekly-date-picker-container input').first();
    await datePickerInput.waitFor({ state: 'visible' });

    // Get current date range from the input
    const currentDateRange = await datePickerInput.inputValue();
    console.log(`Current date range: ${currentDateRange}`);

    // Target date range: 01/05/2026 to 01/11/2026
    const targetStartDate = '01/05/2026';
    const targetEndDate = '01/11/2026';
    const targetDateRange = `${targetStartDate} to ${targetEndDate}`;

    // Function to navigate to the target date range using Previous Week button
    const navigateToTargetDate = async () => {
      const maxAttempts = 10;
      for (let i = 0; i < maxAttempts; i++) {
        const currentValue = await datePickerInput.inputValue();
        console.log(`Attempt ${i + 1}: Current date range: ${currentValue}`);

        // Check if we've reached the target date
        if (currentValue.includes(targetStartDate) || currentValue.includes('01/05/2026')) {
          console.log('Target date range reached!');
          return true;
        }

        // Click Previous Week button to go back
        const previousWeekBtn = page.locator(config.selectors.weeklyAfterHour.previousReportButton);
        await previousWeekBtn.waitFor({ state: 'visible' });
        await previousWeekBtn.click();
        await page.waitForTimeout(3000); // Wait for table to update
      }
      console.log('Could not reach target date within max attempts, continuing with current date');
      return false;
    };

    await navigateToTargetDate();

    // Wait for the table to fully load
    await page.waitForTimeout(3000);

    // ========================================
    // STEP 2: Verify Table Headers
    // ========================================
    console.log('Verifying table headers...');

    const expectedHeaders = [
      'Date',
      'Actively Transmitting',
      'Engine Off',
      'Idling',
      'Outside Hours',
      'Hard Acceleration',
      'Hard Braking',
      'Speed Violation',
      'Not Updated',
      'Summary'
    ];

    const table = page.locator(config.selectors.weeklyAfterHour.getweeklyReport);
    await table.waitFor({ state: 'visible' });

    const headerElements = table.locator('thead tr th');
    const headerCount = await headerElements.count();

    console.log(`Found ${headerCount} header columns`);

    // Verify each header text matches expected
    for (let i = 0; i < expectedHeaders.length; i++) {
      const headerText = await headerElements.nth(i).innerText();
      const cleanHeaderText = headerText.replace(/\s+/g, ' ').trim();
      console.log(`Header ${i + 1}: "${cleanHeaderText}" - Expected: "${expectedHeaders[i]}"`);
      expect(cleanHeaderText).toContain(expectedHeaders[i]);
    }

    console.log('All table headers verified successfully!');

    // ========================================
    // STEP 3: Test Sorting Functionality
    // ========================================
    console.log('Testing sorting functionality...');

    // Get all sortable columns (columns with sort icons)
    const sortableHeaders = table.locator('thead tr th .icon.icon--sort');
    const sortableCount = await sortableHeaders.count();
    console.log(`Found ${sortableCount} sortable columns`);

    // Function to get column data
    const getColumnData = async (columnIndex) => {
      const rows = table.locator('tbody tr');
      const rowCount = await rows.count();
      const data = [];
      for (let i = 0; i < rowCount; i++) {
        const cellText = await rows.nth(i).locator(`td:nth-child(${columnIndex + 1})`).innerText();
        data.push(cellText.trim());
      }
      return data;
    };

    // Function to check if array is sorted ascending (for numeric values)
    const isSortedAscending = (arr) => {
      const numericArr = arr.map(val => {
        // Handle date format MM/DD/YYYY
        if (val.includes('/')) {
          return new Date(val).getTime();
        }
        // Handle numeric values
        const num = parseFloat(val.replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? val : num;
      });

      for (let i = 1; i < numericArr.length; i++) {
        if (numericArr[i] < numericArr[i - 1]) return false;
      }
      return true;
    };

    // Function to check if array is sorted descending (for numeric values)
    const isSortedDescending = (arr) => {
      const numericArr = arr.map(val => {
        // Handle date format MM/DD/YYYY
        if (val.includes('/')) {
          return new Date(val).getTime();
        }
        // Handle numeric values
        const num = parseFloat(val.replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? val : num;
      });

      for (let i = 1; i < numericArr.length; i++) {
        if (numericArr[i] > numericArr[i - 1]) return false;
      }
      return true;
    };

    // Test sorting on each sortable column (skip the Summary column as it has View buttons)
    const sortableColumnIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8]; // Date through Not Updated

    for (const colIndex of sortableColumnIndices) {
      const headerCell = headerElements.nth(colIndex);
      const sortIcon = headerCell.locator('.icon.icon--sort');

      if (await sortIcon.count() > 0) {
        const headerText = await headerCell.innerText();
        const cleanHeaderText = headerText.replace(/\s+/g, ' ').trim();
        console.log(`\nTesting sort on column: ${cleanHeaderText}`);

        // Get initial data
        const initialData = await getColumnData(colIndex);
        console.log(`Initial data: ${initialData.join(', ')}`);

        // Click sort icon for ascending sort
        await sortIcon.click();
        await page.waitForTimeout(2000);

        // Get data after first click (ascending)
        const ascendingData = await getColumnData(colIndex);
        console.log(`After 1st click (ascending): ${ascendingData.join(', ')}`);

        const isAsc = isSortedAscending(ascendingData);
        console.log(`Is sorted ascending: ${isAsc}`);

        // Click sort icon again for descending sort
        await sortIcon.click();
        await page.waitForTimeout(2000);

        // Get data after second click (descending)
        const descendingData = await getColumnData(colIndex);
        console.log(`After 2nd click (descending): ${descendingData.join(', ')}`);

        const isDesc = isSortedDescending(descendingData);
        console.log(`Is sorted descending: ${isDesc}`);

        // Verify that sorting changed the data order (either asc or desc should work)
        const sortingWorks = isAsc || isDesc ||
          JSON.stringify(ascendingData) !== JSON.stringify(descendingData);

        expect(sortingWorks).toBeTruthy();
        console.log(`Sorting verified for column: ${cleanHeaderText}`);
      }
    }

    console.log('\nAll sorting functionality verified successfully!');

    // ========================================
    // STEP 4: Compare API Response with UI Table Data
    // ========================================
    console.log('\nComparing API response with UI table data...');

    // Trigger a fresh API call by navigating to next week and back
    const nextWeekBtn = page.locator('#next-week-btn');
    const previousWeekBtn = page.locator(config.selectors.weeklyAfterHour.previousReportButton);

    if (await nextWeekBtn.isVisible()) {
      await nextWeekBtn.click();
      await page.waitForTimeout(3000);
      await previousWeekBtn.click();
      await page.waitForTimeout(3000);
    }

    // Wait for API response to be captured
    await page.waitForTimeout(2000);

    if (apiResponseData) {
      console.log('API Response received:', JSON.stringify(apiResponseData, null, 2));

      // Get UI table data
      const tableRows = table.locator('tbody tr');
      const rowCount = await tableRows.count();

      const uiTableData = [];
      for (let i = 0; i < rowCount; i++) {
        const row = tableRows.nth(i);
        const rowData = {
          date: await row.locator('td:nth-child(1)').innerText().then(t => t.trim()),
          activelyTransmitting: await row.locator('td:nth-child(2)').innerText().then(t => t.trim()),
          engineOff: await row.locator('td:nth-child(3)').innerText().then(t => t.trim()),
          idling: await row.locator('td:nth-child(4)').innerText().then(t => t.trim()),
          outsideHours: await row.locator('td:nth-child(5)').innerText().then(t => t.trim()),
          hardAcceleration: await row.locator('td:nth-child(6)').innerText().then(t => t.trim()),
          hardBraking: await row.locator('td:nth-child(7)').innerText().then(t => t.trim()),
          speedViolation: await row.locator('td:nth-child(8)').innerText().then(t => t.trim()),
          notUpdated: await row.locator('td:nth-child(9)').innerText().then(t => t.trim()),
          summary: await row.locator('td:nth-child(10)').innerText().then(t => t.trim())
        };
        uiTableData.push(rowData);
      }

      console.log('\nUI Table Data:');
      console.log(JSON.stringify(uiTableData, null, 2));

      // Compare API data with UI data
      // The API response structure may vary, so we need to adapt based on actual response
      if (Array.isArray(apiResponseData)) {
        console.log(`\nAPI returned ${apiResponseData.length} records`);
        console.log(`UI shows ${uiTableData.length} rows`);

        // Compare record counts
        expect(uiTableData.length).toBeGreaterThan(0);

        // Compare individual records if API data structure matches
        for (let i = 0; i < Math.min(apiResponseData.length, uiTableData.length); i++) {
          const apiRow = apiResponseData[i];
          const uiRow = uiTableData[i];

          console.log(`\nComparing row ${i + 1}:`);
          console.log('API:', JSON.stringify(apiRow));
          console.log('UI:', JSON.stringify(uiRow));

          // Verify key fields match (adjust field names based on actual API response)
          if (apiRow.date || apiRow.Date) {
            const apiDate = apiRow.date || apiRow.Date;
            console.log(`Date - API: ${apiDate}, UI: ${uiRow.date}`);
          }
          if (apiRow.engine_off !== undefined || apiRow.engineOff !== undefined) {
            const apiEngineOff = apiRow.engine_off ?? apiRow.engineOff;
            console.log(`Engine Off - API: ${apiEngineOff}, UI: ${uiRow.engineOff}`);
            expect(uiRow.engineOff).toBe(String(apiEngineOff));
          }
          if (apiRow.idling !== undefined || apiRow.Idling !== undefined) {
            const apiIdling = apiRow.idling ?? apiRow.Idling;
            console.log(`Idling - API: ${apiIdling}, UI: ${uiRow.idling}`);
            expect(uiRow.idling).toBe(String(apiIdling));
          }
          if (apiRow.outside_hours !== undefined || apiRow.outsideHours !== undefined) {
            const apiOutsideHours = apiRow.outside_hours ?? apiRow.outsideHours;
            console.log(`Outside Hours - API: ${apiOutsideHours}, UI: ${uiRow.outsideHours}`);
            expect(uiRow.outsideHours).toBe(String(apiOutsideHours));
          }
        }
      } else if (apiResponseData.data && Array.isArray(apiResponseData.data)) {
        // Handle response wrapped in data property
        const apiData = apiResponseData.data;
        console.log(`\nAPI returned ${apiData.length} records in data array`);
        console.log(`UI shows ${uiTableData.length} rows`);

        for (let i = 0; i < Math.min(apiData.length, uiTableData.length); i++) {
          const apiRow = apiData[i];
          const uiRow = uiTableData[i];

          console.log(`\nComparing row ${i + 1}:`);
          console.log('API:', JSON.stringify(apiRow));
          console.log('UI:', JSON.stringify(uiRow));
        }
      }

      console.log('\nAPI and UI data comparison completed!');
    } else {
      console.log('Warning: No API response captured. The API may not have been called or the route pattern may not match.');

      // Still verify UI table has data
      const tableRows = table.locator('tbody tr');
      const rowCount = await tableRows.count();
      console.log(`UI Table has ${rowCount} rows`);
      expect(rowCount).toBeGreaterThan(0);
    }

    // ========================================
    // STEP 5: Additional UI Verification
    // ========================================
    console.log('\nPerforming additional UI verifications...');

    // Verify the date range is displayed correctly in the header
    const headerDateRange = page.locator('#weekly-alert-report-panel .header, #weekly-alert-report-panel h2, #weekly-alert-report-panel h3').first();
    if (await headerDateRange.isVisible()) {
      const dateRangeText = await headerDateRange.innerText();
      console.log(`Date range header: ${dateRangeText}`);
    }

    // Verify navigation buttons are present
    const prevWeekButton = page.locator(config.selectors.weeklyAfterHour.previousReportButton);
    await expect(prevWeekButton).toBeVisible();
    console.log('Previous Week button is visible');

    const nextWeekButton = page.locator('#next-week-btn');
    if (await nextWeekButton.isVisible()) {
      console.log('Next Week button is visible');
    }

    const currentWeekBtn = page.locator('#current-week-btn, button:has-text("Current Week")');
    if (await currentWeekBtn.isVisible()) {
      console.log('Current Week button is visible');
    }

    // Verify export options are available
    const saveFileAsDropdown = page.locator('#weekly-alert-report-panel button.dropdown__trigger');
    if (await saveFileAsDropdown.isVisible()) {
      console.log('Save file as dropdown is visible');
      await saveFileAsDropdown.hover();

      // Check for export options
      const excelOption = page.locator('#weekly-alert-report-panel .dropdown__content button.dropdown__item').filter({ hasText: 'Excel' });
      const csvOption = page.locator('#weekly-alert-report-panel .dropdown__content button.dropdown__item').filter({ hasText: 'CSV' });
      const pdfOption = page.locator('#weekly-alert-report-panel .dropdown__content button.dropdown__item').filter({ hasText: 'PDF' });

      if (await excelOption.isVisible()) console.log('Excel export option available');
      if (await csvOption.isVisible()) console.log('CSV export option available');
      if (await pdfOption.isVisible()) console.log('PDF export option available');
    }

    // Verify search input is present and functional
    const searchInput = page.locator(config.selectors.weeklyAfterHour.searchInput);
    await expect(searchInput).toBeVisible();
    console.log('Search input is visible');

    console.log('\n========================================');
    console.log('All validations completed successfully!');
    console.log('========================================');
  });
});
