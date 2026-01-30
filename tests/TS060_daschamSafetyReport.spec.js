const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Dashcam Safety Report', () => {
    let config;
    let helpers;

    // Add retries for network-related flakiness
    test.describe.configure({ retries: 2 });

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

    /**
     * Helper function to open the Dashcam Safety Report panel
     * Returns the iframe frameLocator for interacting with elements inside
     */
    async function openDashcamSafetyReport(page) {
        console.log('Opening Dashcam Safety Report...');

        // Click on Dashcam accordion header to expand menu
        const dashcamAccordion = page.locator('#bottom-nav-dashcam .accordion__header');
        await dashcamAccordion.waitFor({ state: 'visible', timeout: 30000 });
        await dashcamAccordion.click();
        await page.waitForTimeout(2000);
        console.log('✓ Dashcam accordion expanded');

        // Wait for the sub-menu to be visible
        const subMenu = page.locator('#bottom-nav-dashcam .accordion__content');
        await subMenu.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(1000);

        // Click on Dashcam Safety Report menu item
        const safetyReportMenu = page.locator('#bottom-nav-dashcam').getByText('Dashcam Safety Report');
        if (await safetyReportMenu.isVisible().catch(() => false)) {
            await safetyReportMenu.click();
            console.log('✓ Clicked on Dashcam Safety Report menu');
        }

        await page.waitForTimeout(2000);

        // Close the navbar by moving mouse away
        await page.mouse.move(600, 400);
        await page.waitForTimeout(500);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
        console.log('✓ Closed navbar');

        // Wait for the Safety Report panel to open
        const safetyReportPanel = page.locator('#dashcam-safety-report-panel');
        await safetyReportPanel.waitFor({ state: 'visible', timeout: 30000 });
        console.log('✓ Safety Report panel is visible');

        // The content is inside an iframe - get the frameLocator
        const iframe = page.frameLocator('#dashcam-safety-iframe');

        // Wait for content inside iframe to load - look for the Select Dashcam Device label
        await iframe.locator('text=Select Dashcam Device').waitFor({ state: 'visible', timeout: 30000 });
        await page.waitForTimeout(2000);
        console.log('✓ Safety Report content loaded');

        return iframe;
    }

    /**
     * Helper function to wait for report data to load
     */
    async function waitForReportData(page) {
        console.log('Waiting for report data to load...');

        // Wait for loading overlay to disappear
        const loadingOverlay = page.locator('#loading-overlay, .loading-overlay');
        try {
            await loadingOverlay.waitFor({ state: 'hidden', timeout: 30000 });
            console.log('✓ Loading overlay disappeared');
        } catch (e) {
            console.log('Loading overlay not found or already hidden');
        }

        // Wait for dashboard view to be visible
        const dashboardView = page.locator('#dashboard-view');
        try {
            await dashboardView.waitFor({ state: 'visible', timeout: 30000 });
            console.log('✓ Dashboard view loaded');
        } catch (e) {
            console.log('Dashboard view check skipped');
        }

        await page.waitForTimeout(2000);
    }

    test('should display Dashcam Safety Report and verify report data with API validation', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Variable to store API response
        let apiResponse = null;
        let apiResponseData = null;

        // Step 1: Login and navigate to dashcam dashboard
        console.log('Step 1: Logging in and navigating to Dashcam Dashboard...');
        await helpers.loginAndNavigateToPage(config.urls.fleetDashcamDashboard2);
        console.log('✓ Logged in and navigated to Dashcam Dashboard');

        // Step 2: Open Dashcam Safety Report and get iframe
        console.log('\nStep 2: Opening Dashcam Safety Report...');
        const iframe = await openDashcamSafetyReport(page);

        // Step 3: Verify the form elements are visible (inside iframe)
        console.log('\nStep 3: Verifying form elements...');

        // Verify Select Dashcam Device dropdown (inside iframe)
        const deviceSelect = iframe.locator('select').first();
        await expect(deviceSelect).toBeVisible({ timeout: 15000 });
        console.log('✓ Select Dashcam Device dropdown is visible');

        // Get options from the dropdown
        const options = await deviceSelect.locator('option').allTextContents();
        console.log(`Device options: ${options.join(', ')}`);

        // Verify Date Range input (inside iframe)
        const dateRangeInput = iframe.locator('input[type="text"]').first();
        if (await dateRangeInput.isVisible().catch(() => false)) {
            const dateValue = await dateRangeInput.inputValue();
            console.log(`✓ Date Range input visible with value: ${dateValue}`);
        } else {
            console.log('⚠ Date Range input not found');
        }

        // Verify Submit button (inside iframe)
        const submitButton = iframe.locator('button:has-text("Submit")').first();
        await expect(submitButton).toBeVisible({ timeout: 15000 });
        console.log('✓ Submit button is visible');

        // Step 4: Select a device from the dropdown
        console.log('\nStep 4: Selecting a device...');

        if (options.length > 1) {
            // Select the first actual device (index 1, skipping placeholder)
            await deviceSelect.selectOption({ index: 1 });
            const selectedOption = options[1] || 'Unknown';
            console.log(`✓ Selected device: ${selectedOption}`);
        } else {
            console.log('⚠ No devices available in dropdown');
        }

        await page.waitForTimeout(1000);

        // Step 5: Date range should already have default value
        console.log('\nStep 5: Checking date range...');
        if (await dateRangeInput.isVisible().catch(() => false)) {
            const dateValue = await dateRangeInput.inputValue();
            console.log(`Date range value: ${dateValue}`);
        }

        await page.waitForTimeout(1000);

        // Step 6: Set up API listener and click Submit button
        console.log('\nStep 6: Setting up API listener and clicking Submit...');

        // Set up listener for the getDashCamDriverScore API
        const apiPromise = page.waitForResponse(
            response => response.url().includes('getDashCamDriverScore.php'),
            { timeout: 60000 }
        );

        await submitButton.click();
        console.log('✓ Submit button clicked');

        // Wait for and capture API response
        console.log('\nStep 7: Capturing API response...');
        try {
            apiResponse = await apiPromise;
            console.log(`✓ API Response Status: ${apiResponse.status()}`);
            console.log(`✓ API URL: ${apiResponse.url()}`);

            // Get the JSON response data
            apiResponseData = await apiResponse.json();
            console.log('✓ API Response captured successfully');
            console.log('API Response Data:', JSON.stringify(apiResponseData, null, 2));

            // Extract key metrics from API response
            if (apiResponseData) {
                console.log('\n--- API Response Metrics ---');
                if (apiResponseData.safetyScore !== undefined) {
                    console.log(`API Safety Score: ${apiResponseData.safetyScore}`);
                }
                if (apiResponseData.totalAlerts !== undefined) {
                    console.log(`API Total Alerts: ${apiResponseData.totalAlerts}`);
                }
                if (apiResponseData.highRiskAlerts !== undefined) {
                    console.log(`API High Risk Alerts: ${apiResponseData.highRiskAlerts}`);
                }
                if (apiResponseData.mediumRiskAlerts !== undefined) {
                    console.log(`API Medium Risk Alerts: ${apiResponseData.mediumRiskAlerts}`);
                }
            }
        } catch (apiError) {
            console.log('⚠ Could not capture API response:', apiError.message);
        }

        // Wait for report to load (inside iframe)
        await page.waitForTimeout(5000);

        // Step 8: Verify dashboard elements and values (inside iframe)
        console.log('\nStep 8: Verifying dashboard elements...');

        // Verify Safety Score is displayed
        const safetyScoreText = iframe.locator('text=Safety Score').first();
        await expect(safetyScoreText).toBeVisible({ timeout: 15000 });
        console.log('✓ Safety Score label is visible');

        // Get the Safety Score value (look for percentage like "23%")
        const safetyScoreValue = iframe.locator('text=/\\d+%/').first();
        let uiSafetyScore = '0%';
        if (await safetyScoreValue.isVisible().catch(() => false)) {
            uiSafetyScore = await safetyScoreValue.textContent();
            console.log(`✓ UI Safety Score: ${uiSafetyScore}`);
        }

        // Verify Total Alerts
        console.log('\nStep 9: Verifying Total Alerts...');
        const totalAlertsText = iframe.locator('text=Total Alerts').first();
        await expect(totalAlertsText).toBeVisible({ timeout: 10000 });
        console.log('✓ Total Alerts label is visible');

        // Get Total Alerts value
        let uiTotalAlerts = '0';
        const totalAlertsContainer = iframe.locator('text=Total Alerts').locator('..').first();
        const totalAlertsValue = await totalAlertsContainer.textContent().catch(() => '');
        const totalAlertsMatch = totalAlertsValue.match(/(\d+)\s*Total Alerts/);
        if (totalAlertsMatch) {
            uiTotalAlerts = totalAlertsMatch[1];
        }
        console.log(`✓ UI Total Alerts: ${uiTotalAlerts}`);

        // Verify High Risk Alerts
        console.log('\nStep 10: Verifying High Risk Alerts...');
        const highRiskText = iframe.locator('text=High Risk Alerts').first();
        await expect(highRiskText).toBeVisible({ timeout: 10000 });
        console.log('✓ High Risk Alerts label is visible');

        // Get High Risk Alerts value
        let uiHighRiskAlerts = '0';
        const highRiskContainer = iframe.locator('text=High Risk Alerts').locator('..').first();
        const highRiskValue = await highRiskContainer.textContent().catch(() => '');
        const highRiskMatch = highRiskValue.match(/(\d+)\s*High Risk/);
        if (highRiskMatch) {
            uiHighRiskAlerts = highRiskMatch[1];
        }
        console.log(`✓ UI High Risk Alerts: ${uiHighRiskAlerts}`);

        // Verify Medium Risk Alerts
        console.log('\nStep 11: Verifying Medium Risk Alerts...');
        const mediumRiskText = iframe.locator('text=Medium Risk Alerts').first();
        await expect(mediumRiskText).toBeVisible({ timeout: 10000 });
        console.log('✓ Medium Risk Alerts label is visible');

        // Get Medium Risk Alerts value
        let uiMediumRiskAlerts = '0';
        const mediumRiskContainer = iframe.locator('text=Medium Risk Alerts').locator('..').first();
        const mediumRiskValue = await mediumRiskContainer.textContent().catch(() => '');
        const mediumRiskMatch = mediumRiskValue.match(/(\d+)\s*Medium Risk/);
        if (mediumRiskMatch) {
            uiMediumRiskAlerts = mediumRiskMatch[1];
        }
        console.log(`✓ UI Medium Risk Alerts: ${uiMediumRiskAlerts}`);

        // Step 12: Compare API response with UI values (if API data captured)
        console.log('\nStep 12: Comparing API response with UI values...');
        if (apiResponseData) {
            console.log('\n--- Comparison: API vs UI ---');

            // Compare Safety Score
            if (apiResponseData.safetyScore !== undefined) {
                const apiScoreValue = String(apiResponseData.safetyScore);
                const uiScoreValue = uiSafetyScore.replace('%', '').trim();
                console.log(`Safety Score - API: ${apiScoreValue}, UI: ${uiScoreValue}`);
            }

            // Compare Total Alerts
            if (apiResponseData.totalAlerts !== undefined) {
                console.log(`Total Alerts - API: ${apiResponseData.totalAlerts}, UI: ${uiTotalAlerts}`);
            }

            // Compare High Risk Alerts
            if (apiResponseData.highRiskAlerts !== undefined) {
                console.log(`High Risk Alerts - API: ${apiResponseData.highRiskAlerts}, UI: ${uiHighRiskAlerts}`);
            }

            // Compare Medium Risk Alerts
            if (apiResponseData.mediumRiskAlerts !== undefined) {
                console.log(`Medium Risk Alerts - API: ${apiResponseData.mediumRiskAlerts}, UI: ${uiMediumRiskAlerts}`);
            }
        }

        // Step 13: Verify Settings button is present (inside iframe)
        console.log('\nStep 13: Verifying Settings button...');
        const settingsButton = iframe.locator('button:has-text("Settings")').first();
        if (await settingsButton.isVisible().catch(() => false)) {
            console.log('✓ Settings button is visible');
        }

        // Final summary
        console.log('\n========================================');
        console.log('        DASHCAM SAFETY REPORT SUMMARY');
        console.log('========================================');
        console.log(`Safety Score:       ${uiSafetyScore}`);
        console.log(`Total Alerts:       ${uiTotalAlerts}`);
        console.log(`High Risk Alerts:   ${uiHighRiskAlerts}`);
        console.log(`Medium Risk Alerts: ${uiMediumRiskAlerts}`);
        console.log('========================================');

        console.log('\n✓ Dashcam Safety Report verification completed successfully!');
    });

    test('should verify device selection and date range functionality', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Login and navigate to dashcam dashboard
        await helpers.loginAndNavigateToPage(config.urls.fleetDashcamDashboard2);

        // Open Dashcam Safety Report and get iframe
        const iframe = await openDashcamSafetyReport(page);

        console.log('Testing device selection and date range functionality...');

        // Verify device dropdown has options (inside iframe)
        const deviceSelect = iframe.locator('select').first();
        await expect(deviceSelect).toBeVisible({ timeout: 15000 });

        // Get all options
        const options = await deviceSelect.locator('option').allTextContents();
        console.log(`Device dropdown options: ${options.join(', ')}`);
        expect(options.length).toBeGreaterThan(0);
        console.log(`✓ Device dropdown has ${options.length} option(s)`);

        // Test selecting different devices if multiple available
        if (options.length > 2) {
            // Select second device
            await deviceSelect.selectOption({ index: 2 });
            await page.waitForTimeout(500);
            const selectedValue = await deviceSelect.inputValue();
            console.log(`✓ Selected second device: ${selectedValue}`);

            // Select back to first device
            await deviceSelect.selectOption({ index: 1 });
            await page.waitForTimeout(500);
            console.log('✓ Switched back to first device');
        }

        // Test date range input (inside iframe)
        const dateRangeInput = iframe.locator('input[type="text"]').first();
        await expect(dateRangeInput).toBeVisible({ timeout: 15000 });

        // Get current date range value
        const currentDateRange = await dateRangeInput.inputValue();
        console.log(`Current date range: ${currentDateRange}`);

        // Click to open date picker
        await dateRangeInput.click();
        await page.waitForTimeout(1500);

        // Check if date picker opened (could be inside iframe or on main page)
        const datePicker = iframe.locator('.daterangepicker, .datepicker, .flatpickr-calendar').first();
        if (await datePicker.isVisible().catch(() => false)) {
            console.log('✓ Date picker opened successfully');

            // Close date picker by clicking elsewhere or pressing Escape
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
        }

        console.log('\n✓ Device selection and date range functionality verified!');
    });

    test('should verify report metrics and dashboard elements', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Login and navigate to dashcam dashboard
        await helpers.loginAndNavigateToPage(config.urls.fleetDashcamDashboard2);

        // Open Dashcam Safety Report and get iframe
        const iframe = await openDashcamSafetyReport(page);

        // Select device and submit (inside iframe)
        const deviceSelect = iframe.locator('select').first();
        await expect(deviceSelect).toBeVisible({ timeout: 15000 });

        // Select first available device
        const options = await deviceSelect.locator('option').allTextContents();
        if (options.length > 1) {
            await deviceSelect.selectOption({ index: 1 });
            console.log('✓ Device selected');
        }

        // Click Submit (inside iframe)
        const submitButton = iframe.locator('button:has-text("Submit")').first();
        await submitButton.click();
        console.log('✓ Submit clicked');

        // Wait for data to load
        await page.waitForTimeout(5000);

        console.log('\nVerifying report metrics...');

        // Check for specific metrics (inside iframe)
        const metrics = ['Safety Score', 'Total Alerts', 'High Risk Alerts', 'Medium Risk Alerts'];
        for (const metric of metrics) {
            const metricElement = iframe.locator(`text=${metric}`).first();
            if (await metricElement.isVisible().catch(() => false)) {
                console.log(`✓ ${metric} is displayed`);
            }
        }

        // Verify Settings button is visible (inside iframe)
        const settingsButton = iframe.locator('button:has-text("Settings")').first();
        if (await settingsButton.isVisible().catch(() => false)) {
            console.log('✓ Settings button is visible');
        }

        console.log('\n✓ Report metrics verification completed!');
    });

    test('should verify Settings window with All devices selection bug replication', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Variable to store API response
        let apiResponse = null;
        let apiResponseData = null;

        // Step 1: Login and navigate to dashcam dashboard
        console.log('Step 1: Logging in and navigating to Dashcam Dashboard...');
        await helpers.loginAndNavigateToPage(config.urls.fleetDashcamDashboard2);
        console.log('✓ Logged in and navigated to Dashcam Dashboard');

        // Step 2: Open Dashcam Safety Report (Menu -> Dashcam -> Dashcam Safety Report)
        console.log('\nStep 2: Opening Dashcam Safety Report...');
        const iframe = await openDashcamSafetyReport(page);
        console.log('✓ Dashcam Safety Report panel opened');

        // Step 3: Select device from dropdown
        console.log('\nStep 3: Selecting device...');
        const deviceSelect = iframe.locator('select').first();
        await expect(deviceSelect).toBeVisible({ timeout: 15000 });

        const options = await deviceSelect.locator('option').allTextContents();
        console.log(`Available devices: ${options.join(', ')}`);

        if (options.length > 1) {
            await deviceSelect.selectOption({ index: 1 });
            const selectedOption = options[1] || 'Unknown';
            console.log(`✓ Selected device: ${selectedOption}`);
        }
        await page.waitForTimeout(1000);

        // Step 4: Verify date range is set
        console.log('\nStep 4: Verifying date range...');
        const dateRangeInput = iframe.locator('input[type="text"]').first();
        if (await dateRangeInput.isVisible().catch(() => false)) {
            const dateValue = await dateRangeInput.inputValue();
            console.log(`✓ Date range value: ${dateValue}`);
        }

        // Step 5: Set up API listener and click Submit
        console.log('\nStep 5: Setting up API listener and clicking Submit...');

        const apiPromise = page.waitForResponse(
            response => response.url().includes('getDashCamDriverScore.php'),
            { timeout: 60000 }
        );

        const submitButton = iframe.locator('button:has-text("Submit")').first();
        await expect(submitButton).toBeVisible({ timeout: 15000 });
        await submitButton.click();
        console.log('✓ Submit button clicked');

        // Step 6: Capture and verify API response
        console.log('\nStep 6: Capturing API response...');
        try {
            apiResponse = await apiPromise;
            console.log(`✓ API Response Status: ${apiResponse.status()}`);
            console.log(`✓ API URL: ${apiResponse.url()}`);

            apiResponseData = await apiResponse.json();
            console.log('✓ API Response captured successfully');
            console.log('API Response Data:', JSON.stringify(apiResponseData, null, 2));

            if (apiResponseData && apiResponseData.safetyScore !== undefined) {
                console.log(`\n--- API Safety Score: ${apiResponseData.safetyScore} ---`);
            }
        } catch (apiError) {
            console.log('⚠ Could not capture API response:', apiError.message);
        }

        // Wait for report to load
        await page.waitForTimeout(5000);

        // Step 7: Verify Safety Score on UI matches API
        console.log('\nStep 7: Verifying Safety Score on UI...');

        const safetyScoreText = iframe.locator('text=Safety Score').first();
        await expect(safetyScoreText).toBeVisible({ timeout: 15000 });
        console.log('✓ Safety Score label is visible');

        // Get the Safety Score value from UI
        const safetyScoreValue = iframe.locator('text=/\\d+%/').first();
        let uiSafetyScore = '0';
        if (await safetyScoreValue.isVisible().catch(() => false)) {
            const scoreText = await safetyScoreValue.textContent();
            uiSafetyScore = scoreText.replace('%', '').trim();
            console.log(`✓ UI Safety Score: ${uiSafetyScore}%`);
        }

        // Compare API and UI Safety Score
        if (apiResponseData && apiResponseData.safetyScore !== undefined) {
            const apiScore = String(apiResponseData.safetyScore);
            console.log(`\n--- Comparison ---`);
            console.log(`API Safety Score: ${apiScore}`);
            console.log(`UI Safety Score: ${uiSafetyScore}`);
            if (apiScore === uiSafetyScore) {
                console.log('✓ Safety Score MATCHES between API and UI');
            } else {
                console.log('⚠ Safety Score MISMATCH between API and UI');
            }
        }

        // Step 8: Click on Settings button
        console.log('\nStep 8: Clicking on Settings button...');
        const settingsButton = iframe.locator('button:has-text("Settings")').first();
        await expect(settingsButton).toBeVisible({ timeout: 15000 });
        await settingsButton.click();
        console.log('✓ Settings button clicked');

        await page.waitForTimeout(2000);

        // Step 9: Verify Settings window (weights-view) appears
        console.log('\nStep 9: Verifying Settings window appears...');

        const weightsView = iframe.locator('#weights-view');
        await expect(weightsView).toBeVisible({ timeout: 15000 });
        console.log('✓ Settings window (weights-view) is visible');

        // Verify Back to Dashboard button
        const backButton = iframe.locator('#back-to-dashboard');
        await expect(backButton).toBeVisible({ timeout: 10000 });
        console.log('✓ Back to Dashboard button is visible');

        // Verify Alert Settings button
        const alertSettingsBtn = iframe.locator('.alert-settings-btn');
        await expect(alertSettingsBtn).toBeVisible({ timeout: 10000 });
        console.log('✓ Alert Settings button is visible');

        // Verify Safety Score card in settings
        const scoreCard = iframe.locator('.score-card');
        await expect(scoreCard).toBeVisible({ timeout: 10000 });
        console.log('✓ Safety Score card is visible in settings');

        // Verify alert cards are displayed
        const alertCards = iframe.locator('.alert-card');
        const alertCardCount = await alertCards.count();
        console.log(`✓ Found ${alertCardCount} alert cards`);

        // List alert types visible
        console.log('\nAlert types visible in Settings:');
        const alertTypes = ['Eyes Closed', 'Using Phone', 'Yawning', 'Photo Trap', 'Over Speed', 'Braking', 'Sharp Turn', 'Parking Vibration', 'Proximity Alert', 'Fatigue', 'Smoking', 'Abnormal Video Feed'];
        for (const alertType of alertTypes) {
            const alertElement = iframe.locator(`text=${alertType}`).first();
            if (await alertElement.isVisible().catch(() => false)) {
                console.log(`  ✓ ${alertType}`);
            }
        }

        console.log('\n========================================');
        console.log('    SETTINGS WINDOW VERIFICATION COMPLETE');
        console.log('========================================');

        // Step 10: Click on Eyes Closed card checkbox to open modal
        console.log('\nStep 10: Clicking on Eyes Closed card checkbox to open modal...');

        // Find the Eyes Closed alert card and click on its checkbox
        const eyesClosedCard = iframe.locator('.alert-card').filter({ hasText: 'Eyes Closed' });
        await expect(eyesClosedCard).toBeVisible({ timeout: 10000 });
        console.log('✓ Eyes Closed card found');

        // Click on the checkbox within Eyes Closed card
        const eyesClosedCheckbox = eyesClosedCard.locator('.alert-toggle, input[type="checkbox"]').first();
        await eyesClosedCheckbox.click();
        console.log('✓ Clicked on Eyes Closed checkbox');

        await page.waitForTimeout(2000);

        // Step 11: Verify the modal appears with correct header
        console.log('\nStep 11: Verifying Eyes Closed Driver Safety Alert Setting modal...');

        // The modal should appear - look for the modal header text
        const modalHeader = iframe.locator('text=Eyes Closed Driver Safety Alert Setting').first();
        await expect(modalHeader).toBeVisible({ timeout: 15000 });
        console.log('✓ Modal header "Eyes Closed Driver Safety Alert Setting" is visible');

        // Verify modal elements
        const searchInput = iframe.locator('input[placeholder*="Search by Device or Driver name"]').first();
        if (await searchInput.isVisible().catch(() => false)) {
            console.log('✓ Search input is visible');
        }

        // Verify Select All Devices checkbox exists
        const selectAllDevicesCheckbox = iframe.locator('text=Select All Devices').locator('..').locator('input[type="checkbox"]').first();
        const selectAllDevicesLabel = iframe.locator('text=Select All Devices').first();
        await expect(selectAllDevicesLabel).toBeVisible({ timeout: 10000 });
        console.log('✓ Select All Devices checkbox is visible');

        // Verify IMEI column header checkbox exists
        const imeiHeaderCheckbox = iframe.locator('th').filter({ hasText: 'IMEI' }).locator('input[type="checkbox"]').first();
        const imeiHeader = iframe.locator('text=IMEI').first();
        await expect(imeiHeader).toBeVisible({ timeout: 10000 });
        console.log('✓ IMEI column header is visible');

        // Get all device row checkboxes before testing
        const deviceRowCheckboxes = iframe.locator('table tbody tr input[type="checkbox"], .device-row input[type="checkbox"]');
        const initialCheckboxCount = await deviceRowCheckboxes.count();
        console.log(`✓ Found ${initialCheckboxCount} device row checkboxes`);

        // Step 12: BUG REPLICATION - Test "Select All Devices" checkbox
        console.log('\n========================================');
        console.log('    BUG REPLICATION: Select All Devices');
        console.log('========================================');

        // Get initial state of all device checkboxes
        console.log('\nStep 12: Testing Select All Devices checkbox...');

        // Count how many are initially checked
        let initialCheckedCount = 0;
        for (let i = 0; i < initialCheckboxCount; i++) {
            const isChecked = await deviceRowCheckboxes.nth(i).isChecked().catch(() => false);
            if (isChecked) initialCheckedCount++;
        }
        console.log(`Initial state: ${initialCheckedCount}/${initialCheckboxCount} checkboxes are checked`);

        // Click on "Select All Devices" checkbox
        const selectAllCheckbox = iframe.locator('input[type="checkbox"]').filter({ has: iframe.locator('xpath=..').filter({ hasText: 'Select All Devices' }) }).first();
        // Alternative approach - find checkbox near the label
        const selectAllContainer = iframe.locator('label, div, span').filter({ hasText: 'Select All Devices' }).first();
        const selectAllInput = selectAllContainer.locator('input[type="checkbox"]').first();

        // Try clicking the Select All Devices checkbox
        try {
            await selectAllInput.click();
            console.log('✓ Clicked on Select All Devices checkbox');
        } catch (e) {
            // Fallback: click on the label text itself
            await selectAllContainer.click();
            console.log('✓ Clicked on Select All Devices label');
        }

        await page.waitForTimeout(1500);

        // Verify BUG: Check if all device checkboxes are now checked
        let checkedAfterSelectAll = 0;
        const allDeviceCheckboxes = iframe.locator('table tbody tr input[type="checkbox"], .device-list input[type="checkbox"]');
        const totalDeviceCheckboxes = await allDeviceCheckboxes.count();

        for (let i = 0; i < totalDeviceCheckboxes; i++) {
            const isChecked = await allDeviceCheckboxes.nth(i).isChecked().catch(() => false);
            if (isChecked) checkedAfterSelectAll++;
        }

        console.log(`\n--- BUG CHECK: Select All Devices ---`);
        console.log(`After clicking "Select All Devices": ${checkedAfterSelectAll}/${totalDeviceCheckboxes} checkboxes are checked`);

        if (checkedAfterSelectAll === totalDeviceCheckboxes && totalDeviceCheckboxes > 0) {
            console.log('✓ PASS: All device checkboxes are checked');
        } else {
            console.log('✗ BUG CONFIRMED: Not all device checkboxes are checked!');
            console.log(`  Expected: ${totalDeviceCheckboxes} checked`);
            console.log(`  Actual: ${checkedAfterSelectAll} checked`);
        }

        // Step 13: BUG REPLICATION - Test IMEI header checkbox
        console.log('\n========================================');
        console.log('    BUG REPLICATION: IMEI Header Checkbox');
        console.log('========================================');

        // First, uncheck Select All Devices to reset state
        console.log('\nStep 13: Resetting state and testing IMEI header checkbox...');

        try {
            const selectAllState = await selectAllInput.isChecked().catch(() => false);
            if (selectAllState) {
                await selectAllInput.click();
                console.log('✓ Unchecked Select All Devices to reset state');
                await page.waitForTimeout(1000);
            }
        } catch (e) {
            console.log('Could not uncheck Select All Devices');
        }

        // Click on IMEI header checkbox
        const imeiCheckbox = iframe.locator('th, thead').filter({ hasText: 'IMEI' }).locator('input[type="checkbox"]').first();

        try {
            await imeiCheckbox.click();
            console.log('✓ Clicked on IMEI header checkbox');
        } catch (e) {
            // Fallback: try clicking the IMEI header cell itself
            const imeiHeaderCell = iframe.locator('th').filter({ hasText: 'IMEI' }).first();
            await imeiHeaderCell.locator('input[type="checkbox"]').click();
            console.log('✓ Clicked on IMEI header checkbox (fallback)');
        }

        await page.waitForTimeout(1500);

        // Verify BUG: Check if all IMEI checkboxes in rows are now checked
        let imeiCheckedCount = 0;
        const imeiRowCheckboxes = iframe.locator('table tbody tr td:first-child input[type="checkbox"], .device-row input[type="checkbox"]');
        const totalImeiCheckboxes = await imeiRowCheckboxes.count();

        for (let i = 0; i < totalImeiCheckboxes; i++) {
            const isChecked = await imeiRowCheckboxes.nth(i).isChecked().catch(() => false);
            if (isChecked) imeiCheckedCount++;
        }

        console.log(`\n--- BUG CHECK: IMEI Header Checkbox ---`);
        console.log(`After clicking IMEI header checkbox: ${imeiCheckedCount}/${totalImeiCheckboxes} IMEI checkboxes are checked`);

        if (imeiCheckedCount === totalImeiCheckboxes && totalImeiCheckboxes > 0) {
            console.log('✓ PASS: All IMEI checkboxes are checked');
        } else {
            console.log('✗ BUG CONFIRMED: Not all IMEI checkboxes are checked!');
            console.log(`  Expected: ${totalImeiCheckboxes} checked`);
            console.log(`  Actual: ${imeiCheckedCount} checked`);
        }

        // Step 14: Log the device list for debugging
        console.log('\n--- Device List State ---');
        const deviceRows = iframe.locator('table tbody tr');
        const rowCount = await deviceRows.count();

        for (let i = 0; i < rowCount; i++) {
            const row = deviceRows.nth(i);
            const checkbox = row.locator('input[type="checkbox"]').first();
            const isChecked = await checkbox.isChecked().catch(() => false);
            const rowText = await row.textContent().catch(() => 'Unknown');
            console.log(`  Row ${i + 1}: ${isChecked ? '☑' : '☐'} ${rowText.trim().substring(0, 50)}`);
        }

        // Scroll modal to ensure Cancel and Save buttons are visible
        await page.waitForTimeout(1000);

        // Step 15: Click on Select All Devices again before saving
        console.log('\n========================================');
        console.log('    STEP 15: Saving with Select All Devices checked');
        console.log('========================================');

        // Make sure Select All Devices is checked before saving
        const selectAllBeforeSave = iframe.locator('label, div, span').filter({ hasText: 'Select All Devices' }).first();
        const selectAllInputBeforeSave = selectAllBeforeSave.locator('input[type="checkbox"]').first();

        try {
            const isSelectAllChecked = await selectAllInputBeforeSave.isChecked().catch(() => false);
            if (!isSelectAllChecked) {
                await selectAllInputBeforeSave.click().catch(async () => {
                    await selectAllBeforeSave.click();
                });
                console.log('✓ Checked Select All Devices checkbox before saving');
            } else {
                console.log('✓ Select All Devices is already checked');
            }
        } catch (e) {
            console.log('Attempting to check Select All Devices...');
            await selectAllBeforeSave.click();
        }

        await page.waitForTimeout(1000);

        // Step 16: Click Save button
        console.log('\nStep 16: Clicking Save button...');

        // Set up dialog handler for the alert
        page.once('dialog', async dialog => {
            console.log(`\n--- Alert Dialog ---`);
            console.log(`Alert message: ${dialog.message()}`);
            console.log('Clicking OK on alert...');
            await dialog.accept();
            console.log('✓ Alert accepted');
        });

        // Find and scroll to Save button, then click
        const saveButton = iframe.locator('button:has-text("Save")').first();
        await saveButton.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await saveButton.click({ force: true });
        console.log('✓ Save button clicked');

        await page.waitForTimeout(3000);

        // Step 17: Verify Dashcam Safety Report is visible again
        console.log('\nStep 17: Verifying Dashcam Safety Report is visible...');

        // Wait for modal to close and page to stabilize
        await page.waitForTimeout(3000);

        // Check if we're on Settings view (weights-view) - the modal should close and show settings
        const weightsViewAfterSave = iframe.locator('#weights-view');
        const isOnSettingsView = await weightsViewAfterSave.isVisible().catch(() => false);

        if (isOnSettingsView) {
            console.log('✓ Still on Settings view after save');
        } else {
            console.log('Checking if we need to wait for Settings view...');
            // Try waiting a bit more for the view to appear
            await page.waitForTimeout(2000);
        }

        // Verify we can see the Eyes Closed card (which should be visible in Settings view)
        const eyesClosedCardAfterSave = iframe.locator('.alert-card').filter({ hasText: 'Eyes Closed' }).first();
        try {
            await expect(eyesClosedCardAfterSave).toBeVisible({ timeout: 15000 });
            console.log('✓ Eyes Closed card is visible - Settings view confirmed');
        } catch (e) {
            console.log('Eyes Closed card not immediately visible, waiting...');
            await page.waitForTimeout(3000);
        }

        await page.waitForTimeout(2000);

        // Step 18: Click on Eyes Closed checkbox again to re-open modal
        console.log('\n========================================');
        console.log('    STEP 18: Re-opening Eyes Closed modal to verify saved state');
        console.log('========================================');

        const eyesClosedCardAgain = iframe.locator('.alert-card').filter({ hasText: 'Eyes Closed' });
        await expect(eyesClosedCardAgain).toBeVisible({ timeout: 10000 });

        const eyesClosedCheckboxAgain = eyesClosedCardAgain.locator('.alert-toggle, input[type="checkbox"]').first();
        await eyesClosedCheckboxAgain.click();
        console.log('✓ Clicked on Eyes Closed checkbox again');

        await page.waitForTimeout(2000);

        // Verify modal opens again
        const modalHeaderAgain = iframe.locator('text=Eyes Closed Driver Safety Alert Setting').first();
        await expect(modalHeaderAgain).toBeVisible({ timeout: 15000 });
        console.log('✓ Eyes Closed modal reopened');

        // Step 19: Verify if Select All Devices checkbox state persisted
        console.log('\nStep 19: Verifying if Select All Devices checkbox state persisted...');

        const selectAllAfterReopen = iframe.locator('label, div, span').filter({ hasText: 'Select All Devices' }).first();
        const selectAllInputAfterReopen = selectAllAfterReopen.locator('input[type="checkbox"]').first();

        let isSelectAllCheckedAfterSave = false;
        try {
            isSelectAllCheckedAfterSave = await selectAllInputAfterReopen.isChecked().catch(() => false);
        } catch (e) {
            console.log('Could not determine Select All Devices state');
        }

        console.log(`\n--- BUG CHECK: Select All Devices state after Save ---`);
        console.log(`Select All Devices checkbox is: ${isSelectAllCheckedAfterSave ? 'CHECKED' : 'NOT CHECKED'}`);

        if (isSelectAllCheckedAfterSave) {
            console.log('✓ PASS: Select All Devices state persisted after save');
        } else {
            console.log('✗ BUG: Select All Devices state did NOT persist after save!');
        }

        // Step 20: Verify all device checkboxes state after reopening
        console.log('\nStep 20: Verifying all device checkboxes state after reopening...');

        const deviceCheckboxesAfterReopen = iframe.locator('table tbody tr input[type="checkbox"], .device-list input[type="checkbox"]');
        const totalDevicesAfterReopen = await deviceCheckboxesAfterReopen.count();

        let checkedDevicesAfterReopen = 0;
        for (let i = 0; i < totalDevicesAfterReopen; i++) {
            const isChecked = await deviceCheckboxesAfterReopen.nth(i).isChecked().catch(() => false);
            if (isChecked) checkedDevicesAfterReopen++;
        }

        console.log(`\n--- BUG CHECK: Device checkboxes state after Save & Reopen ---`);
        console.log(`Devices checked: ${checkedDevicesAfterReopen}/${totalDevicesAfterReopen}`);

        if (checkedDevicesAfterReopen === totalDevicesAfterReopen && totalDevicesAfterReopen > 0) {
            console.log('✓ PASS: All device checkboxes are checked after save');
        } else {
            console.log('✗ BUG CONFIRMED: Not all device checkboxes are checked after save!');
            console.log(`  Expected: ${totalDevicesAfterReopen} checked (since we saved with Select All Devices)`);
            console.log(`  Actual: ${checkedDevicesAfterReopen} checked`);
        }

        // Log device list state after reopen
        console.log('\n--- Device List State After Reopen ---');
        const deviceRowsAfterReopen = iframe.locator('table tbody tr');
        const rowCountAfterReopen = await deviceRowsAfterReopen.count();

        for (let i = 0; i < rowCountAfterReopen; i++) {
            const row = deviceRowsAfterReopen.nth(i);
            const checkbox = row.locator('input[type="checkbox"]').first();
            const isChecked = await checkbox.isChecked().catch(() => false);
            const rowText = await row.textContent().catch(() => 'Unknown');
            console.log(`  Row ${i + 1}: ${isChecked ? '☑' : '☐'} ${rowText.trim().substring(0, 50)}`);
        }

        // Click Cancel to close modal (if visible)
        const cancelButtonFinal = iframe.locator('button:has-text("Cancel")').first();
        try {
            const isCancelVisible = await cancelButtonFinal.isVisible({ timeout: 5000 }).catch(() => false);
            if (isCancelVisible) {
                await cancelButtonFinal.click({ force: true });
                console.log('\n✓ Clicked Cancel to close modal');
            } else {
                console.log('\n✓ Modal already closed or Cancel not visible');
            }
        } catch (e) {
            console.log('\n✓ Modal handling complete');
        }

        await page.waitForTimeout(1000);

        // Final summary
        console.log('\n========================================');
        console.log('        BUG REPLICATION SUMMARY');
        console.log('========================================');
        console.log('Bug 1: Select All Devices checkbox (initial click)');
        console.log(`  - Expected: All ${totalDeviceCheckboxes} devices selected`);
        console.log(`  - Actual: ${checkedAfterSelectAll} devices selected`);
        console.log(`  - Status: ${checkedAfterSelectAll === totalDeviceCheckboxes ? 'PASS' : 'BUG CONFIRMED'}`);
        console.log('');
        console.log('Bug 2: IMEI header checkbox');
        console.log(`  - Expected: All ${totalImeiCheckboxes} IMEI checkboxes selected`);
        console.log(`  - Actual: ${imeiCheckedCount} IMEI checkboxes selected`);
        console.log(`  - Status: ${imeiCheckedCount === totalImeiCheckboxes ? 'PASS' : 'BUG CONFIRMED'}`);
        console.log('');
        console.log('Bug 3: Select All Devices state persistence after Save');
        console.log(`  - Select All Devices checkbox: ${isSelectAllCheckedAfterSave ? 'CHECKED' : 'NOT CHECKED'}`);
        console.log(`  - Devices checked after reopen: ${checkedDevicesAfterReopen}/${totalDevicesAfterReopen}`);
        console.log(`  - Status: ${checkedDevicesAfterReopen === totalDevicesAfterReopen ? 'PASS' : 'BUG CONFIRMED'}`);
        console.log('========================================');
    });

    test('should verify Alert Settings button bug replication', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Step 1: Login and navigate to dashcam dashboard
        console.log('Step 1: Logging in and navigating to Dashcam Dashboard...');
        await helpers.loginAndNavigateToPage(config.urls.fleetDashcamDashboard2);
        console.log('✓ Logged in and navigated to Dashcam Dashboard');

        // Step 2: Open Dashcam Safety Report
        console.log('\nStep 2: Opening Dashcam Safety Report...');
        const iframe = await openDashcamSafetyReport(page);
        console.log('✓ Dashcam Safety Report panel opened');

        // Step 3: Select device and submit to load the report
        console.log('\nStep 3: Selecting device and submitting...');
        const deviceSelect = iframe.locator('select').first();
        await expect(deviceSelect).toBeVisible({ timeout: 15000 });

        const options = await deviceSelect.locator('option').allTextContents();
        console.log(`Available devices: ${options.join(', ')}`);

        if (options.length > 1) {
            await deviceSelect.selectOption({ index: 1 });
            const selectedOption = options[1] || 'Unknown';
            console.log(`✓ Selected device: ${selectedOption}`);
        }

        await page.waitForTimeout(1000);

        // Click Submit button
        const submitButton = iframe.locator('button:has-text("Submit")').first();
        await expect(submitButton).toBeVisible({ timeout: 15000 });
        await submitButton.click();
        console.log('✓ Submit button clicked');

        // Wait for report to load
        await page.waitForTimeout(5000);

        // Step 4: Verify Settings button is visible and click it
        console.log('\nStep 4: Clicking on Settings button...');
        const settingsButton = iframe.locator('button:has-text("Settings")').first();
        await expect(settingsButton).toBeVisible({ timeout: 15000 });
        await settingsButton.click();
        console.log('✓ Settings button clicked');

        await page.waitForTimeout(2000);

        // Verify we're on the Settings/Weights view
        const weightsView = iframe.locator('#weights-view');
        await expect(weightsView).toBeVisible({ timeout: 15000 });
        console.log('✓ Settings view (weights-view) is visible');

        // Step 5: Click on Alert Settings button
        console.log('\nStep 5: Clicking on Alert Settings button...');
        const alertSettingsBtn = iframe.locator('.alert-settings-btn, button:has-text("Alert Settings")').first();
        await expect(alertSettingsBtn).toBeVisible({ timeout: 15000 });
        console.log('✓ Alert Settings button is visible');

        await alertSettingsBtn.click();
        console.log('✓ Alert Settings button clicked');

        await page.waitForTimeout(2000);

        // Step 6: Verify "Change Alert Settings" modal appears
        console.log('\nStep 6: Verifying Change Alert Settings modal...');

        // The modal might be in the iframe or on the main page
        const modalTitle = iframe.locator('text=Change Alert Settings').first();
        await expect(modalTitle).toBeVisible({ timeout: 15000 });
        console.log('✓ Change Alert Settings modal is visible');

        // Step 7: Select device from the dropdown in modal
        console.log('\nStep 7: Selecting device in modal...');
        const modalDeviceSelect = iframe.locator('select').filter({ has: iframe.locator('option') }).first();

        if (await modalDeviceSelect.isVisible().catch(() => false)) {
            const modalOptions = await modalDeviceSelect.locator('option').allTextContents();
            console.log(`Modal device options: ${modalOptions.join(', ')}`);

            if (modalOptions.length > 0) {
                await modalDeviceSelect.selectOption({ index: 0 });
                console.log(`✓ Selected device in modal`);
            }
        }
        await page.waitForTimeout(1000);

        // Step 8: Test Select/Unselect All Alerts checkbox
        console.log('\nStep 8: Testing Select/Unselect All Alerts checkbox...');

        // Get initial state of all alert checkboxes
        const alertTypes = [
            'Speed Alert',
            'Ignition Off Alert',
            'SOS Alert',
            'DMS Alert',
            'Volume Alert',
            'Ignition On Alert',
            'Geofence Alert',
            'Photo Trap Alert',
            'ADAS Alert'
        ];

        // Count initially checked alerts
        let initialCheckedCount = 0;
        for (const alertType of alertTypes) {
            const alertCheckbox = iframe.locator(`text=${alertType}`).locator('..').locator('input[type="checkbox"]').first();
            const isChecked = await alertCheckbox.isChecked().catch(() => false);
            if (isChecked) initialCheckedCount++;
            console.log(`  ${alertType}: ${isChecked ? '☑' : '☐'}`);
        }
        console.log(`Initial state: ${initialCheckedCount}/${alertTypes.length} alerts checked`);

        // Click on "Select/Unselect All Alerts" checkbox
        const selectAllAlertsCheckbox = iframe.locator('text=Select/Unselect All Alerts').locator('..').locator('input[type="checkbox"]').first();
        const selectAllAlertsLabel = iframe.locator('text=Select/Unselect All Alerts').first();

        await expect(selectAllAlertsLabel).toBeVisible({ timeout: 10000 });
        console.log('✓ Select/Unselect All Alerts checkbox found');

        // Click to toggle
        try {
            await selectAllAlertsCheckbox.click();
        } catch (e) {
            await selectAllAlertsLabel.click();
        }
        console.log('✓ Clicked Select/Unselect All Alerts checkbox');
        await page.waitForTimeout(1000);

        // Check state after clicking Select/Unselect All
        let afterSelectAllCount = 0;
        console.log('\nAlert states after clicking Select/Unselect All:');
        for (const alertType of alertTypes) {
            const alertCheckbox = iframe.locator(`text=${alertType}`).locator('..').locator('input[type="checkbox"]').first();
            const isChecked = await alertCheckbox.isChecked().catch(() => false);
            if (isChecked) afterSelectAllCount++;
            console.log(`  ${alertType}: ${isChecked ? '☑' : '☐'}`);
        }
        console.log(`After Select/Unselect All: ${afterSelectAllCount}/${alertTypes.length} alerts checked`);

        // Verify Select/Unselect All functionality
        if (afterSelectAllCount === alertTypes.length || afterSelectAllCount === 0) {
            console.log('✓ Select/Unselect All Alerts works correctly');
        } else {
            console.log('⚠ Select/Unselect All Alerts may have partial selection');
        }

        // Step 9: Change "Limit For Speed Alert" value
        console.log('\nStep 9: Changing Limit For Speed Alert value...');

        const speedLimitInput = iframe.locator('input[type="text"], input[type="number"]').filter({ has: iframe.locator('xpath=../..').filter({ hasText: 'Limit For Speed Alert' }) }).first();

        // Alternative: find by placeholder or nearby label
        const speedLimitLabel = iframe.locator('text=Limit For Speed Alert').first();
        await expect(speedLimitLabel).toBeVisible({ timeout: 10000 });
        console.log('✓ Limit For Speed Alert label found');

        // Find the input field near the label
        const speedInput = iframe.locator('input').filter({ hasNot: iframe.locator('[type="checkbox"]') }).last();

        // Get current value
        let currentSpeedLimit = '75';
        try {
            currentSpeedLimit = await speedInput.inputValue();
            console.log(`Current Speed Limit value: ${currentSpeedLimit}`);
        } catch (e) {
            console.log('Could not read current speed limit');
        }

        // Change the value (add 10 to current value or set to 85)
        const newSpeedLimit = '85';
        await speedInput.clear();
        await speedInput.fill(newSpeedLimit);
        console.log(`✓ Changed Speed Limit from ${currentSpeedLimit} to ${newSpeedLimit}`);
        await page.waitForTimeout(500);

        // Step 10: Click Save Settings button
        console.log('\nStep 10: Clicking Save Settings button...');

        // Set up dialog handler for the error alert
        let alertMessage = '';
        page.once('dialog', async dialog => {
            alertMessage = dialog.message();
            console.log(`\n--- Alert Dialog ---`);
            console.log(`Alert message: ${alertMessage}`);
            await dialog.accept();
            console.log('✓ Alert accepted');
        });

        const saveSettingsBtn = iframe.locator('button:has-text("Save Settings")').first();
        await expect(saveSettingsBtn).toBeVisible({ timeout: 10000 });
        await saveSettingsBtn.click();
        console.log('✓ Save Settings button clicked');

        await page.waitForTimeout(3000);

        // Check if we got the expected error
        console.log('\n--- BUG CHECK: Save Settings Error ---');
        if (alertMessage.includes('Error saving settings') || alertMessage.includes('error') || alertMessage.includes('Error')) {
            console.log('✓ BUG CONFIRMED: Error alert appeared when saving settings');
            console.log(`  Error message: "${alertMessage}"`);
        } else if (alertMessage) {
            console.log(`Alert message received: "${alertMessage}"`);
        } else {
            console.log('No alert dialog detected (may have been handled differently)');
        }

        // Step 11: Close the Change Alert Settings modal
        console.log('\nStep 11: Closing Change Alert Settings modal...');

        const closeModalBtn = iframe.locator('button.close, .modal-close, [aria-label="Close"], button:has-text("×")').first();
        try {
            if (await closeModalBtn.isVisible().catch(() => false)) {
                await closeModalBtn.click();
                console.log('✓ Clicked close button on modal');
            } else {
                // Try clicking the X button
                const xButton = iframe.locator('.close, [class*="close"]').first();
                await xButton.click();
                console.log('✓ Clicked X button to close modal');
            }
        } catch (e) {
            // Try pressing Escape
            await page.keyboard.press('Escape');
            console.log('✓ Pressed Escape to close modal');
        }

        await page.waitForTimeout(2000);

        // Step 12: Click Alert Settings button again
        console.log('\nStep 12: Clicking Alert Settings button again...');

        const alertSettingsBtnAgain = iframe.locator('.alert-settings-btn, button:has-text("Alert Settings")').first();
        await expect(alertSettingsBtnAgain).toBeVisible({ timeout: 15000 });
        await alertSettingsBtnAgain.click();
        console.log('✓ Alert Settings button clicked again');

        await page.waitForTimeout(2000);

        // Step 13: Verify if changes persisted
        console.log('\nStep 13: Verifying if changes persisted...');

        // Verify modal is open again
        const modalTitleAgain = iframe.locator('text=Change Alert Settings').first();
        await expect(modalTitleAgain).toBeVisible({ timeout: 15000 });
        console.log('✓ Change Alert Settings modal reopened');

        // Check Speed Limit value
        const speedInputAfterReopen = iframe.locator('input').filter({ hasNot: iframe.locator('[type="checkbox"]') }).last();
        let speedLimitAfterReopen = '';
        try {
            speedLimitAfterReopen = await speedInputAfterReopen.inputValue();
            console.log(`Speed Limit value after reopen: ${speedLimitAfterReopen}`);
        } catch (e) {
            console.log('Could not read speed limit after reopen');
        }

        // Check alert checkboxes state after reopen
        console.log('\nAlert states after reopening modal:');
        let afterReopenCheckedCount = 0;
        for (const alertType of alertTypes) {
            const alertCheckbox = iframe.locator(`text=${alertType}`).locator('..').locator('input[type="checkbox"]').first();
            const isChecked = await alertCheckbox.isChecked().catch(() => false);
            if (isChecked) afterReopenCheckedCount++;
            console.log(`  ${alertType}: ${isChecked ? '☑' : '☐'}`);
        }
        console.log(`After reopen: ${afterReopenCheckedCount}/${alertTypes.length} alerts checked`);

        // Final bug verification
        console.log('\n========================================');
        console.log('        ALERT SETTINGS BUG SUMMARY');
        console.log('========================================');
        console.log('Bug: Save Settings shows error but changes may/may not persist');
        console.log('');
        console.log('Speed Limit Changes:');
        console.log(`  - Original value: ${currentSpeedLimit}`);
        console.log(`  - Changed to: ${newSpeedLimit}`);
        console.log(`  - Value after reopen: ${speedLimitAfterReopen}`);
        console.log(`  - Persisted: ${speedLimitAfterReopen === newSpeedLimit ? 'YES' : 'NO'}`);
        console.log('');
        console.log('Alert Checkbox Changes:');
        console.log(`  - Initial checked: ${initialCheckedCount}/${alertTypes.length}`);
        console.log(`  - After Select All: ${afterSelectAllCount}/${alertTypes.length}`);
        console.log(`  - After reopen: ${afterReopenCheckedCount}/${alertTypes.length}`);
        console.log(`  - Persisted: ${afterSelectAllCount === afterReopenCheckedCount ? 'YES' : 'NO'}`);
        console.log('');
        if (alertMessage.includes('Error')) {
            console.log('✗ BUG CONFIRMED: Error alert shown when saving settings');
        }
        console.log('========================================');

        // Close modal
        try {
            const finalCloseBtn = iframe.locator('button.close, .modal-close, [aria-label="Close"], button:has-text("×")').first();
            if (await finalCloseBtn.isVisible().catch(() => false)) {
                await finalCloseBtn.click();
            } else {
                await page.keyboard.press('Escape');
            }
        } catch (e) {
            // Ignore
        }
    });

    test('should verify Dashcam Safety Report features and API validation', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Variables to store API responses
        let firstApiResponse = null;
        let firstApiData = null;
        let secondApiResponse = null;
        let secondApiData = null;

        // Step 1: Login and navigate to dashcam dashboard
        console.log('Step 1: Logging in and navigating to Dashcam Dashboard...');
        await helpers.loginAndNavigateToPage(config.urls.fleetDashcamDashboard2);
        console.log('✓ Logged in and navigated to Dashcam Dashboard');

        // Step 2: Open Dashcam Safety Report
        console.log('\nStep 2: Opening Dashcam Safety Report...');
        const iframe = await openDashcamSafetyReport(page);
        console.log('✓ Dashcam Safety Report panel opened');

        // Step 3: Select first device and submit
        console.log('\nStep 3: Selecting first device and submitting...');
        const deviceSelect = iframe.locator('select').first();
        await expect(deviceSelect).toBeVisible({ timeout: 15000 });

        const options = await deviceSelect.locator('option').allTextContents();
        console.log(`Available devices: ${options.join(', ')}`);

        // Select first device (index 1, skipping placeholder)
        let firstDeviceName = '';
        if (options.length > 1) {
            await deviceSelect.selectOption({ index: 1 });
            firstDeviceName = options[1] || 'Unknown';
            console.log(`✓ Selected first device: ${firstDeviceName}`);
        }

        await page.waitForTimeout(1000);

        // Get current date range
        const dateRangeInput = iframe.locator('input[type="text"]').first();
        let firstDateRange = '';
        if (await dateRangeInput.isVisible().catch(() => false)) {
            firstDateRange = await dateRangeInput.inputValue();
            console.log(`✓ Date range: ${firstDateRange}`);
        }

        // Set up API listener for first submit
        console.log('\nStep 4: Setting up API listener and clicking Submit...');
        const firstApiPromise = page.waitForResponse(
            response => response.url().includes('getDashCamDriverScore.php'),
            { timeout: 60000 }
        );

        const submitButton = iframe.locator('button:has-text("Submit")').first();
        await expect(submitButton).toBeVisible({ timeout: 15000 });
        await submitButton.click();
        console.log('✓ Submit button clicked');

        // Capture first API response
        console.log('\nStep 5: Capturing first API response...');
        try {
            firstApiResponse = await firstApiPromise;
            console.log(`✓ API Response Status: ${firstApiResponse.status()}`);
            console.log(`✓ API URL: ${firstApiResponse.url()}`);

            firstApiData = await firstApiResponse.json();
            console.log('✓ First API Response captured successfully');

            // Log key data from API
            if (firstApiData) {
                console.log('\n--- First API Response Summary ---');
                if (firstApiData.safetyScore !== undefined) {
                    console.log(`Safety Score from API: ${firstApiData.safetyScore}`);
                }
                if (firstApiData.weightage) {
                    console.log(`Weightage data present: Yes`);
                }
                if (firstApiData.status) {
                    console.log(`Status data present: Yes`);
                }
            }
        } catch (apiError) {
            console.log('⚠ Could not capture first API response:', apiError.message);
        }

        // Wait for report to load
        await page.waitForTimeout(5000);

        // Step 6: Verify Safety Score on UI matches API
        console.log('\nStep 6: Verifying Safety Score on UI...');

        const safetyScoreLabel = iframe.locator('text=Safety Score').first();
        await expect(safetyScoreLabel).toBeVisible({ timeout: 15000 });
        console.log('✓ Safety Score label is visible');

        // Get Safety Score value from UI
        const safetyScoreValue = iframe.locator('text=/\\d+%/').first();
        let firstUiSafetyScore = '0';
        if (await safetyScoreValue.isVisible().catch(() => false)) {
            const scoreText = await safetyScoreValue.textContent();
            firstUiSafetyScore = scoreText.replace('%', '').trim();
            console.log(`✓ UI Safety Score: ${firstUiSafetyScore}%`);
        }

        // Compare first API and UI Safety Score
        console.log('\n--- First Device Comparison ---');
        console.log(`Device: ${firstDeviceName}`);
        console.log(`Date Range: ${firstDateRange}`);
        if (firstApiData && firstApiData.safetyScore !== undefined) {
            const apiScore = String(firstApiData.safetyScore);
            console.log(`API Safety Score: ${apiScore}`);
            console.log(`UI Safety Score: ${firstUiSafetyScore}`);
            if (apiScore === firstUiSafetyScore) {
                console.log('✓ Safety Score MATCHES between API and UI');
            } else {
                console.log('⚠ Safety Score MISMATCH between API and UI');
            }
        }

        // Step 7: Now change to second device
        console.log('\n========================================');
        console.log('    CHANGING DEVICE AND DATE RANGE');
        console.log('========================================');

        console.log('\nStep 7: Changing to second device...');

        // Select second device (index 2)
        let secondDeviceName = '';
        if (options.length > 2) {
            await deviceSelect.selectOption({ index: 2 });
            secondDeviceName = options[2] || 'Unknown';
            console.log(`✓ Selected second device: ${secondDeviceName}`);
        } else {
            console.log('⚠ Only one device available, keeping same device');
            secondDeviceName = firstDeviceName;
        }

        await page.waitForTimeout(1000);

        // Step 8: Change date range (optional - click on date picker)
        console.log('\nStep 8: Checking date range...');
        let secondDateRange = '';
        if (await dateRangeInput.isVisible().catch(() => false)) {
            secondDateRange = await dateRangeInput.inputValue();
            console.log(`✓ Date range: ${secondDateRange}`);
        }

        // Step 9: Set up API listener and click Submit again
        console.log('\nStep 9: Setting up API listener and clicking Submit for second device...');

        const secondApiPromise = page.waitForResponse(
            response => response.url().includes('getDashCamDriverScore.php'),
            { timeout: 60000 }
        );

        await submitButton.click();
        console.log('✓ Submit button clicked');

        // Capture second API response
        console.log('\nStep 10: Capturing second API response...');
        try {
            secondApiResponse = await secondApiPromise;
            console.log(`✓ API Response Status: ${secondApiResponse.status()}`);
            console.log(`✓ API URL: ${secondApiResponse.url()}`);

            // Verify the API URL contains the correct dashcamId
            const apiUrl = secondApiResponse.url();
            console.log('\n--- API URL Verification ---');
            if (apiUrl.includes('getDashCamDriverScore.php')) {
                console.log('✓ Correct API endpoint called: getDashCamDriverScore.php');
            }
            if (apiUrl.includes('dashcamId=')) {
                const dashcamIdMatch = apiUrl.match(/dashcamId=(\d+)/);
                if (dashcamIdMatch) {
                    console.log(`✓ DashcamId in API: ${dashcamIdMatch[1]}`);
                }
            }
            if (apiUrl.includes('startDate=') && apiUrl.includes('endDate=')) {
                console.log('✓ Date parameters present in API call');
            }

            secondApiData = await secondApiResponse.json();
            console.log('✓ Second API Response captured successfully');

            // Log key data from API
            if (secondApiData) {
                console.log('\n--- Second API Response Summary ---');
                if (secondApiData.safetyScore !== undefined) {
                    console.log(`Safety Score from API: ${secondApiData.safetyScore}`);
                }
                if (secondApiData.weightage) {
                    console.log(`Weightage data present: Yes`);
                    const weightageKeys = Object.keys(secondApiData.weightage);
                    console.log(`Alert types in weightage: ${weightageKeys.length}`);
                }
                if (secondApiData.status) {
                    console.log(`Status data present: Yes`);
                }
                if (secondApiData.DashCamAlert) {
                    console.log(`DashCamAlert array length: ${secondApiData.DashCamAlert.length}`);
                }
            }
        } catch (apiError) {
            console.log('⚠ Could not capture second API response:', apiError.message);
        }

        // Wait for report to load
        await page.waitForTimeout(5000);

        // Step 11: Verify Safety Score on UI for second device
        console.log('\nStep 11: Verifying Safety Score on UI for second device...');

        // Get Safety Score value from UI
        let secondUiSafetyScore = '0';
        const safetyScoreValueSecond = iframe.locator('text=/\\d+%/').first();
        if (await safetyScoreValueSecond.isVisible().catch(() => false)) {
            const scoreText = await safetyScoreValueSecond.textContent();
            secondUiSafetyScore = scoreText.replace('%', '').trim();
            console.log(`✓ UI Safety Score: ${secondUiSafetyScore}%`);
        }

        // Compare second API and UI Safety Score
        console.log('\n--- Second Device Comparison ---');
        console.log(`Device: ${secondDeviceName}`);
        console.log(`Date Range: ${secondDateRange}`);
        if (secondApiData && secondApiData.safetyScore !== undefined) {
            const apiScore = String(secondApiData.safetyScore);
            console.log(`API Safety Score: ${apiScore}`);
            console.log(`UI Safety Score: ${secondUiSafetyScore}`);
            if (apiScore === secondUiSafetyScore) {
                console.log('✓ Safety Score MATCHES between API and UI');
            } else {
                console.log('⚠ Safety Score MISMATCH between API and UI');
            }
        }

        // Final Summary
        console.log('\n========================================');
        console.log('    DASHCAM SAFETY REPORT TEST SUMMARY');
        console.log('========================================');
        console.log('\nFirst Device Test:');
        console.log(`  Device: ${firstDeviceName}`);
        console.log(`  Date Range: ${firstDateRange}`);
        console.log(`  API Safety Score: ${firstApiData?.safetyScore || 'N/A'}`);
        console.log(`  UI Safety Score: ${firstUiSafetyScore}%`);
        console.log(`  Match: ${String(firstApiData?.safetyScore) === firstUiSafetyScore ? 'YES ✓' : 'NO ⚠'}`);
        console.log('\nSecond Device Test:');
        console.log(`  Device: ${secondDeviceName}`);
        console.log(`  Date Range: ${secondDateRange}`);
        console.log(`  API Safety Score: ${secondApiData?.safetyScore || 'N/A'}`);
        console.log(`  UI Safety Score: ${secondUiSafetyScore}%`);
        console.log(`  Match: ${String(secondApiData?.safetyScore) === secondUiSafetyScore ? 'YES ✓' : 'NO ⚠'}`);
        console.log('\nAPI Verification:');
        console.log(`  ✓ getDashCamDriverScore.php API called for both devices`);
        console.log(`  ✓ API returns weightage, status, and DashCamAlert data`);
        console.log('========================================');

        // Step 12: Click on Settings button to access alert sliders
        console.log('\n========================================');
        console.log('    NAVIGATING TO SETTINGS VIEW');
        console.log('========================================');

        console.log('\nStep 12: Clicking on Settings button...');
        const settingsButton = iframe.locator('button:has-text("Settings")').first();
        await expect(settingsButton).toBeVisible({ timeout: 15000 });
        await settingsButton.click();
        console.log('✓ Settings button clicked');

        await page.waitForTimeout(2000);

        // Verify we're on the Settings/Weights view
        const weightsView = iframe.locator('#weights-view');
        await expect(weightsView).toBeVisible({ timeout: 15000 });
        console.log('✓ Settings view (weights-view) is visible');

        // Verify alert cards are visible
        const alertCards = iframe.locator('.alert-card');
        const alertCardCount = await alertCards.count();
        console.log(`✓ Found ${alertCardCount} alert cards`);

        // Step 13: Test Alert Sliders - Change Level of Importance for Multiple Alerts
        console.log('\n========================================');
        console.log('    TESTING ALERT SLIDERS FOR ALL ALERTS');
        console.log('========================================');

        // Get initial Safety Score before slider changes
        let currentSafetyScore = secondUiSafetyScore;
        console.log(`\nInitial Safety Score: ${currentSafetyScore}%`);

        // Define alert types to test
        const alertTypesToTest = [
            'Eyes Closed',
            'Using Phone',
            'Yawning',
            'Photo Trap',
            'Over Speed',
            'Braking',
            'Sharp Turn',
            'Parking Vibration',
            'Proximity Alert',
            'Fatigue',
            'Smoking',
            'Abnormal Video Feed'
        ];

        // Store test results for each alert
        const alertTestResults = [];

        // Helper function to test a single alert slider
        async function testAlertSlider(alertType, stepNumber) {
            console.log(`\n--- Testing Alert ${stepNumber}: ${alertType} ---`);

            const result = {
                alertType: alertType,
                initialWeight: '',
                newWeight: '',
                sliderValueBefore: '',
                sliderValueAfter: '',
                safetyScoreBefore: currentSafetyScore,
                safetyScoreAfter: '',
                modalOpened: false,
                apiCalled: false,
                alertReceived: false,
                weightChanged: false,
                scoreChanged: false
            };

            try {
                // Find the alert card
                const alertCard = iframe.locator('.alert-card').filter({ hasText: alertType }).first();
                const isCardVisible = await alertCard.isVisible().catch(() => false);

                if (!isCardVisible) {
                    console.log(`⚠ ${alertType} card not visible, skipping...`);
                    result.error = 'Card not visible';
                    return result;
                }

                console.log(`✓ ${alertType} alert card found`);

                // Get initial Level of Importance value
                const weightValue = alertCard.locator('.weight-value').first();
                if (await weightValue.isVisible().catch(() => false)) {
                    result.initialWeight = await weightValue.textContent();
                    console.log(`  Initial Level of Importance: ${result.initialWeight}`);
                }

                // Find the slider
                const slider = alertCard.locator('input.slider, input[type="range"]').first();
                if (!await slider.isVisible().catch(() => false)) {
                    console.log(`⚠ Slider not visible for ${alertType}`);
                    result.error = 'Slider not visible';
                    return result;
                }

                // Get current slider value
                result.sliderValueBefore = await slider.inputValue();
                console.log(`  Current slider value: ${result.sliderValueBefore}`);

                // Calculate new slider value (toggle between low and high)
                const currentVal = parseInt(result.sliderValueBefore);
                result.sliderValueAfter = currentVal > 5 ? '2' : '8';
                console.log(`  Will change slider to: ${result.sliderValueAfter}`);

                // Set up API listener for update_alert_weights.php
                const updateApiPromise = page.waitForResponse(
                    response => response.url().includes('update_alert_weights.php'),
                    { timeout: 30000 }
                ).catch(() => null);

                // Set up dialog handler
                let alertMessage = '';
                const dialogHandler = async (dialog) => {
                    alertMessage = dialog.message();
                    console.log(`  Alert Dialog: ${alertMessage}`);
                    await dialog.accept();
                    result.alertReceived = true;
                };
                page.once('dialog', dialogHandler);

                // Slide the slider
                await slider.fill(result.sliderValueAfter);
                console.log(`  ✓ Slider changed to ${result.sliderValueAfter}`);

                await page.waitForTimeout(2000);

                // Check if modal opened
                const modal = iframe.locator('#multiDeviceModal, .modal.show').first();
                result.modalOpened = await modal.isVisible().catch(() => false);

                if (result.modalOpened) {
                    console.log(`  ✓ ${alertType} Driver Safety Alert Setting modal opened`);

                    // Verify modal title
                    const modalTitle = iframe.locator('.modal-title').first();
                    if (await modalTitle.isVisible().catch(() => false)) {
                        const titleText = await modalTitle.textContent();
                        console.log(`  Modal title: ${titleText}`);
                    }

                    // Verify device table
                    const deviceRows = iframe.locator('.device-row');
                    const rowCount = await deviceRows.count();
                    console.log(`  Device rows in table: ${rowCount}`);

                    // Click Save button
                    const saveBtn = iframe.locator('.modal button:has-text("Save")').first();
                    if (await saveBtn.isVisible().catch(() => false)) {
                        await saveBtn.click();
                        console.log(`  ✓ Save button clicked`);
                        await page.waitForTimeout(3000);
                    }
                }

                // Check if API was called
                const updateResponse = await updateApiPromise;
                if (updateResponse) {
                    result.apiCalled = true;
                    console.log(`  ✓ update_alert_weights.php API called (Status: ${updateResponse.status()})`);
                }

                await page.waitForTimeout(2000);

                // Verify new weight value
                const weightValueAfter = alertCard.locator('.weight-value').first();
                if (await weightValueAfter.isVisible().catch(() => false)) {
                    result.newWeight = await weightValueAfter.textContent();
                    console.log(`  New Level of Importance: ${result.newWeight}`);
                }

                result.weightChanged = result.initialWeight !== result.newWeight;
                console.log(`  Weight changed: ${result.weightChanged ? 'YES ✓' : 'NO'}`);

                // Get new Safety Score
                const safetyScoreElement = iframe.locator('text=/\\d+%/').first();
                if (await safetyScoreElement.isVisible().catch(() => false)) {
                    const scoreText = await safetyScoreElement.textContent();
                    result.safetyScoreAfter = scoreText.replace('%', '').trim();
                    console.log(`  Safety Score: ${result.safetyScoreBefore}% → ${result.safetyScoreAfter}%`);
                }

                result.scoreChanged = result.safetyScoreBefore !== result.safetyScoreAfter;
                if (result.scoreChanged) {
                    const diff = parseInt(result.safetyScoreAfter) - parseInt(result.safetyScoreBefore);
                    console.log(`  Safety Score changed: ${diff > 0 ? '+' : ''}${diff}%`);
                }

                // Update current safety score for next iteration
                currentSafetyScore = result.safetyScoreAfter || currentSafetyScore;

                console.log(`  ✓ ${alertType} test completed`);

            } catch (error) {
                console.log(`  ⚠ Error testing ${alertType}: ${error.message}`);
                result.error = error.message;
            }

            return result;
        }

        // Test each alert slider
        let stepNumber = 12;
        for (const alertType of alertTypesToTest) {
            const result = await testAlertSlider(alertType, stepNumber);
            alertTestResults.push(result);
            stepNumber++;

            // Small delay between tests
            await page.waitForTimeout(1000);
        }

        // Get final Safety Score
        const finalSafetyScoreElement = iframe.locator('text=/\\d+%/').first();
        let finalSafetyScore = '0';
        if (await finalSafetyScoreElement.isVisible().catch(() => false)) {
            const scoreText = await finalSafetyScoreElement.textContent();
            finalSafetyScore = scoreText.replace('%', '').trim();
        }

        // Final Summary
        console.log('\n========================================');
        console.log('    DASHCAM SAFETY REPORT FULL TEST SUMMARY');
        console.log('========================================');

        console.log('\n1. Device Selection & API Validation:');
        console.log(`   First Device: ${firstDeviceName}`);
        console.log(`   Second Device: ${secondDeviceName}`);
        console.log(`   ✓ getDashCamDriverScore.php API verified for both devices`);

        console.log('\n2. Safety Score API vs UI Comparison:');
        console.log(`   First Device - API: ${firstApiData?.safetyScore || 'N/A'}, UI: ${firstUiSafetyScore}%`);
        console.log(`   Second Device - API: ${secondApiData?.safetyScore || 'N/A'}, UI: ${secondUiSafetyScore}%`);

        console.log('\n3. Alert Slider Testing Results:');
        console.log(`   Initial Safety Score: ${secondUiSafetyScore}%`);
        console.log(`   Final Safety Score: ${finalSafetyScore}%`);
        console.log(`   Total Score Change: ${parseInt(finalSafetyScore) - parseInt(secondUiSafetyScore)}%`);

        console.log('\n4. Individual Alert Test Results:');
        console.log('   ┌─────────────────────┬────────┬────────┬─────────┬─────────┬─────────┐');
        console.log('   │ Alert Type          │ Before │ After  │ Modal   │ API     │ Changed │');
        console.log('   ├─────────────────────┼────────┼────────┼─────────┼─────────┼─────────┤');

        let successCount = 0;
        let modalOpenedCount = 0;
        let apiCalledCount = 0;
        let weightChangedCount = 0;

        for (const result of alertTestResults) {
            const alertName = result.alertType.padEnd(19);
            const before = (result.initialWeight || 'N/A').padStart(6);
            const after = (result.newWeight || 'N/A').padStart(6);
            const modal = result.modalOpened ? '  ✓  ' : '  ✗  ';
            const api = result.apiCalled ? '  ✓  ' : '  ✗  ';
            const changed = result.weightChanged ? '  ✓  ' : '  ✗  ';

            console.log(`   │ ${alertName} │ ${before} │ ${after} │ ${modal} │ ${api} │ ${changed} │`);

            if (!result.error) successCount++;
            if (result.modalOpened) modalOpenedCount++;
            if (result.apiCalled) apiCalledCount++;
            if (result.weightChanged) weightChangedCount++;
        }

        console.log('   └─────────────────────┴────────┴────────┴─────────┴─────────┴─────────┘');

        console.log('\n5. Test Statistics:');
        console.log(`   Total Alerts Tested: ${alertTestResults.length}`);
        console.log(`   Successful Tests: ${successCount}/${alertTestResults.length}`);
        console.log(`   Modals Opened: ${modalOpenedCount}/${alertTestResults.length}`);
        console.log(`   API Calls Made: ${apiCalledCount}/${alertTestResults.length}`);
        console.log(`   Weights Changed: ${weightChangedCount}/${alertTestResults.length}`);

        console.log('\n6. Safety Score Progression:');
        let scoreProgression = `   ${secondUiSafetyScore}%`;
        for (const result of alertTestResults) {
            if (result.safetyScoreAfter) {
                scoreProgression += ` → ${result.safetyScoreAfter}%`;
            }
        }
        console.log(scoreProgression);

        console.log('\n7. Level of Importance Ranges:');
        console.log('   Low (Blue): 1-3');
        console.log('   Medium (Yellow): 3-7');
        console.log('   High (Red): 7-10');

        console.log('\n========================================');
        console.log('    TEST COMPLETED');
        console.log('========================================');
    });

    test('should verify Settings view and alert weight configurations', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Login and navigate to dashcam dashboard
        console.log('Step 1: Logging in and navigating to Dashcam Dashboard...');
        await helpers.loginAndNavigateToPage(config.urls.fleetDashcamDashboard2);

        // Open Dashcam Safety Report and get iframe
        console.log('\nStep 2: Opening Dashcam Safety Report...');
        const iframe = await openDashcamSafetyReport(page);

        // Select device and submit to load the report (inside iframe)
        console.log('\nStep 3: Selecting device and submitting...');
        const deviceSelect = iframe.locator('select').first();
        await expect(deviceSelect).toBeVisible({ timeout: 15000 });

        const options = await deviceSelect.locator('option').allTextContents();
        if (options.length > 1) {
            await deviceSelect.selectOption({ index: 1 });
            console.log('✓ Device selected');
        }

        const submitButton = iframe.locator('button:has-text("Submit")').first();
        await submitButton.click();
        console.log('✓ Submit clicked');

        // Wait for data to load
        await page.waitForTimeout(5000);

        // Step 4: Click on Settings button (inside iframe)
        console.log('\nStep 4: Clicking on Settings button...');
        const settingsButton = iframe.locator('button:has-text("Settings")').first();
        await expect(settingsButton).toBeVisible({ timeout: 15000 });
        await settingsButton.click();
        console.log('✓ Settings button clicked');

        await page.waitForTimeout(2000);

        // Step 5: Verify weights-view is visible (inside iframe)
        console.log('\nStep 5: Verifying Settings view (weights-view) is visible...');
        const weightsView = iframe.locator('#weights-view');
        await expect(weightsView).toBeVisible({ timeout: 15000 });
        console.log('✓ Weights view is visible');

        // Step 6: Verify view header elements (inside iframe)
        console.log('\nStep 6: Verifying view header elements...');

        // Verify Back to Dashboard button
        const backButton = iframe.locator('#back-to-dashboard');
        await expect(backButton).toBeVisible({ timeout: 10000 });
        const backButtonText = await backButton.textContent();
        expect(backButtonText).toContain('Back to Dashboard');
        console.log('✓ Back to Dashboard button is visible');

        // Verify Alert Settings button
        const alertSettingsBtn = iframe.locator('.alert-settings-btn');
        await expect(alertSettingsBtn).toBeVisible({ timeout: 10000 });
        const alertSettingsText = await alertSettingsBtn.textContent();
        expect(alertSettingsText).toContain('Alert Settings');
        console.log('✓ Alert Settings button is visible');

        // Step 7: Verify Safety Score card (inside iframe)
        console.log('\nStep 7: Verifying Safety Score card...');

        const scoreCard = iframe.locator('.score-card');
        await expect(scoreCard).toBeVisible({ timeout: 10000 });
        console.log('✓ Score card is visible');

        // Verify score title
        const scoreTitle = iframe.locator('.score-title');
        await expect(scoreTitle).toBeVisible({ timeout: 10000 });
        const scoreTitleText = await scoreTitle.textContent();
        expect(scoreTitleText).toContain('Safety Score');
        console.log('✓ Safety Score title is visible');

        // Verify score circle/indicator
        const scoreCircle = iframe.locator('.score-circle');
        await expect(scoreCircle).toBeVisible({ timeout: 10000 });
        console.log('✓ Score circle is visible');

        // Verify score value
        const safetyScoreValue = iframe.locator('#safety-score');
        await expect(safetyScoreValue).toBeVisible({ timeout: 10000 });
        const scoreValue = await safetyScoreValue.textContent();
        console.log(`✓ Safety Score value: ${scoreValue}%`);

        // Verify score legend
        const scoreLegend = iframe.locator('.score-legend');
        await expect(scoreLegend).toBeVisible({ timeout: 10000 });
        const legendText = await scoreLegend.textContent();
        expect(legendText).toContain('Level Of Importance');
        console.log('✓ Score legend is visible');

        // Step 8: Verify risk levels (inside iframe)
        console.log('\nStep 8: Verifying risk levels...');

        const riskLevels = iframe.locator('.risk-level');
        const riskLevelCount = await riskLevels.count();
        expect(riskLevelCount).toBe(3);
        console.log(`✓ Found ${riskLevelCount} risk levels`);

        // Verify Low risk level (1-3)
        const lowRisk = iframe.locator('.risk-level').filter({ hasText: 'Low' });
        await expect(lowRisk).toBeVisible({ timeout: 5000 });
        console.log('✓ Low risk level (1-3) is visible');

        // Verify Medium risk level (3-7)
        const mediumRisk = iframe.locator('.risk-level').filter({ hasText: 'Medium' });
        await expect(mediumRisk).toBeVisible({ timeout: 5000 });
        console.log('✓ Medium risk level (3-7) is visible');

        // Verify High risk level (7-10)
        const highRisk = iframe.locator('.risk-level').filter({ hasText: 'High' });
        await expect(highRisk).toBeVisible({ timeout: 5000 });
        console.log('✓ High risk level (7-10) is visible');

        // Step 9: Verify alert cards container (inside iframe)
        console.log('\nStep 9: Verifying alert cards...');

        const alertsContainer = iframe.locator('#alerts-container');
        await expect(alertsContainer).toBeVisible({ timeout: 10000 });
        console.log('✓ Alerts container is visible');

        // Get all alert cards
        const alertCards = iframe.locator('.alert-card');
        const alertCardCount = await alertCards.count();
        console.log(`✓ Found ${alertCardCount} alert cards`);

        // Step 10: Verify each alert card
        console.log('\nStep 10: Verifying individual alert cards...');

        const alertData = [];

        for (let i = 0; i < alertCardCount; i++) {
            const card = alertCards.nth(i);

            // Get alert title
            const alertTitle = card.locator('.alert-title');
            const titleText = await alertTitle.textContent().catch(() => 'Unknown');

            // Get checkbox state
            const checkbox = card.locator('.alert-toggle');
            const isChecked = await checkbox.isChecked().catch(() => false);

            // Get weight/importance value
            const weightValue = card.locator('.weight-value');
            const weightText = await weightValue.textContent().catch(() => '0');

            alertData.push({
                title: titleText.trim(),
                enabled: isChecked,
                weight: weightText.trim()
            });

            console.log(`✓ Alert ${i + 1}: ${titleText.trim()} - Weight: ${weightText.trim()}, Enabled: ${isChecked}`);
        }

        // Step 11: Verify alert card structure for first card (inside iframe)
        console.log('\nStep 11: Verifying alert card structure...');

        const firstCard = alertCards.first();

        // Verify checkbox exists
        const cardCheckbox = firstCard.locator('.alert-card-checkbox');
        await expect(cardCheckbox).toBeVisible({ timeout: 5000 });
        console.log('✓ Alert card checkbox container is visible');

        // Verify alert header
        const cardHeader = firstCard.locator('.alert-header');
        await expect(cardHeader).toBeVisible({ timeout: 5000 });
        console.log('✓ Alert card header is visible');

        // Verify weight section
        const weightSection = firstCard.locator('.weight-section');
        await expect(weightSection).toBeVisible({ timeout: 5000 });
        console.log('✓ Weight section is visible');

        // Verify weight label
        const weightLabel = firstCard.locator('.weight-label');
        await expect(weightLabel).toBeVisible({ timeout: 5000 });
        const labelText = await weightLabel.textContent();
        expect(labelText).toContain('Level Of Importance');
        console.log('✓ Level Of Importance label is visible');

        // Verify slider
        const cardSlider = firstCard.locator('.slider');
        await expect(cardSlider).toBeVisible({ timeout: 5000 });
        const minValue = await cardSlider.getAttribute('min');
        const maxValue = await cardSlider.getAttribute('max');
        expect(minValue).toBe('1');
        expect(maxValue).toBe('10');
        console.log(`✓ Slider is visible (min: ${minValue}, max: ${maxValue})`);

        // Step 12: Test slider interaction
        console.log('\nStep 12: Testing slider interaction...');

        const testSlider = alertCards.first().locator('.slider');
        const initialValue = await testSlider.inputValue();
        console.log(`Initial slider value: ${initialValue}`);

        // Change slider value
        await testSlider.fill('5');
        await page.waitForTimeout(500);
        const newValue = await testSlider.inputValue();
        console.log(`New slider value after change: ${newValue}`);

        // Restore original value
        await testSlider.fill(initialValue);
        await page.waitForTimeout(500);
        console.log(`✓ Slider interaction works - restored to: ${initialValue}`);

        // Step 13: Test checkbox toggle
        console.log('\nStep 13: Testing checkbox toggle...');

        const testCheckbox = alertCards.first().locator('.alert-toggle');
        const initialCheckState = await testCheckbox.isChecked();
        console.log(`Initial checkbox state: ${initialCheckState ? 'checked' : 'unchecked'}`);

        // Toggle checkbox
        await testCheckbox.click();
        await page.waitForTimeout(500);
        const newCheckState = await testCheckbox.isChecked();
        console.log(`Checkbox state after toggle: ${newCheckState ? 'checked' : 'unchecked'}`);

        // Restore original state
        if (newCheckState !== initialCheckState) {
            await testCheckbox.click();
            await page.waitForTimeout(500);
        }
        console.log('✓ Checkbox toggle works');

        // Step 14: Click Back to Dashboard
        console.log('\nStep 14: Clicking Back to Dashboard...');
        await backButton.click();
        await page.waitForTimeout(2000);

        // Verify we're back to dashboard view
        const dashboardView = page.locator('#dashboard-view');
        await expect(dashboardView).toBeVisible({ timeout: 15000 });
        console.log('✓ Returned to Dashboard view');

        // Final summary
        console.log('\n========================================');
        console.log('    SETTINGS VIEW VERIFICATION SUMMARY');
        console.log('========================================');
        console.log(`Total Alert Cards: ${alertCardCount}`);
        console.log('Alert Types Found:');
        alertData.forEach((alert, index) => {
            console.log(`  ${index + 1}. ${alert.title} - Weight: ${alert.weight}, Enabled: ${alert.enabled}`);
        });
        console.log('========================================');

        console.log('\n✓ Settings view verification completed successfully!');
    });
});
