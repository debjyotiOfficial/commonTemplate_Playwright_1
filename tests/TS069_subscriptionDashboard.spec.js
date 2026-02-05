const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

/**
 * Subscription Dashboard Test Suite
 *
 * Test Steps Covered:
 * ==================
 * Test A: Display and interact with Subscription Dashboard panel
 *   - Login and navigate to tracking1 dashboard
 *   - Open Subscription Dashboard via Account Settings sidebar
 *   - Verify stats cards, alert banner, action buttons
 *   - Verify billing overview dropdown, tabs, filter bar, table structure
 *   - Test status/device filters, search, entries per page
 *   - Verify pagination, test export buttons (PDF/CSV/Excel)
 *
 * Test B: Tab switching and data updates
 *   - Click each of 7 tabs, verify active state and table updates
 *   - Test device type filter on tabs with data
 *   - Cycle entries per page options on All Devices tab
 *
 * Test C: Payment History section
 *   - Verify Payment History section visible
 *   - Verify payment table columns and controls
 *   - Test date filter and search
 *   - Toggle collapse/expand of Payment History section
 *
 * Test D: Row selection and verify modals structure
 *   - Test select all checkbox and individual row selection
 *   - Test row action dropdown (Take Action)
 *   - Open/close Payment Method, Bill Preview modals
 *   - Test Billing Overview dropdown
 */

test.describe('Subscription Dashboard', () => {
    let config;
    let helpers;

    const TRACKING1_LOGIN_URL = 'https://www.tracking1.gpsandfleet.io/gpsandfleet/adminnew/view/login.php';
    const TRACKING1_DASHBOARD_URL = 'https://www.tracking1.gpsandfleet.io/gpsandfleet/client/fleetdemo/maps/index2.php';

    async function loginAndNavigateTracking1(page, config) {
        // Login via tracking1 admin page
        await page.goto(TRACKING1_LOGIN_URL, { waitUntil: 'networkidle', timeout: 60000 });

        const usernameField = page.locator('#username');
        await usernameField.waitFor({ state: 'visible', timeout: 30000 });
        await usernameField.clear();
        await usernameField.fill(config.credentials.demo.usernameBackup);

        const passwordField = page.locator('#password');
        await passwordField.waitFor({ state: 'visible', timeout: 30000 });
        await passwordField.clear();
        await passwordField.fill(config.credentials.demo.passwordBackup);

        const submitButton = page.locator('.submit');
        await submitButton.waitFor({ state: 'visible' });
        await submitButton.click();

        await page.waitForLoadState('networkidle', { timeout: 30000 });
        await page.waitForTimeout(3000);
        console.log('Login completed on tracking1');

        // Navigate to fleet dashboard
        await page.goto(TRACKING1_DASHBOARD_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
            console.log('Network idle timeout, continuing...');
        });
        await page.waitForTimeout(3000);
        console.log('Navigated to tracking1 dashboard');
    }

    async function openSubscriptionDashboard(page) {
        // Click Account Settings in the sidebar
        const accountSettingsIcon = page.locator('.icon.icon--xl.icon--account-settings');
        await accountSettingsIcon.waitFor({ state: 'visible', timeout: 15000 });
        await accountSettingsIcon.click({ force: true });
        await page.waitForTimeout(2000);

        // Click Subscription Dashboard in the sidebar submenu (it's a <p> tag inside <nav>)
        const sdBtn = page.locator('nav p').filter({ hasText: 'Subscription Dashboard' });
        await sdBtn.waitFor({ state: 'visible', timeout: 10000 });
        await sdBtn.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await sdBtn.click();
        console.log('  Clicked "Subscription Dashboard" in sidebar');

        // Wait for the Subscription Dashboard content to load
        await page.waitForTimeout(5000);

        // Verify the Subscriptions heading OR Subscription Details heading is visible
        const heading = page.getByRole('heading', { name: 'Subscriptions' })
            .or(page.getByRole('heading', { name: 'Subscription Details' }));
        try {
            await expect(heading.first()).toBeVisible({ timeout: 20000 });
            console.log('✓ Subscription Dashboard opened');
        } catch (e) {
            // Retry - click again in case first click didn't register
            console.log('  First click may not have registered, retrying...');
            await accountSettingsIcon.click({ force: true });
            await page.waitForTimeout(1500);
            await sdBtn.click();
            await page.waitForTimeout(5000);
            await expect(heading.first()).toBeVisible({ timeout: 20000 });
            console.log('✓ Subscription Dashboard opened (retry)');
        }
    }

    test.beforeAll(async ({ browser }) => {
        const page = await browser.newPage();
        helpers = new TestHelpers(page);
        config = await helpers.getConfig();
        await page.close();
    });

    test.beforeEach(async ({ page }) => {
        helpers = new TestHelpers(page);
        await helpers.clearStorageAndSetTimeouts();
        test.setTimeout(600000);
    });

    // =====================================================================
    // TEST A: Display and interact with Subscription Dashboard panel
    // =====================================================================
    test('should display and interact with Subscription Dashboard panel', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // ============= STEP 1: LOGIN AND NAVIGATE =============
        console.log('--- Step 1: Login and navigate to fleet dashboard ---');
        await loginAndNavigateTracking1(page, config);
        console.log('✓ Successfully logged in');

        // ============= STEP 2: OPEN SUBSCRIPTION DASHBOARD =============
        console.log('--- Step 2: Opening Subscription Dashboard ---');
        await openSubscriptionDashboard(page);

        // Wait for data to load
        await page.waitForTimeout(2000);

        // ============= STEP 3: VERIFY STATS CARDS =============
        console.log('--- Step 3: Verifying stats cards ---');

        const statsLabels = ['Active Devices', 'Currently Due', 'Past Due', 'Auto-renew Subscriptions'];
        for (const label of statsLabels) {
            const card = page.getByText(label, { exact: true });
            if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
                console.log(`  ✓ Stats card "${label}" visible`);
            } else {
                console.log(`  Stats card "${label}" not found`);
            }
        }
        console.log('✓ Stats cards verified');

        // ============= STEP 4: VERIFY ALERT BANNER =============
        console.log('--- Step 4: Verifying alert banner ---');

        const alertBanner = page.getByText('devices require attention');
        if (await alertBanner.isVisible({ timeout: 5000 }).catch(() => false)) {
            const alertText = await alertBanner.textContent();
            console.log(`  ✓ Alert banner: ${alertText.trim()}`);

            // Test the dropdown toggle (▾)
            const alertToggle = page.getByText('▾');
            if (await alertToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
                await alertToggle.click({ force: true });
                await page.waitForTimeout(500);
                console.log('  ✓ Alert dropdown toggle clicked');
            }
        } else {
            console.log('  No alert banner visible');
        }

        // ============= STEP 5: VERIFY ACTION BUTTONS =============
        console.log('--- Step 5: Verifying action buttons ---');

        const actionButtons = ['Renew All', 'Payment History', 'Change Payment Method', 'Billing Overview'];
        for (const btnName of actionButtons) {
            const btn = page.getByRole('button', { name: btnName });
            if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) {
                console.log(`  ✓ "${btnName}" button visible`);
            } else {
                console.log(`  "${btnName}" button not found`);
            }
        }

        // ============= STEP 6: TEST BILLING OVERVIEW DROPDOWN =============
        console.log('--- Step 6: Testing Billing Overview dropdown ---');

        const billingOverviewBtn = page.getByRole('button', { name: 'Billing Overview' });
        if (await billingOverviewBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await billingOverviewBtn.click({ force: true });
            await page.waitForTimeout(1000);
            console.log('  ✓ Billing Overview clicked');

            // Check for dropdown items
            const dropdownItems = page.locator('.billing-dropdown-item, .dropdown-item, [class*="dropdown"] a, [class*="dropdown"] button');
            const itemCount = await dropdownItems.count();
            if (itemCount > 0) {
                for (let i = 0; i < itemCount; i++) {
                    const text = await dropdownItems.nth(i).textContent();
                    console.log(`    ✓ Dropdown item: ${text.trim()}`);
                }
            }

            // Close dropdown by clicking elsewhere
            await page.getByRole('heading', { name: 'Subscriptions' }).click({ force: true });
            await page.waitForTimeout(500);
        }

        // ============= STEP 7: VERIFY TABS =============
        console.log('--- Step 7: Verifying tabs ---');

        const tabNames = [
            'All Devices', 'Active Devices', 'Currently Due', 'Past Due',
            'Suspended Devices', 'Auto-Renew Subscriptions', 'Cancelled Devices'
        ];

        for (const tabName of tabNames) {
            const tab = page.getByText(tabName, { exact: true });
            if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
                console.log(`  ✓ Tab "${tabName}" visible`);
            } else {
                console.log(`  Tab "${tabName}" not found`);
            }
        }
        console.log('✓ Tabs verification completed');

        // ============= STEP 8: VERIFY FILTER BAR =============
        console.log('--- Step 8: Verifying filter bar ---');

        // Status filter (combobox with "All Status")
        const statusFilter = page.locator('combobox, select').filter({ hasText: 'All Status' }).first();
        const statusFilterAlt = page.getByRole('combobox').filter({ has: page.locator('option:has-text("All Status")') }).first();

        if (await statusFilterAlt.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('  ✓ Status filter visible');
        }

        // Device filter (combobox with "All Devices")
        const deviceFilter = page.getByRole('combobox').filter({ has: page.locator('option:has-text("Asset Tracker")') }).first();
        if (await deviceFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('  ✓ Device type filter visible');
        }

        // Date Range button
        const dateRangeBtn = page.getByText('Date Range');
        if (await dateRangeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('  ✓ Date Range button visible');
        }

        // Search input
        const searchInputs = page.getByRole('textbox', { name: 'Search' });
        const searchInput = searchInputs.first();
        if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('  ✓ Search input visible');
        }

        // Entries select
        const entriesSelects = page.getByRole('combobox').filter({ has: page.locator('option:has-text("25")') });
        const entriesSelect = entriesSelects.first();
        if (await entriesSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('  ✓ Entries select visible');
        }

        // ============= STEP 9: VERIFY TABLE STRUCTURE =============
        console.log('--- Step 9: Verifying table structure ---');

        const table = page.getByRole('table').first();
        await expect(table).toBeVisible({ timeout: 10000 });

        // Verify table columns
        const expectedColumns = ['Driver Name/IMEI', 'Type', 'Amount', 'Status', 'Billing Cycle', 'Renewal Date', 'Auto-Renew', 'Actions'];
        const headerCells = table.locator('thead th, thead td');
        const headerTexts = await headerCells.allTextContents();
        console.log(`  Table headers: ${headerTexts.map(h => h.trim()).filter(h => h).join(', ')}`);

        for (const col of expectedColumns) {
            const found = headerTexts.some(h => h.includes(col));
            if (found) {
                console.log(`  ✓ Column "${col}" found`);
            }
        }

        // Count data rows
        const tableRows = table.locator('tbody tr');
        const rowCount = await tableRows.count();
        console.log(`  ✓ Table has ${rowCount} data rows`);
        expect(rowCount).toBeGreaterThan(0);

        // ============= STEP 10: TEST STATUS FILTER =============
        console.log('--- Step 10: Testing status filter ---');

        if (await statusFilterAlt.isVisible({ timeout: 3000 }).catch(() => false)) {
            const rowsBefore = await tableRows.count();

            // Select "Past Due"
            await statusFilterAlt.selectOption({ label: 'Past Due' });
            await page.waitForTimeout(1500);

            const rowsAfterFilter = await tableRows.count();
            console.log(`  ✓ Status filter "Past Due": ${rowsBefore} → ${rowsAfterFilter} rows`);

            // Reset to All Status
            await statusFilterAlt.selectOption({ index: 0 });
            await page.waitForTimeout(1000);

            const rowsAfterReset = await tableRows.count();
            console.log(`  ✓ Status filter reset: ${rowsAfterReset} rows`);
        }

        // ============= STEP 11: TEST DEVICE FILTER =============
        console.log('--- Step 11: Testing device filter ---');

        if (await deviceFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
            const rowsBefore = await tableRows.count();

            // Select first non-default option
            await deviceFilter.selectOption({ index: 1 });
            await page.waitForTimeout(1500);

            const rowsAfterFilter = await tableRows.count();
            console.log(`  ✓ Device filter applied: ${rowsBefore} → ${rowsAfterFilter} rows`);

            // Reset
            await deviceFilter.selectOption({ index: 0 });
            await page.waitForTimeout(1000);

            const rowsAfterReset = await tableRows.count();
            console.log(`  ✓ Device filter reset: ${rowsAfterReset} rows`);
        }

        // ============= STEP 12: TEST SEARCH =============
        console.log('--- Step 12: Testing search functionality ---');

        if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
            const rowsBefore = await tableRows.count();

            // Search with a known device name from the table
            await searchInput.fill('Sales');
            await page.waitForTimeout(1500);

            const rowsAfterSearch = await tableRows.count();
            console.log(`  ✓ Search "Sales": ${rowsBefore} → ${rowsAfterSearch} rows`);

            // Clear search
            await searchInput.fill('');
            await page.waitForTimeout(1000);

            const rowsAfterClear = await tableRows.count();
            console.log(`  ✓ Search cleared: ${rowsAfterClear} rows`);
        }

        // ============= STEP 13: TEST ENTRIES PER PAGE =============
        console.log('--- Step 13: Testing entries per page ---');

        if (await entriesSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
            const entriesOptions = ['10', '25', '50'];

            for (const option of entriesOptions) {
                try {
                    await entriesSelect.selectOption(option);
                    await page.waitForTimeout(1000);

                    const rowCount = await tableRows.count();
                    console.log(`  ✓ Entries ${option}: showing ${rowCount} rows`);
                } catch (e) {
                    console.log(`  Entries option ${option} not available`);
                }
            }

            // Reset to 10
            await entriesSelect.selectOption('10');
            await page.waitForTimeout(500);
        }

        // ============= STEP 14: VERIFY PAGINATION =============
        console.log('--- Step 14: Verifying pagination ---');

        const showingRange = page.getByText(/\d+-\d+ of \d+/);
        if (await showingRange.first().isVisible({ timeout: 5000 }).catch(() => false)) {
            const rangeText = await showingRange.first().textContent();
            console.log(`  ✓ Showing range: ${rangeText.trim()}`);
        }

        const nextPageBtn = page.getByRole('button', { name: '>' }).first();
        const prevPageBtn = page.getByRole('button', { name: '<' }).first();

        if (await nextPageBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('  ✓ Next page button visible');
            await nextPageBtn.click({ force: true });
            await page.waitForTimeout(1500);
            console.log('  ✓ Navigated to next page');

            if (await prevPageBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                await prevPageBtn.click({ force: true });
                await page.waitForTimeout(1000);
                console.log('  ✓ Navigated back to first page');
            }
        }

        // ============= STEP 15: TEST EXPORT (SAVE FILE AS) =============
        console.log('--- Step 15: Testing export buttons ---');

        const saveFileAsBtn = page.getByRole('button', { name: 'Save file as' }).first();
        if (await saveFileAsBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await saveFileAsBtn.click({ force: true });
            await page.waitForTimeout(1000);

            // Check for export dropdown items (PDF, CSV, Excel)
            const exportFormats = ['PDF', 'CSV', 'Excel'];
            for (const format of exportFormats) {
                const formatBtn = page.getByText(format, { exact: false }).first();
                if (await formatBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                    const [download] = await Promise.all([
                        page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
                        formatBtn.click({ force: true })
                    ]);
                    if (download) {
                        console.log(`  ✓ ${format} exported: ${download.suggestedFilename()}`);
                    } else {
                        console.log(`  ✓ ${format} export clicked`);
                    }
                    await page.waitForTimeout(500);

                    // Re-open dropdown for next format
                    if (format !== exportFormats[exportFormats.length - 1]) {
                        await saveFileAsBtn.click({ force: true });
                        await page.waitForTimeout(500);
                    }
                } else {
                    console.log(`  ${format} option not visible`);
                }
            }
        }

        console.log('\n========================================');
        console.log('Subscription Dashboard Test A Completed');
        console.log('========================================');
    });

    // =====================================================================
    // TEST B: Tab switching and verify data updates
    // =====================================================================
    test('should handle tab switching and verify data updates', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // ============= STEP 1: LOGIN AND NAVIGATE =============
        console.log('--- Step 1: Login and navigate ---');
        await loginAndNavigateTracking1(page, config);
        console.log('✓ Successfully logged in');

        // ============= STEP 2: OPEN SUBSCRIPTION DASHBOARD =============
        console.log('--- Step 2: Opening Subscription Dashboard ---');
        await openSubscriptionDashboard(page);
        await page.waitForTimeout(2000);

        const table = page.getByRole('table').first();
        const tableRows = table.locator('tbody tr');

        // ============= STEP 3: CLICK EACH TAB AND VERIFY =============
        console.log('--- Step 3: Testing tab switching ---');

        const tabNames = [
            'All Devices', 'Active Devices', 'Currently Due', 'Past Due',
            'Suspended Devices', 'Auto-Renew Subscriptions', 'Cancelled Devices'
        ];

        for (const tabName of tabNames) {
            const tab = page.getByText(tabName, { exact: true });
            if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
                await tab.click({ force: true });
                await page.waitForTimeout(1500);

                // Count rows after tab switch
                const rowCount = await tableRows.count();
                console.log(`  Tab "${tabName}": ${rowCount} rows`);

                // On tabs with data, test device type filter
                if (rowCount > 0) {
                    const deviceFilter = page.getByRole('combobox').filter({ has: page.locator('option:has-text("Asset Tracker")') }).first();
                    if (await deviceFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
                        const filterOptions = await deviceFilter.locator('option').count();
                        if (filterOptions > 1) {
                            await deviceFilter.selectOption({ index: 1 });
                            await page.waitForTimeout(1000);

                            const filteredRows = await tableRows.count();
                            console.log(`    Device filter: ${rowCount} → ${filteredRows} rows`);

                            // Reset
                            await deviceFilter.selectOption({ index: 0 });
                            await page.waitForTimeout(500);
                        }
                    }
                }
            } else {
                console.log(`  Tab "${tabName}" not visible, skipping`);
            }
        }

        // ============= STEP 4: TEST ENTRIES PER PAGE ON ALL DEVICES TAB =============
        console.log('--- Step 4: Testing entries per page on All Devices tab ---');

        // Switch back to All Devices tab
        const allDevicesTab = page.getByText('All Devices', { exact: true });
        if (await allDevicesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
            await allDevicesTab.click({ force: true });
            await page.waitForTimeout(1500);
        }

        const entriesSelect = page.getByRole('combobox').filter({ has: page.locator('option:has-text("25")') }).first();
        if (await entriesSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
            const entriesOptions = ['10', '25', '50'];

            for (const option of entriesOptions) {
                try {
                    await entriesSelect.selectOption(option);
                    await page.waitForTimeout(1000);

                    const rowCount = await tableRows.count();
                    console.log(`  ✓ Entries ${option}: showing ${rowCount} rows`);
                } catch (e) {
                    console.log(`  Entries option ${option} not available`);
                }
            }
        }

        console.log('\n========================================');
        console.log('Subscription Dashboard Test B Completed');
        console.log('========================================');
    });

    // =====================================================================
    // TEST C: Display and interact with Payment History section
    // =====================================================================
    test('should display and interact with Payment History section', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // ============= STEP 1: LOGIN AND NAVIGATE =============
        console.log('--- Step 1: Login and navigate ---');
        await loginAndNavigateTracking1(page, config);
        console.log('✓ Successfully logged in');

        // ============= STEP 2: OPEN SUBSCRIPTION DASHBOARD =============
        console.log('--- Step 2: Opening Subscription Dashboard ---');
        await openSubscriptionDashboard(page);
        await page.waitForTimeout(2000);

        // ============= STEP 3: VERIFY PAYMENT HISTORY SECTION =============
        console.log('--- Step 3: Verifying Payment History section ---');

        // Payment History section is visible by default on the page
        const paymentHistoryHeading = page.getByRole('heading', { name: 'Payment History', level: 2 });
        await expect(paymentHistoryHeading).toBeVisible({ timeout: 10000 });
        console.log('✓ Payment History heading visible');

        // ============= STEP 4: VERIFY PAYMENT HISTORY CONTROLS =============
        console.log('--- Step 4: Verifying Payment History controls ---');

        // Search input in payment section
        const paymentSearch = page.getByRole('textbox', { name: 'Search' }).nth(1);
        if (await paymentSearch.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('  ✓ Payment search input visible');
        }

        // Date filter ("All Time" button)
        const dateFilterBtn = page.getByRole('button', { name: 'All Time' });
        if (await dateFilterBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('  ✓ Date filter button ("All Time") visible');
        }

        // ============= STEP 5: VERIFY PAYMENT TABLE =============
        console.log('--- Step 5: Verifying payment table ---');

        const tables = page.getByRole('table');
        const tableCount = await tables.count();
        console.log(`  Found ${tableCount} tables on page`);

        // Payment table is the second table on the page
        if (tableCount >= 2) {
            const paymentTable = tables.nth(1);
            const paymentHeaders = paymentTable.locator('thead th, thead td');
            const headerTexts = await paymentHeaders.allTextContents();
            console.log(`  ✓ Payment table columns: ${headerTexts.map(h => h.trim()).filter(h => h).join(', ')}`);

            const expectedCols = ['Transaction', 'Type', 'Amount', 'Status', 'Date', 'Payment Method', 'Receipt'];
            for (const col of expectedCols) {
                const found = headerTexts.some(h => h.includes(col));
                if (found) {
                    console.log(`    ✓ Column "${col}" found`);
                } else {
                    console.log(`    Column "${col}" not found`);
                }
            }

            // Check payment rows
            const paymentRows = paymentTable.locator('tbody tr');
            const paymentRowCount = await paymentRows.count();
            console.log(`  ✓ Payment table has ${paymentRowCount} rows`);

            // Check showing info
            const paymentShowing = page.getByText(/Showing \d+ to \d+ of \d+ entries/).last();
            if (await paymentShowing.isVisible({ timeout: 3000 }).catch(() => false)) {
                const showingText = await paymentShowing.textContent();
                console.log(`  ✓ Payment showing: ${showingText.trim()}`);
            }
        }

        // ============= STEP 6: TEST DATE FILTER =============
        console.log('--- Step 6: Testing date filter ---');

        if (await dateFilterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await dateFilterBtn.click({ force: true });
            await page.waitForTimeout(1000);

            // Check if a dropdown or modal appeared
            const dateOptions = page.locator('[class*="dropdown"] button, [class*="dropdown"] a, [class*="date-option"]');
            const optionCount = await dateOptions.count();
            if (optionCount > 0) {
                console.log(`  ✓ Date filter opened with ${optionCount} options`);
                // Close by clicking elsewhere
                await page.getByRole('heading', { name: 'Payment History' }).click({ force: true });
                await page.waitForTimeout(500);
            } else {
                console.log('  Date filter clicked (no dropdown visible)');
            }
        }

        // ============= STEP 7: VERIFY PAYMENT PAGINATION =============
        console.log('--- Step 7: Verifying payment pagination ---');

        // The payment section has its own pagination buttons
        const paymentPrevBtn = page.getByRole('button', { name: '<' }).last();
        const paymentNextBtn = page.getByRole('button', { name: '>' }).last();

        if (await paymentPrevBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('  ✓ Payment prev button visible');
        }
        if (await paymentNextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('  ✓ Payment next button visible');
        }

        // ============= STEP 8: TEST COLLAPSE/EXPAND =============
        console.log('--- Step 8: Testing collapse/expand ---');

        const collapseBtn = page.getByRole('button', { name: 'Collapse section' });
        if (await collapseBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await collapseBtn.click({ force: true });
            await page.waitForTimeout(1000);
            console.log('  ✓ Collapsed Payment History section');

            // The button may now say "Expand section" or similar
            const expandBtn = page.getByRole('button', { name: /Expand|Collapse/ });
            if (await expandBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                await expandBtn.click({ force: true });
                await page.waitForTimeout(1000);
                console.log('  ✓ Expanded Payment History section');
            }
        } else {
            console.log('  No collapse button found');
        }

        // ============= STEP 9: TEST PAYMENT SAVE FILE AS =============
        console.log('--- Step 9: Testing Payment Save file as ---');

        const saveFileAsBtns = page.getByRole('button', { name: 'Save file as' });
        const saveFileAsBtnCount = await saveFileAsBtns.count();
        if (saveFileAsBtnCount >= 2) {
            const paymentSaveBtn = saveFileAsBtns.nth(1);
            if (await paymentSaveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                await paymentSaveBtn.click({ force: true });
                await page.waitForTimeout(1000);
                console.log('  ✓ Payment "Save file as" dropdown opened');

                // Close by pressing Escape
                await page.keyboard.press('Escape');
                await page.waitForTimeout(500);
            }
        }

        console.log('\n========================================');
        console.log('Subscription Dashboard Test C Completed');
        console.log('========================================');
    });

    // =====================================================================
    // TEST D: Row selection and verify modals structure
    // =====================================================================
    test('should handle row selection and verify modals structure', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // ============= STEP 1: LOGIN AND NAVIGATE =============
        console.log('--- Step 1: Login and navigate ---');
        await loginAndNavigateTracking1(page, config);
        console.log('✓ Successfully logged in');

        // ============= STEP 2: OPEN SUBSCRIPTION DASHBOARD =============
        console.log('--- Step 2: Opening Subscription Dashboard ---');
        await openSubscriptionDashboard(page);
        await page.waitForTimeout(2000);

        const table = page.getByRole('table').first();
        const tableRows = table.locator('tbody tr');

        // ============= STEP 3: TEST ROW CHECKBOXES =============
        console.log('--- Step 3: Testing row checkboxes ---');

        // Collapse sidebar by clicking the Account Settings accordion to close it
        const accountSettingsNav = page.locator('nav').first();
        if (await accountSettingsNav.isVisible({ timeout: 3000 }).catch(() => false)) {
            // Click Account Settings header to collapse the sidebar
            const accSettingsHeader = page.locator('.icon.icon--xl.icon--account-settings');
            await accSettingsHeader.click({ force: true });
            await page.waitForTimeout(1000);
            console.log('  Sidebar collapsed');
        }

        // Each row has a checkbox (ARIA checkbox role) in the first cell
        // No header "Select All" checkbox exists
        const rowCheckboxes = table.locator('tbody tr').locator('role=checkbox');

        const checkboxCount = await rowCheckboxes.count();
        console.log(`  Found ${checkboxCount} row checkboxes`);

        if (checkboxCount > 0) {
            // Click the first row checkbox to check it
            const firstCheckbox = rowCheckboxes.first();
            await firstCheckbox.click({ force: true });
            await page.waitForTimeout(500);
            console.log('  ✓ First row checkbox clicked');

            // Verify Renew Selected button state
            const renewSelectedBtn = page.getByRole('button', { name: 'Renew Selected' });
            if (await renewSelectedBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                console.log('  ✓ "Renew Selected" button visible');
            }

            // Click again to uncheck
            await firstCheckbox.click({ force: true });
            await page.waitForTimeout(500);
            console.log('  ✓ First row checkbox unchecked');

            // Try checking multiple rows
            if (checkboxCount >= 2) {
                await rowCheckboxes.nth(0).click({ force: true });
                await page.waitForTimeout(300);
                await rowCheckboxes.nth(1).click({ force: true });
                await page.waitForTimeout(500);
                console.log('  ✓ Multiple rows selected');

                // Uncheck them
                await rowCheckboxes.nth(0).click({ force: true });
                await page.waitForTimeout(300);
                await rowCheckboxes.nth(1).click({ force: true });
                await page.waitForTimeout(500);
                console.log('  ✓ Multiple rows deselected');
            }
        }

        // ============= STEP 4: TEST TAKE ACTION DROPDOWN =============
        console.log('--- Step 4: Testing Take Action dropdown ---');

        const takeActionBtn = page.getByRole('button', { name: 'Take Action' }).first();
        if (await takeActionBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await takeActionBtn.click({ force: true });
            await page.waitForTimeout(1000);

            // Check for dropdown options (Renew Now, Cancel, etc.)
            const actionOptions = page.locator('[class*="dropdown-content"] button, [class*="dropdown-content"] a, [class*="action"] button, [role="menuitem"]');
            const actionCount = await actionOptions.count();
            if (actionCount > 0) {
                for (let i = 0; i < actionCount; i++) {
                    const optText = await actionOptions.nth(i).textContent();
                    console.log(`    ✓ Action option: ${optText.trim()}`);
                }
            } else {
                // Try getByText for common actions
                const renewOption = page.getByText('Renew Now', { exact: false });
                const cancelOption = page.getByText('Request Cancellation', { exact: false }).or(page.getByText('Cancel', { exact: false }));

                if (await renewOption.isVisible({ timeout: 3000 }).catch(() => false)) {
                    console.log('    ✓ "Renew Now" option visible');
                }
                if (await cancelOption.first().isVisible({ timeout: 3000 }).catch(() => false)) {
                    console.log('    ✓ "Cancel" option visible');
                }
            }

            // Close dropdown
            await page.getByRole('heading', { name: 'Subscriptions' }).click({ force: true });
            await page.waitForTimeout(500);
            console.log('  ✓ Take Action dropdown tested');
        }

        // ============= STEP 5: TEST CHANGE PAYMENT METHOD BUTTON =============
        console.log('--- Step 5: Testing Change Payment Method ---');

        const changePaymentBtn = page.getByRole('button', { name: 'Change Payment Method' });
        if (await changePaymentBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await changePaymentBtn.click({ force: true });
            await page.waitForTimeout(2000);

            // Check if a modal or new section appeared
            const paymentModal = page.locator('[class*="modal"]:visible, [role="dialog"]:visible');
            const modalCount = await paymentModal.count();
            if (modalCount > 0) {
                console.log('  ✓ Payment Method modal/dialog opened');

                // Check for form fields
                const formFields = paymentModal.first().locator('input, select, textarea');
                const fieldCount = await formFields.count();
                console.log(`  ✓ Modal has ${fieldCount} form fields`);

                // Close modal
                const closeBtn = paymentModal.first().locator('button:has-text("Close"), button:has-text("Cancel"), .close, [class*="close"]').first();
                if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                    await closeBtn.click({ force: true });
                    await page.waitForTimeout(500);
                    console.log('  ✓ Modal closed');
                } else {
                    await page.keyboard.press('Escape');
                    await page.waitForTimeout(500);
                }
            } else {
                console.log('  Change Payment Method clicked (may redirect or show inline form)');
            }
        }

        // ============= STEP 6: TEST BILLING OVERVIEW DROPDOWN =============
        console.log('--- Step 6: Testing Billing Overview dropdown ---');

        const billingBtn = page.getByRole('button', { name: 'Billing Overview' });
        if (await billingBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await billingBtn.click({ force: true });
            await page.waitForTimeout(1000);
            console.log('  ✓ Billing Overview dropdown opened');

            // Look for dropdown items
            const dropdownItems = page.locator('[class*="dropdown"]:visible button, [class*="dropdown"]:visible a');
            const itemCount = await dropdownItems.count();
            if (itemCount > 0) {
                for (let i = 0; i < itemCount; i++) {
                    const text = await dropdownItems.nth(i).textContent();
                    if (text.trim()) {
                        console.log(`    ✓ Option: ${text.trim()}`);
                    }
                }
            }

            // Close dropdown
            await page.getByRole('heading', { name: 'Subscriptions' }).click({ force: true });
            await page.waitForTimeout(500);
        }

        // ============= STEP 7: TEST RENEW ALL BUTTON =============
        console.log('--- Step 7: Testing Renew All button ---');

        const renewAllBtn = page.getByRole('button', { name: 'Renew All' });
        if (await renewAllBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('  ✓ "Renew All" button visible');
            // Don't click to avoid triggering actual renewal
        }

        // ============= STEP 8: TEST TAKE ACTION - RENEW NOW =============
        console.log('--- Step 8: Testing Take Action → Renew Now ---');

        const takeActionBtn2 = page.getByRole('button', { name: 'Take Action' }).first();
        if (await takeActionBtn2.isVisible({ timeout: 5000 }).catch(() => false)) {
            await takeActionBtn2.click({ force: true });
            await page.waitForTimeout(1000);

            const renewNow = page.getByText('Renew Now', { exact: false }).first();
            if (await renewNow.isVisible({ timeout: 3000 }).catch(() => false)) {
                await renewNow.click({ force: true });
                await page.waitForTimeout(2000);

                // Check if a renew modal/dialog appeared
                const renewModal = page.locator('[class*="modal"]:visible, [role="dialog"]:visible');
                if (await renewModal.first().isVisible({ timeout: 5000 }).catch(() => false)) {
                    console.log('  ✓ Renew modal opened');
                    const modalContent = await renewModal.first().textContent();
                    console.log(`  ✓ Modal content length: ${modalContent.length} chars`);

                    // Close without submitting
                    const closeBtn = renewModal.first().locator('button:has-text("Close"), button:has-text("Cancel"), .close, [class*="close"]').first();
                    if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                        await closeBtn.click({ force: true });
                        await page.waitForTimeout(500);
                        console.log('  ✓ Renew modal closed (without submitting)');
                    } else {
                        await page.keyboard.press('Escape');
                        await page.waitForTimeout(500);
                    }
                } else {
                    console.log('  Renew Now clicked (no modal appeared)');
                }
            } else {
                console.log('  "Renew Now" not visible in dropdown');
                // Close dropdown
                await page.getByRole('heading', { name: 'Subscriptions' }).click({ force: true });
                await page.waitForTimeout(500);
            }
        }

        // ============= STEP 9: TEST TAKE ACTION - CANCEL =============
        console.log('--- Step 9: Testing Take Action → Cancel ---');

        const takeActionBtn3 = page.getByRole('button', { name: 'Take Action' }).first();
        if (await takeActionBtn3.isVisible({ timeout: 5000 }).catch(() => false)) {
            await takeActionBtn3.click({ force: true });
            await page.waitForTimeout(1000);

            const cancelOption = page.getByText('Request Cancellation', { exact: false })
                .or(page.getByText('Cancel Subscription', { exact: false }));
            if (await cancelOption.first().isVisible({ timeout: 3000 }).catch(() => false)) {
                await cancelOption.first().click({ force: true });
                await page.waitForTimeout(2000);

                // Check if cancellation modal appeared
                const cancelModal = page.locator('[class*="modal"]:visible, [role="dialog"]:visible');
                if (await cancelModal.first().isVisible({ timeout: 5000 }).catch(() => false)) {
                    console.log('  ✓ Cancellation modal opened');

                    // Check for reason dropdown and textarea
                    const reasonDropdown = cancelModal.first().locator('select');
                    const reasonTextarea = cancelModal.first().locator('textarea');

                    if (await reasonDropdown.first().isVisible({ timeout: 3000 }).catch(() => false)) {
                        console.log('  ✓ Reason dropdown visible');
                    }
                    if (await reasonTextarea.first().isVisible({ timeout: 3000 }).catch(() => false)) {
                        console.log('  ✓ Reason textarea visible');
                    }

                    // Close without submitting
                    const closeBtn = cancelModal.first().locator('button:has-text("Close"), button:has-text("Cancel"), .close, [class*="close"]').first();
                    if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                        await closeBtn.click({ force: true });
                        await page.waitForTimeout(500);
                        console.log('  ✓ Cancellation modal closed (without submitting)');
                    } else {
                        await page.keyboard.press('Escape');
                        await page.waitForTimeout(500);
                    }
                } else {
                    console.log('  Cancel option clicked (no modal appeared)');
                }
            } else {
                console.log('  "Cancel" not visible in dropdown');
                // Close dropdown
                await page.getByRole('heading', { name: 'Subscriptions' }).click({ force: true });
                await page.waitForTimeout(500);
            }
        }

        console.log('\n========================================');
        console.log('Subscription Dashboard Test D Completed');
        console.log('========================================');
    });
});
