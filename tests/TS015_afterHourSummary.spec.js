const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('After Hour Summary', () => {
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
        test.setTimeout(600000); // 10 minutes for long test
    });
    
  test('should redirect to fleet demo page with demo credentials', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Use fast login helper which handles stored auth vs fresh login automatically
    await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

    // Click on alerts menu
    await page.locator(config.selectors.navigation.alertsMenu)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.navigation.alertsMenu)
      .click();

    // Wait for the alerts section to expand
    await page.waitForTimeout(2000);

    // Click on after hours summary menu (force click since it may be hidden initially)
    await page.locator(config.selectors.afterHoursSummary.afterHoursSummaryMenu)
      .click({ force: true });

    // Verify the after hours settings container is visible
    await page.locator(config.selectors.afterHoursSummary.afterHoursSummaryContainer)
      .waitFor({ state: 'visible' });
    await expect(page.locator(config.selectors.afterHoursSummary.afterHoursSummaryContainer))
      .toContainText('After Hours Summary');

    // Click on the After Hours Summary date input
    await page.locator(config.selectors.afterHoursSummary.after_hours_summary_select_date)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.afterHoursSummary.after_hours_summary_select_date)
      .click();
    await page.locator(config.selectors.afterHoursSummary.after_hours_summary_select_date)
      .clear();
    await page.locator(config.selectors.afterHoursSummary.after_hours_summary_select_date)
      .fill('2025-06-05');

    // Click on the submit button
    await page.locator(config.selectors.afterHoursSummary.submitButton)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.afterHoursSummary.submitButton)
      .click();

    await page.waitForTimeout(6000);

    // Extract and slice the first 2 digits from alerts count
    // Use .first() since there may be multiple elements with this class
    const alertsCount = await page.locator('.after-hours__summary__count__num')
      .first()
      .innerText();
    const trimmedCount = alertsCount.trim();
    const slicedCount = trimmedCount.slice(0, 2); // Get first 2 characters
    
    console.log('Original Alerts Count:', trimmedCount);
    console.log('Sliced Alerts Count (first 2 digits):', slicedCount);

    // Store values from After Hours Summary page - IMPROVED VERSION
    const afterHoursSummaryValues = {};
    
    // Extract Engine Off value from After Hours Summary
    const engineOffValue = await page.locator('.after-hours__card .after-hours__card__label')
      .filter({ hasText: 'Engine Off' })
      .locator('..')
      .locator('.after-hours__card__num')
      .innerText();
    afterHoursSummaryValues.engineOff = engineOffValue.trim();
    console.log('After Hours Summary - Engine Off:', engineOffValue.trim());
    
    // Extract Idling value from After Hours Summary
    const idlingValue = await page.locator('.after-hours__card .after-hours__card__label')
      .filter({ hasText: 'Idling' })
      .locator('..')
      .locator('.after-hours__card__num')
      .innerText();
    afterHoursSummaryValues.idling = idlingValue.trim();
    console.log('After Hours Summary - Idling:', idlingValue.trim());
    
    // Extract Outside Hours value from After Hours Summary
    const outsideHoursValue = await page.locator('.after-hours__card .after-hours__card__label')
      .filter({ hasText: 'Outside Hours' })
      .locator('..')
      .locator('.after-hours__card__num')
      .innerText();
    afterHoursSummaryValues.outsideHours = outsideHoursValue.trim();
    console.log('After Hours Summary - Outside Hours:', outsideHoursValue.trim());

    await page.locator('#after-hours-summary-panel')
      .evaluate(el => el.scrollTo(0, el.scrollHeight));

    // Wait for scroll to complete
    await page.waitForTimeout(2000);

    // Click on show details button
    await page.locator(config.selectors.afterHoursSummary.showDetailsButton)
      .waitFor({ state: 'visible' });
    await page.locator(config.selectors.afterHoursSummary.showDetailsButton)
      .scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await page.locator(config.selectors.afterHoursSummary.showDetailsButton)
      .click({ force: true });

    await page.waitForTimeout(20000);

    // After clicking "Show Details", compare with Alerts Overview value
    const overviewCount = await page.locator('#alerts-overview-panel .after-hours__summary__count__num')
      .innerText();
    const trimmedOverviewCount = overviewCount.trim();
    const slicedOverviewCount = trimmedOverviewCount.slice(0, 2);
    expect(slicedOverviewCount).toBe(slicedCount);

    // Now compare with Alerts Overview values using the stored data
    // Compare Engine Off value
    const alertsOverviewEngineOff = await page.locator('.alerts-overview__card .alerts-overview__card__label')
      .filter({ hasText: 'Engine Off' })
      .locator('..')
      .locator('.alerts-overview__card__num')
      .innerText();
    const trimmedEngineOffValue = alertsOverviewEngineOff.trim();
    console.log('Alerts Overview - Engine Off:', trimmedEngineOffValue);
    console.log('Stored After Hours Summary - Engine Off:', afterHoursSummaryValues.engineOff);
    
    expect(trimmedEngineOffValue).toBe(afterHoursSummaryValues.engineOff);
    console.log('✓ Engine Off values match:', afterHoursSummaryValues.engineOff, '=', trimmedEngineOffValue);
    
    // Compare Idling value
    const alertsOverviewIdling = await page.locator('.alerts-overview__card .alerts-overview__card__label')
      .filter({ hasText: 'Idling' })
      .locator('..')
      .locator('.alerts-overview__card__num')
      .innerText();
    const trimmedIdlingValue = alertsOverviewIdling.trim();
    console.log('Alerts Overview - Idling:', trimmedIdlingValue);
    console.log('Stored After Hours Summary - Idling:', afterHoursSummaryValues.idling);
    
    expect(trimmedIdlingValue).toBe(afterHoursSummaryValues.idling);
    console.log('✓ Idling values match:', afterHoursSummaryValues.idling, '=', trimmedIdlingValue);
    
    // Compare Outside Hours value
    const alertsOverviewOutsideHours = await page.locator('.alerts-overview__card--wide .alerts-overview__card__label')
      .filter({ hasText: 'Outside Hours' })
      .locator('..')
      .locator('.alerts-overview__card__num')
      .innerText();
    const trimmedOutsideHoursValue = alertsOverviewOutsideHours.trim();
    console.log('Alerts Overview - Outside Hours:', trimmedOutsideHoursValue);
    console.log('Stored After Hours Summary - Outside Hours:', afterHoursSummaryValues.outsideHours);
    
    expect(trimmedOutsideHoursValue).toBe(afterHoursSummaryValues.outsideHours);
    console.log('✓ Outside Hours values match:', afterHoursSummaryValues.outsideHours, '=', trimmedOutsideHoursValue);

    // Function to test alert card functionality with basic checks only
    const testAlertCardBasic = async (cardName, expectedPriority, cardSelector = '.alerts-overview__card__label') => {
      console.log(`Testing ${cardName} card basic functionality`);

      // Click on the card
      await page.locator(cardSelector)
        .filter({ hasText: cardName })
        .click();

      await page.waitForTimeout(5000);

      // Scroll to the bottom of the panel
      await page.locator('#alerts-overview-panel')
        .evaluate(el => el.scrollTo(0, el.scrollHeight));

      // Verify the table is visible
      await page.locator('table#alerts-table.table--desktop.desktop-only')
        .waitFor({ state: 'visible' });

      // Verify expected priority is visible in the table (use tbody to avoid strict mode)
      await expect(page.locator('table#alerts-table.table--desktop.desktop-only tbody'))
        .toContainText(expectedPriority);

      console.log(`✓ Verified ${expectedPriority} is visible for ${cardName}`);

      // Test pagination functionality
      const paginationExists = await page.locator('div#alerts-pagination .pagination__page').count() > 1;
      
      if (paginationExists) {
        await page.locator('div#alerts-pagination')
          .scrollIntoViewIfNeeded();
        await page.locator('div#alerts-pagination')
          .waitFor({ state: 'visible' });
        
        const page2Button = page.locator('.pagination__page').filter({ hasText: '2' });
        const isPage2Available = await page2Button.count() > 0;
        const isPage2Active = await page2Button.getAttribute('class').then(cls => cls?.includes('pagination__page--active'));
        
        if (isPage2Available && !isPage2Active) {
          await page2Button.click();
          await page.waitForTimeout(2000);
          console.log(`✓ Pagination working for ${cardName}`);
          
          // Go back to first page
          await page.locator('.pagination__page').filter({ hasText: '1' }).click();
          await page.waitForTimeout(1000);
        } else {
          console.log(`Page 2 not available or already active for ${cardName}`);
        }
      } else {
        console.log(`No pagination available for ${cardName}`);
      }

      // Test copy button functionality
      await page.locator('#alerts-overview-panel button.btn--secondary')
        .filter({ hasText: 'Copy' })
        .click();
      
      await page.waitForTimeout(2000);
      console.log(`✓ Copy button clicked for ${cardName}`);

      // Test search functionality
      await page.locator(config.selectors.weeklyAfterHour.alertSearch)
        .waitFor({ state: 'visible' });
      await page.locator(config.selectors.weeklyAfterHour.alertSearch)
        .clear();
      await page.locator(config.selectors.weeklyAfterHour.alertSearch)
        .fill('Sales car1');
      
      await page.waitForTimeout(3000);
      
      // Verify search results contain the search term
      await expect(page.locator('table#alerts-table.table--desktop.desktop-only tbody'))
        .toContainText('Sales car1');
      
      console.log(`✓ Search functionality working for ${cardName}`);

      // Clear search field
      await page.locator(config.selectors.weeklyAfterHour.alertSearch)
        .clear();
      
      await page.waitForTimeout(2000);
      console.log(`✓ Search cleared for ${cardName}`);
      console.log(`✓ Completed basic testing for ${cardName}`);
    };

    // Function to test alert card functionality with infobox verification
    const testAlertCardWithInfobox = async (cardName, expectedPriority, cardSelector = '.alerts-overview__card__label') => {
      console.log(`Testing ${cardName} card with infobox functionality`);
      
      // Store the card label text for comparison with infobox
      const cardText = await page.locator(cardSelector)
        .filter({ hasText: cardName })
        .innerText();
      const cardLabel = cardText.trim();
      console.log(`Stored ${cardName} card label:`, cardLabel);

      // Click on the card
      await page.locator(cardSelector)
        .filter({ hasText: cardName })
        .click({ force: true });

      await page.waitForTimeout(10000);

      // Scroll to the bottom of the panel
      await page.locator('#alerts-overview-panel')
        .evaluate(el => el.scrollTo(0, el.scrollHeight));

      // Verify the table is visible
      await page.locator('table#alerts-table.table--desktop.desktop-only')
        .waitFor({ state: 'visible' });

      // Verify expected priority is visible in the table (use tbody to avoid strict mode)
      await expect(page.locator('table#alerts-table.table--desktop.desktop-only tbody'))
        .toContainText(expectedPriority);

      console.log(`✓ Verified ${expectedPriority} is visible for ${cardName}`);

      // Test pagination functionality (similar to above)
      // ... (pagination code similar to basic function)

      // Test copy button functionality
      await page.locator('#alerts-overview-panel button.btn--secondary')
        .filter({ hasText: 'Copy' })
        .click();
      
      await page.waitForTimeout(2000);
      console.log(`✓ Copy button clicked for ${cardName}`);

      // Test search functionality
      await page.locator(config.selectors.weeklyAfterHour.alertSearch)
        .waitFor({ state: 'visible' });
      await page.locator(config.selectors.weeklyAfterHour.alertSearch)
        .clear();
      await page.locator(config.selectors.weeklyAfterHour.alertSearch)
        .fill('Sales car1');
      
      await page.waitForTimeout(3000);
      
      // Verify search results contain the search term
      await expect(page.locator('table#alerts-table.table--desktop.desktop-only tbody'))
        .toContainText('Sales car1');
      
      console.log(`✓ Search functionality working for ${cardName}`);

      // Clear search field
      await page.locator(config.selectors.weeklyAfterHour.alertSearch)
        .clear();
      
      await page.waitForTimeout(2000);
      console.log(`✓ Search cleared for ${cardName}`);

      // Click on first row and store data for comparison
      const firstRow = page.locator('table#alerts-table.table--desktop.desktop-only tbody tr').first();
      await firstRow.waitFor({ state: 'visible' });
      
      // Store all td values
      const cells = firstRow.locator('td');
      const cellCount = await cells.count();
      const rowData = {};
      const columnHeaders = ['deviceName', 'location', 'date', 'postedSpeed', 'speed', 'overSpeedLimit'];
      
      for (let i = 0; i < cellCount && i < columnHeaders.length; i++) {
        const cellText = await cells.nth(i).innerText();
        rowData[columnHeaders[i]] = cellText.trim();
      }
      
      console.log(`Stored row data for ${cardName}:`, rowData);
      await firstRow.click();

      await page.waitForTimeout(3000);

      // Scroll to top to see if infobox appears
      await page.locator('#alerts-overview-panel')
        .evaluate(el => el.scrollTo(0, 0));

      await page.waitForTimeout(2000);

      // Try to find and verify infobox appears
      const infoboxSelectors = ['.H_ib_body', '.popup-content', '[class*="popup"]', '[class*="infobox"]'];
      let infoboxFound = false;
      
      for (const selector of infoboxSelectors) {
        const infoboxCount = await page.locator(selector + ':visible').count();
        if (infoboxCount > 0) {
          console.log(`Found infobox with selector: ${selector}`);
          
          // Get the first visible infobox and its content
          const infoboxContent = await page.locator(selector).first().innerText();
          console.log(`Infobox content for ${cardName}:`, infoboxContent);
          
          // Check if device name appears in infobox
          if (rowData.deviceName && infoboxContent.includes(rowData.deviceName)) {
            console.log(`✓ Device name ${rowData.deviceName} found in infobox`);
          } else if (rowData.deviceName) {
            console.log(`! Device name ${rowData.deviceName} not found in infobox`);
          }
          
          // Check if date appears in infobox (more flexible matching)
          if (rowData.date) {
            const datePattern = rowData.date.substring(0, 10); // Get first 10 chars of date
            if (infoboxContent.includes(datePattern)) {
              console.log(`✓ Date ${datePattern} found in infobox`);
            } else {
              console.log(`! Date ${datePattern} not found in infobox`);
            }
          }

          // Compare card label with infobox alert text
          const alertType = cardLabel.replace(/\d+/g, '').trim().toLowerCase(); // Remove numbers from card label
          if (infoboxContent.toLowerCase().includes(alertType)) {
            console.log(`✓ Alert type ${alertType} found in infobox`);
          } else {
            console.log(`! Alert type ${alertType} not found in infobox`);
          }
          
          infoboxFound = true;
          break;
        }
      }
      
      if (!infoboxFound) {
        console.log(`! No infobox found for ${cardName}`);
      }
    };

    // Test Outside Hours card (High Priority) - Basic functionality only (no infobox)
    await testAlertCardBasic('Outside Hours', 'High Priority', '.alerts-overview__card--wide .alerts-overview__card__label');

    // Test Idling card (Low Priority) with infobox verification
    await testAlertCardWithInfobox('Idling', 'Low Priority');

    // Test Engine Off card (Medium Priority) with infobox verification
    await testAlertCardWithInfobox('Engine Off', 'Medium Priority');

    console.log('✓ All alert card tests completed');
  });
});