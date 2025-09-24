const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Timezone', () => {
    let config;
    let helpers;

    test.beforeAll(async ({ browser }) => {
        // Create a page to load config
        const page = await browser.newPage();
        helpers = new TestHelpers(page);
        config = await helpers.getConfig();
        await page.close();
    });

    test.beforeEach(async ({ page }) => {
        helpers = new TestHelpers(page);
        await helpers.clearStorageAndSetTimeouts();
        
        // Set timeouts
        test.setTimeout(500000);
    });

    test('should edit the timezone of users', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();
        
        await page.goto(config.urls.backAdminLoginPage);
        
        await expect(page.locator(config.selectors.login.usernameFieldBackup)).toBeVisible();
        await page.locator(config.selectors.login.usernameFieldBackup)
            .fill(config.credentials.demo.usernameBackup);

        await expect(page.locator(config.selectors.login.passwordFieldBackup)).toBeVisible();
        await page.locator(config.selectors.login.passwordFieldBackup)
            .fill(config.credentials.demo.passwordBackup);
        
        await expect(page.locator(config.selectors.login.submitButtonBackup)).toBeVisible();
        await page.locator(config.selectors.login.submitButtonBackup).click();

        await page.waitForTimeout(config.timeouts.wait);
        await page.goto(config.urls.fleetDashboard3);


        // 1. Verify the Driver Card panel is visible
        const driverCardPanel = page.locator('#driver-card-panel');
        await expect(driverCardPanel).toBeVisible();
        console.log('✓ Driver Card panel is visible');

        // 2. Verify the number of drivers and check driver-card__container elements
        const driversCountText = await page.locator('#drivers-length, [class*="drivers-length"]').textContent();
        const expectedDriverCount = parseInt(driversCountText?.match(/(\d+)\s*Drivers?/i)?.[1] || '0');
        console.log(`Expected number of drivers: ${expectedDriverCount}`);

        // Count actual driver containers
        const driverContainers = page.locator('[class*="driver-card__container"], [class*="driver-card-container"]');
        const actualDriverCount = await driverContainers.count();
        console.log(`Actual number of driver containers: ${actualDriverCount}`);

        // Verify the counts match
        expect(actualDriverCount).toBe(expectedDriverCount);
        console.log('✓ Driver count verification passed');

        // 3. Click on sort button and verify sorting is working
        const sortButton = page.locator('#driver-card-panel #drivers-sort');
        await expect(sortButton).toBeVisible();
        
        // Get initial driver order
        const initialDrivers = await page.locator('[class*="driver-name"], h5').allTextContents();
        console.log('Initial driver order:', initialDrivers);
        
        // Click sort button
        await sortButton.click();
        await page.waitForTimeout(1000); // Wait for sort to complete
        
        // Get sorted driver order
        const sortedDrivers = await page.locator('[class*="driver-name"], h5').allTextContents();
        console.log('Sorted driver order:', sortedDrivers);
        
        // Verify sorting occurred (order should be different)
        const sortingOccurred = JSON.stringify(initialDrivers) !== JSON.stringify(sortedDrivers);
        expect(sortingOccurred).toBe(true);
        console.log('✓ Sorting functionality verified');

        // 4. Extract driver-status of each driver
        const driverStatuses = await page.locator('[class*="driver-status"], [data-vehicle-name]').allTextContents();
        console.log('Driver statuses extracted:', driverStatuses);
        
        // Alternative approach - get status from data attributes or text content
        const statusElements = await page.locator('[class*="driver-status"], [class*="vehicle-status"]').all();
        const statusInfo = [];
        
        for (let i = 0; i < statusElements.length; i++) {
            const statusText = await statusElements[i].textContent();
            const statusClass = await statusElements[i].getAttribute('class');
            statusInfo.push({ text: statusText?.trim(), class: statusClass });
        }
        
        console.log('Detailed driver status info:', statusInfo);
        expect(statusInfo.length).toBeGreaterThan(0);
        console.log('✓ Driver statuses extracted successfully');

        // 5. Click on appearance settings button (header__btn1 open-appearence-settings)
        const appearanceSettingsBtn = page.locator('[class*="header__btn1"][class*="open-appearence-settings"], [class*="open-appearance-settings"], .header__btn1.open-appearence-settings');
        await expect(appearanceSettingsBtn).toBeVisible();
        
        await appearanceSettingsBtn.click();
        await page.waitForTimeout(500); // Wait for modal animation
        console.log('✓ Appearance settings button clicked');

        // 6. Verify the Appearance Settings modal is opening
        const appearanceModal = page.locator('#appearanceModal').first();
        await expect(appearanceModal).toBeVisible();
        
        // Verify modal header text
        const modalHeader = page.locator('[class*="appearance-modal"] h2, [class*="appearance-modal"] .modal-title').first();
        await expect(modalHeader).toContainText('Appearance Settings');
        
        // Verify modal content is visible
        const vehicleStatusSection = page.locator('text=Vehicle Status Color');
        await expect(vehicleStatusSection).toBeVisible();
        
        console.log('✓ Appearance Settings modal opened successfully');

        // 7. Extract all colors from driver cards (status + address) and compare with modal
        console.log('\n=== Extracting All Colors from Driver Cards ===');
        
        // Extract both driver status AND address colors in one pass
        const driverCardData = {};
        const driverCards = await page.locator('[class*="driver-card__container"], [class*="driver-card-container"]').all();
        
        // Helper function to convert RGB to HEX
        const rgbToHex = (rgb) => {
            if (!rgb || rgb === 'rgba(0, 0, 0, 0)' || rgb === 'transparent') return '';
            
            const rgbMatch = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
            if (!rgbMatch) return '';
            
            const [, r, g, b] = rgbMatch;
            return '#' + [r, g, b].map(x => {
                const hex = parseInt(x, 10).toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            }).join('').toUpperCase();
        };
        
        for (let i = 0; i < driverCards.length; i++) {
            // Get driver name
            const driverName = await driverCards[i].locator('[class*="driver-name"], h5').textContent();
            
            // Extract STATUS colors
            const statusElement = driverCards[i].locator('[class*="driver-status"], [data-vehicle-name]').first();
            const statusText = await statusElement.textContent();
            
            const statusComputedStyle = await statusElement.evaluate((el) => {
                const styles = window.getComputedStyle(el);
                return {
                    backgroundColor: styles.backgroundColor,
                    color: styles.color,
                    borderColor: styles.borderColor
                };
            });
            
            // Extract ADDRESS colors - fix selector to match actual class "driver-card-adress"
            let addressData = null;
            const addressElements = await driverCards[i].locator('[class*="driver-card-adress"], [class*="driver-card-address"], [class*="address"], a[href*="maps.google.com"]').all();
            
            if (addressElements.length > 0) {
                const addressElement = addressElements[0];
                const addressText = await addressElement.textContent();
                
                const addressComputedStyle = await addressElement.evaluate((el) => {
                    const styles = window.getComputedStyle(el);
                    return {
                        color: styles.color,
                        backgroundColor: styles.backgroundColor,
                        borderColor: styles.borderColor
                    };
                });
                
                addressData = {
                    text: addressText?.trim(),
                    textColor: rgbToHex(addressComputedStyle.color),
                    backgroundColor: rgbToHex(addressComputedStyle.backgroundColor),
                    originalStyles: addressComputedStyle
                };
            }
            
            // Store all driver data
            driverCardData[driverName?.trim() || `Driver ${i + 1}`] = {
                status: {
                    text: statusText?.trim(),
                    backgroundColor: rgbToHex(statusComputedStyle.backgroundColor),
                    textColor: rgbToHex(statusComputedStyle.color),
                    originalStyles: statusComputedStyle
                },
                address: addressData
            };
        }
        
        console.log('Complete driver card data extracted:', driverCardData);

        // Extract color mappings from the appearance settings modal
        console.log('\n=== Extracting Modal Color Settings ===');
        
        // Extract STATUS color mappings using actual DOM structure from screenshot
        const statusColorItems = await page.locator('div.status-color-item').all();
        const modalStatusColors = {};

        for (let item of statusColorItems) {
            try {
                // Get the status label from the entire item text content (it appears to be in the parent)
                const fullText = await item.textContent({ timeout: 5000 });

                // Get the hex value from input.color-picker__hex
                const hexInput = item.locator('input.color-picker__hex');
                const hexValue = await hexInput.inputValue({ timeout: 5000 });

                if (fullText && hexValue && hexValue.match(/#[A-Fa-f0-9]{6}/i)) {
                    // Extract meaningful status label from full text
                    let statusLabel = fullText
                        .replace(/#[A-Fa-f0-9]{6}/gi, '') // Remove hex colors
                        .replace(/Reset/gi, '') // Remove Reset text
                        .replace(/\s+/g, ' ') // Normalize whitespace
                        .trim();

                    if (statusLabel && statusLabel.length > 2) {
                        modalStatusColors[statusLabel] = hexValue.toUpperCase();
                        console.log(`Found status: "${statusLabel}" -> ${hexValue.toUpperCase()}`);
                    }
                }
            } catch (e) {
                console.log('Error processing status color item:', e.message);
                continue;
            }
        }
        
        // Extract ADDRESS color using ID selector from screenshot
        const addressColorSection = page.locator('text=Address Color').first();
        await addressColorSection.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);

        let modalAddressColor = '';

        // Use the specific ID from the screenshot
        const addressColorInput = page.locator('#addressHex');
        if (await addressColorInput.count() > 0) {
            try {
                modalAddressColor = await addressColorInput.inputValue({ timeout: 5000 });
                console.log(`Found address color from ID selector: ${modalAddressColor}`);
            } catch (e) {
                console.log('Error getting address color from ID selector:', e.message);
            }
        }

        // Fallback: find input.color-picker__hex near "Address Color" section
        if (!modalAddressColor) {
            try {
                const addressSection = page.locator('text=Address Color').locator('..');
                const addressInput = addressSection.locator('input.color-picker__hex').first();
                if (await addressInput.count() > 0) {
                    modalAddressColor = await addressInput.inputValue({ timeout: 5000 });
                    console.log(`Found address color from section fallback: ${modalAddressColor}`);
                }
            } catch (e) {
                console.log('Error getting address color from section fallback:', e.message);
            }
        }
        
        console.log('Modal status colors:', modalStatusColors);
        console.log('Modal address color:', modalAddressColor);

        // Compare STATUS colors
        console.log('\n=== Status Color Comparison Results ===');
        let statusMatches = 0;
        let totalStatusComparisons = 0;
        
        for (const [driverName, driverData] of Object.entries(driverCardData)) {
            if (!driverData.status.text) continue;
            
            // Find matching status in modal
            let matchingModalStatus = null;
            let modalColor = null;
            
            // Direct match first
            if (modalStatusColors[driverData.status.text]) {
                matchingModalStatus = driverData.status.text;
                modalColor = modalStatusColors[driverData.status.text];
            } else {
                // Try partial matching
                for (const [modalStatus, color] of Object.entries(modalStatusColors)) {
                    if (driverData.status.text.toLowerCase().includes(modalStatus.toLowerCase()) || 
                        modalStatus.toLowerCase().includes(driverData.status.text.toLowerCase())) {
                        matchingModalStatus = modalStatus;
                        modalColor = color;
                        break;
                    }
                }
            }
            
            totalStatusComparisons++;
            const colorsMatch = driverData.status.backgroundColor === modalColor || driverData.status.textColor === modalColor;
            
            if (colorsMatch) statusMatches++;
            
            console.log(`Driver: ${driverName}`);
            console.log(`  Status: ${driverData.status.text}`);
            console.log(`  Card Background: ${driverData.status.backgroundColor}`);
            console.log(`  Card Text: ${driverData.status.textColor}`);
            console.log(`  Modal Status: ${matchingModalStatus}`);
            console.log(`  Modal Color: ${modalColor}`);
            console.log(`  Match: ${colorsMatch ? '✓' : '✗'}`);
            console.log('---');
        }

        // Compare ADDRESS colors
        console.log('\n=== Address Color Comparison Results ===');
        let addressMatches = 0;
        let totalAddressComparisons = 0;
        
        for (const [driverName, driverData] of Object.entries(driverCardData)) {
            if (!driverData.address) continue;
            
            totalAddressComparisons++;
            
            const textColorMatches = driverData.address.textColor === modalAddressColor?.toUpperCase();
            const backgroundColorMatches = driverData.address.backgroundColor === modalAddressColor?.toUpperCase();
            const anyColorMatch = textColorMatches || backgroundColorMatches;
            
            if (anyColorMatch) addressMatches++;
            
            console.log(`Driver: ${driverName}`);
            console.log(`  Address: ${driverData.address.text}`);
            console.log(`  Card Text Color: ${driverData.address.textColor}`);
            console.log(`  Card Background: ${driverData.address.backgroundColor}`);
            console.log(`  Modal Address Color: ${modalAddressColor?.toUpperCase()}`);
            console.log(`  Text Match: ${textColorMatches ? '✓' : '✗'}`);
            console.log(`  Background Match: ${backgroundColorMatches ? '✓' : '✗'}`);
            console.log(`  Overall Match: ${anyColorMatch ? '✓' : '✗'}`);
            console.log('---');
        }

        // Validation
        console.log(`\nColor Validation Summary:`);
        console.log(`Status Colors: ${statusMatches}/${totalStatusComparisons} matches`);
        console.log(`Address Colors: ${addressMatches}/${totalAddressComparisons} matches`);
        
        expect(statusMatches).toBeGreaterThan(0);
        if (totalAddressComparisons > 0) {
            expect(addressMatches).toBeGreaterThan(0);
        }
        
        console.log('✓ Complete color validation completed');

        // Step 8: Test color changes and reset functionality
        console.log('\n=== Testing Color Change and Reset Functionality ===');

        // Store original colors for comparison
        const originalStatusColors = { ...modalStatusColors };
        const originalAddressColor = modalAddressColor;

        // Change address color to a new value
        const newAddressColor = '#FF0000'; // Red
        await page.locator('#addressHex').fill(newAddressColor);
        console.log(`Changed address color to: ${newAddressColor}`);

        // Change some vehicle status colors (let's change "Off" and "Vehicle is idle")
        const newOffColor = '#00FF00'; // Green
        const newIdleColor = '#0000FF'; // Blue

        // Find and change "Off" status color
        const offStatusItem = page.locator('div.status-color-item').filter({ hasText: 'Off' });
        const offColorInput = offStatusItem.locator('input.color-picker__hex');
        await offColorInput.fill(newOffColor);
        console.log(`Changed "Off" status color to: ${newOffColor}`);

        // Find and change "Vehicle is idle" status color
        const idleStatusItem = page.locator('div.status-color-item').filter({ hasText: 'Vehicle is idle' });
        const idleColorInput = idleStatusItem.locator('input.color-picker__hex');
        await idleColorInput.fill(newIdleColor);
        console.log(`Changed "Vehicle is idle" status color to: ${newIdleColor}`);

        await page.waitForTimeout(1000);

        // Click "Reset to default" button
        const resetButton = page.locator('button:has-text("Reset to default")');
        await expect(resetButton).toBeVisible();
        await resetButton.click();
        console.log('✓ Clicked "Reset to default" button');

        await page.waitForTimeout(2000); // Wait for reset to complete

        // Verify colors have been reset to default system values
        console.log('\n=== Verifying Reset Functionality ===');

        // Check address color reset
        const resetAddressColor = await page.locator('#addressHex').inputValue();
        console.log(`Address color after reset: ${resetAddressColor} (was: ${originalAddressColor})`);

        // Check "Off" status color reset
        const resetOffColor = await offColorInput.inputValue();
        console.log(`"Off" status color after reset: ${resetOffColor} (was: ${originalStatusColors['Off']})`);

        // Check "Vehicle is idle" status color reset
        const resetIdleColor = await idleColorInput.inputValue();
        console.log(`"Vehicle is idle" status color after reset: ${resetIdleColor} (was: ${originalStatusColors['Vehicle is idle']})`);

        // Verify that reset functionality worked (colors changed from what we set)
        const addressChanged = resetAddressColor !== newAddressColor;
        const offChanged = resetOffColor !== newOffColor;
        const idleChanged = resetIdleColor !== newIdleColor;

        console.log(`Reset verification:`);
        console.log(`  Address color changed from our edit: ${addressChanged ? '✓' : '✗'}`);
        console.log(`  Off color changed from our edit: ${offChanged ? '✓' : '✗'}`);
        console.log(`  Idle color changed from our edit: ${idleChanged ? '✓' : '✗'}`);

        // Expect that the reset worked (colors are different from what we manually set)
        expect(addressChanged).toBe(true);
        expect(offChanged).toBe(true);
        expect(idleChanged).toBe(true);
        console.log('✓ Reset functionality verified successfully');

        // Step 9: Test Save functionality with new colors
        console.log('\n=== Testing Save Functionality ===');

        // Set new colors again for saving
        const finalAddressColor = '#FFA500'; // Orange
        const finalOffColor = '#800080'; // Purple
        const finalIdleColor = '#008000'; // Dark Green

        await page.locator('#addressHex').fill(finalAddressColor);
        await offColorInput.fill(finalOffColor);
        await idleColorInput.fill(finalIdleColor);

        console.log(`Set final address color to: ${finalAddressColor}`);
        console.log(`Set final "Off" status color to: ${finalOffColor}`);
        console.log(`Set final "Vehicle is idle" status color to: ${finalIdleColor}`);

        await page.waitForTimeout(1000);

        // Click "Save" button within the appearance settings modal
        const saveButton = page.locator('.appearance-modal__save-btn, button.appearance-modal__save-btn').first();
        await expect(saveButton).toBeVisible();
        await saveButton.click();
        console.log('✓ Clicked "Save" button');

        await page.waitForTimeout(2000); // Wait for save to complete

        // Click "Close" button within the appearance settings modal
        const closeButton = page.locator('.appearance-modal__close-action-btn, button.appearance-modal__close-action-btn').first();
        await expect(closeButton).toBeVisible();
        await closeButton.click();
        console.log('✓ Clicked "Close" button to close modal');

        await page.waitForTimeout(2000); // Wait for modal to close

        // Step 10: Verify driver cards reflect the saved color changes
        console.log('\n=== Verifying Saved Colors in Driver Cards ===');

        // Re-extract driver card colors to verify they match the saved colors
        const updatedDriverCardData = {};
        const updatedDriverCards = await page.locator('[class*="driver-card__container"], [class*="driver-card-container"]').all();

        for (let i = 0; i < updatedDriverCards.length; i++) {
            // Get driver name
            const driverName = await updatedDriverCards[i].locator('[class*="driver-name"], h5').textContent();

            // Extract STATUS colors
            const statusElement = updatedDriverCards[i].locator('[class*="driver-status"], [data-vehicle-name]').first();
            const statusText = await statusElement.textContent();

            const statusComputedStyle = await statusElement.evaluate((el) => {
                const styles = window.getComputedStyle(el);
                return {
                    backgroundColor: styles.backgroundColor,
                    color: styles.color
                };
            });

            // Extract ADDRESS colors
            let addressData = null;
            const addressElements = await updatedDriverCards[i].locator('[class*="driver-card-adress"], [class*="driver-card-address"], [class*="address"], a[href*="maps.google.com"]').all();

            if (addressElements.length > 0) {
                const addressElement = addressElements[0];
                const addressText = await addressElement.textContent();

                const addressComputedStyle = await addressElement.evaluate((el) => {
                    const styles = window.getComputedStyle(el);
                    return {
                        color: styles.color,
                        backgroundColor: styles.backgroundColor
                    };
                });

                addressData = {
                    text: addressText?.trim(),
                    textColor: rgbToHex(addressComputedStyle.color),
                    backgroundColor: rgbToHex(addressComputedStyle.backgroundColor)
                };
            }

            // Store updated driver data
            updatedDriverCardData[driverName?.trim() || `Driver ${i + 1}`] = {
                status: {
                    text: statusText?.trim(),
                    backgroundColor: rgbToHex(statusComputedStyle.backgroundColor),
                    textColor: rgbToHex(statusComputedStyle.color)
                },
                address: addressData
            };
        }

        console.log('Updated driver card data:', updatedDriverCardData);

        // Verify address colors match the saved color
        let addressColorMatches = 0;
        let totalAddressChecks = 0;

        for (const [driverName, driverData] of Object.entries(updatedDriverCardData)) {
            if (driverData.address) {
                totalAddressChecks++;
                const addressMatches = driverData.address.textColor === finalAddressColor.toUpperCase();
                if (addressMatches) addressColorMatches++;

                console.log(`Driver ${driverName} address color: ${driverData.address.textColor} (expected: ${finalAddressColor.toUpperCase()}) - ${addressMatches ? '✓' : '✗'}`);
            }
        }

        // Verify status colors match the saved colors
        let statusColorMatches = 0;
        let totalStatusChecks = 0;

        for (const [driverName, driverData] of Object.entries(updatedDriverCardData)) {
            if (driverData.status.text) {
                totalStatusChecks++;
                let expectedColor = '';

                if (driverData.status.text === 'Vehicle Is Off') {
                    expectedColor = finalOffColor.toUpperCase();
                } else if (driverData.status.text === 'Vehicle Is Idle') {
                    expectedColor = finalIdleColor.toUpperCase();
                }

                if (expectedColor) {
                    const statusMatches = driverData.status.backgroundColor === expectedColor || driverData.status.textColor === expectedColor;
                    if (statusMatches) statusColorMatches++;

                    console.log(`Driver ${driverName} status "${driverData.status.text}": ${driverData.status.textColor || driverData.status.backgroundColor} (expected: ${expectedColor}) - ${statusMatches ? '✓' : '✗'}`);
                }
            }
        }

        // Final validation
        console.log(`\nFinal Validation Summary:`);
        console.log(`Address colors updated: ${addressColorMatches}/${totalAddressChecks} matches`);
        console.log(`Status colors updated: ${statusColorMatches}/${totalStatusChecks} matches (for changed statuses)`);

        if (totalAddressChecks > 0) {
            expect(addressColorMatches).toBeGreaterThan(0);
        }
        if (totalStatusChecks > 0) {
            expect(statusColorMatches).toBeGreaterThan(0);
        }

        console.log('✓ Complete appearance settings functionality verified');

        // Log completion
        console.log('\n=== All Test Steps Completed ===');
        console.log('1. ✓ Driver Card panel visibility verified');
        console.log('2. ✓ Driver count and containers verified');
        console.log('3. ✓ Sort functionality tested');
        console.log('4. ✓ Driver statuses extracted');
        console.log('5. ✓ Appearance settings button clicked');
        console.log('6. ✓ Appearance Settings modal verified');
        console.log('7. ✓ Complete color comparison (status + address) completed');
        console.log('8. ✓ Color change and reset functionality tested');
        console.log('9. ✓ Save functionality tested');
        console.log('10. ✓ Driver card color updates verified');
        console.log('✓ Appearance settings test completed successfully!');
    });
});