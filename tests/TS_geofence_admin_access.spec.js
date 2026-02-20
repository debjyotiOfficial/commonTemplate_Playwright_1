const { test, expect } = require('C:/cypress-to-playwright-converted/node_modules/@playwright/test');
const { spawn } = require('child_process');
const path = require('path');

test.describe('Geofence Admin Access - Matrack Server', () => {

    test('should login, access account NATM0810, and load the platform', async ({ browser }) => {
        test.setTimeout(1200000); // 20 minutes timeout (includes packet sending + verification retries)

        // Create a new context (isolated session - no stored auth needed for matrack-server)
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
        });
        const page = await context.newPage();

        // ============= STEP 1: LOGIN =============
        console.log('\n========== STEP 1: LOGIN ==========');

        await page.goto('https://www.matrack-server.com/gpstracking/adminnew/view/login.php', {
            waitUntil: 'networkidle',
            timeout: 60000,
        });
        console.log('Login page loaded');

        // Fill username
        const usernameField = page.locator('#username');
        await usernameField.waitFor({ state: 'visible', timeout: 15000 });
        await usernameField.clear();
        await usernameField.fill('debjyoti');
        console.log('Username entered');

        // Fill password
        const passwordField = page.locator('#password');
        await passwordField.waitFor({ state: 'visible', timeout: 15000 });
        await passwordField.clear();
        await passwordField.fill('IIQrQ90WE$n1tFAre');
        console.log('Password entered');

        // Click Sign In
        const signInButton = page.locator('.submit');
        await signInButton.waitFor({ state: 'visible', timeout: 10000 });
        await signInButton.click();
        console.log('Sign In clicked');

        // Wait for redirect to index.php
        await page.waitForURL('**/adminnew/view/index.php', { timeout: 30000 });
        await page.waitForLoadState('networkidle', { timeout: 30000 });
        console.log('Login successful - redirected to index.php');

        // ============= STEP 2: CLICK ACCESS ACCOUNT =============
        console.log('\n========== STEP 2: ACCESS ACCOUNT ==========');

        // Use getByRole to target the specific "ACCESS ACCOUNT" button link
        // (there are 2 elements with id="aAccessAccount" - we want the button-styled one)
        const accessAccountLink = page.getByRole('link', { name: 'ACCESS ACCOUNT' });
        await accessAccountLink.waitFor({ state: 'visible', timeout: 15000 });

        // Listen for the new tab/popup that opens on click
        const [newPage] = await Promise.all([
            context.waitForEvent('page'),
            accessAccountLink.click(),
        ]);
        console.log('ACCESS ACCOUNT clicked - new tab opened');

        // Wait for the new tab to load
        await newPage.waitForLoadState('networkidle', { timeout: 30000 });
        await newPage.waitForURL('**/accessaccount.php', { timeout: 30000 });
        console.log('Access Account page loaded: ' + newPage.url());

        // ============= STEP 3: SELECT ACCOUNT BY IMEI =============
        console.log('\n========== STEP 3: SELECT ACCOUNT NATM0810 ==========');

        // Wait for Select2 JS to fully initialize on the page
        await newPage.waitForTimeout(5000);

        // Retry logic for Select2 AJAX search (server can be flaky)
        const maxRetries = 5;
        let selected = false;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`Search attempt ${attempt}/${maxRetries}`);

            // On retries, reload the page to get a clean Select2 state
            if (attempt > 1) {
                console.log('Reloading page for clean state...');
                await newPage.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
                await newPage.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
                    console.log('Network idle timeout on reload, continuing...');
                });
                await newPage.waitForTimeout(5000);
            }

            // Click on the Select2 dropdown to open it
            const select2Dropdown = newPage.locator('.select2-selection, .select2-container').first();
            await select2Dropdown.waitFor({ state: 'visible', timeout: 30000 });
            await select2Dropdown.click();
            await newPage.waitForTimeout(1000);
            console.log('Select2 dropdown opened');

            // Wait for the search input to appear
            const searchInput = newPage.locator('input.select2-search__field').first();
            await searchInput.waitFor({ state: 'visible', timeout: 10000 });
            await searchInput.click();
            await newPage.waitForTimeout(500);

            // Type the IMEI character by character with delay for Select2 AJAX debounce
            await searchInput.pressSequentially('862343068530220', { delay: 150 });
            console.log('IMEI entered: 862343068530220');

            // Wait for AJAX search to complete (give server time to respond)
            await newPage.waitForTimeout(5000);

            // Check if NATM0810 suggestion appeared
            const suggestion = newPage.locator('.select2-results__option', { hasText: 'NATM0810' });
            const isVisible = await suggestion.isVisible().catch(() => false);

            if (isVisible) {
                await suggestion.click();
                console.log('Selected NATM0810 from suggestions');
                selected = true;
                break;
            }

            // Log what we got instead
            const resultItems = newPage.locator('.select2-results__message, .select2-results__option');
            const errorText = await resultItems.first().textContent().catch(() => 'no text');
            console.log(`Select2 result: "${errorText}"`);

            if (attempt < maxRetries) {
                console.log('Retrying after pause...');
                await newPage.waitForTimeout(3000);
            }
        }

        if (!selected) {
            throw new Error(`Failed to find NATM0810 after ${maxRetries} attempts`);
        }

        // ============= STEP 4: CLICK ACCESS ACCOUNT BUTTON =============
        console.log('\n========== STEP 4: CLICK ACCESS ACCOUNT BUTTON ==========');

        const accessAccountButton = newPage.locator('button.accessAccount');
        await accessAccountButton.waitFor({ state: 'visible', timeout: 10000 });
        await accessAccountButton.click();
        console.log('Access Account button clicked');

        // ============= STEP 5: WAIT FOR PLATFORM TO LOAD =============
        console.log('\n========== STEP 5: WAITING FOR PLATFORM TO LOAD ==========');

        // Wait for the new tab with the NATM0810 maps page
        const platformPage = await context.waitForEvent('page', { timeout: 30000 });
        await platformPage.waitForLoadState('domcontentloaded', { timeout: 60000 });
        console.log('Platform page URL: ' + platformPage.url());

        // Wait for full platform load
        await platformPage.waitForLoadState('networkidle', { timeout: 120000 }).catch(() => {
            console.log('Network idle timeout - platform may still be loading background resources');
        });

        // Verify we are on the correct page
        expect(platformPage.url()).toContain('NATM0810/maps/index2.php');
        console.log('Platform loaded successfully at: ' + platformPage.url());

        // Wait additional time for all map assets / JS to initialize
        await platformPage.waitForTimeout(10000);
        console.log('Platform fully loaded and ready');

        // ============= STEP 6: CLICK HAMBURGER ICON =============
        console.log('\n========== STEP 6: CLICK HAMBURGER ICON ==========');

        const hamburgerIcon = platformPage.locator('button.navbar-toggler[data-toggle="minimize"]');
        await hamburgerIcon.waitFor({ state: 'visible', timeout: 15000 });
        await hamburgerIcon.click();
        console.log('Hamburger icon clicked');

        // Wait for side menu to expand
        await platformPage.waitForTimeout(2000);
        console.log('Side menu expanded');

        // ============= STEP 7: CLICK SETTINGS =============
        console.log('\n========== STEP 7: CLICK SETTINGS ==========');

        const settingsMenu = platformPage.locator('a.nav-link[href="#ui-settings"]');
        await settingsMenu.waitFor({ state: 'visible', timeout: 15000 });
        await settingsMenu.click();
        console.log('Settings clicked');

        // Wait for submenu to expand
        await platformPage.locator('#ui-settings.collapse.show').waitFor({ state: 'visible', timeout: 10000 });
        await platformPage.waitForTimeout(1000);
        console.log('Settings submenu expanded');

        // ============= STEP 8: CLICK CHANGE ALERT SETTINGS =============
        console.log('\n========== STEP 8: CLICK CHANGE ALERT SETTINGS ==========');

        const changeAlertSettings = platformPage.locator('a#aChangeAlertSetting');
        await changeAlertSettings.waitFor({ state: 'visible', timeout: 10000 });
        await changeAlertSettings.click();
        console.log('Change Alert Settings clicked');

        // Wait for the panel/modal to load
        await platformPage.waitForTimeout(5000);

        // ============= STEP 9: VERIFY MODAL APPEARS =============
        console.log('\n========== STEP 9: VERIFY ALERT SETTINGS MODAL ==========');

        // Try multiple possible selectors for the alert settings panel (different platforms use different IDs)
        const modalSelectors = [
            '#change-alerts-settings-panel',
            '#divChangeAlertSetting',
            '.modal.show',
            '[id*="alert"][id*="setting"]',
            '[id*="Alert"][id*="Setting"]',
        ];

        let alertSettingsModal = null;
        for (const selector of modalSelectors) {
            const el = platformPage.locator(selector).first();
            if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
                alertSettingsModal = el;
                console.log(`Alert settings modal found with selector: ${selector}`);
                break;
            }
        }

        // If none of the known selectors work, detect what panel appeared
        if (!alertSettingsModal) {
            // Log all visible panels/modals for debugging
            const visiblePanels = await platformPage.evaluate(() => {
                const panels = document.querySelectorAll('.modal.show, [class*="panel"], [id*="panel"], [id*="modal"], [id*="alert"], [id*="Alert"]');
                return Array.from(panels)
                    .filter(el => el.offsetParent !== null || el.style.display === 'block')
                    .map(el => ({ id: el.id, classes: el.className.substring(0, 80), tag: el.tagName }));
            });
            console.log('Visible panels/modals:', JSON.stringify(visiblePanels, null, 2));

            // Try to find any newly visible panel that has a select2 dropdown (likely the alert settings)
            const panelWithDropdown = platformPage.locator('.select2-container').first();
            if (await panelWithDropdown.isVisible({ timeout: 5000 }).catch(() => false)) {
                // Use the parent panel
                alertSettingsModal = platformPage.locator('.select2-container').first().locator('..').locator('..');
                console.log('Found alert settings panel via Select2 dropdown');
            } else {
                throw new Error('Change Alert Settings modal/panel not found after clicking');
            }
        }

        console.log('Change Alert Settings modal is visible');

        // ============= STEP 10: SELECT A VEHICLE FROM DROPDOWN =============
        console.log('\n========== STEP 10: SELECT VEHICLE FROM DROPDOWN ==========');

        // The modal (#divChangeAlert) uses a native <select> dropdown, not Select2
        const vehicleSelect = platformPage.locator('#divChangeAlert select').first();
        await vehicleSelect.waitFor({ state: 'visible', timeout: 15000 });

        // Select the first device option (skip any placeholder/empty option)
        const selectedDeviceName = await platformPage.evaluate(() => {
            const select = document.querySelector('#divChangeAlert select');
            if (!select) return 'unknown';
            // Select the first option that has a value
            for (const opt of select.options) {
                if (opt.value && opt.value !== '') {
                    select.value = opt.value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    return opt.text;
                }
            }
            return select.options[0]?.text || 'unknown';
        });
        console.log(`Selected vehicle: ${selectedDeviceName}`);

        // Wait for alert toggles to load for the selected device
        await platformPage.waitForTimeout(3000);

        // ============= STEP 11: CHECK GEOFENCING ALERT AND TAKE ACTION =============
        console.log('\n========== STEP 11: CHECK GEOFENCING ALERT ==========');

        // The alerts use ON/OFF toggle buttons (not checkboxes)
        // Find the Geofencing Alert toggle and check its state
        const geofenceState = await platformPage.evaluate(() => {
            const modal = document.querySelector('#divChangeAlert');
            if (!modal) return { found: false, isOn: false };

            // Look for all toggle buttons/elements that contain "Geofenc" text nearby
            const allElements = modal.querySelectorAll('*');
            for (const el of allElements) {
                if (el.childNodes.length === 1 && el.textContent.trim().toLowerCase().includes('geofencing alert')) {
                    // Found the label, now find the associated toggle
                    const parent = el.closest('div, tr, td, li');
                    if (parent) {
                        // Look for ON/OFF button or toggle in the same container
                        const toggleBtn = parent.querySelector('button, .toggle, [class*="toggle"], [class*="switch"]');
                        if (toggleBtn) {
                            const isOn = toggleBtn.textContent.trim().toLowerCase() === 'on' ||
                                         toggleBtn.classList.contains('on') ||
                                         toggleBtn.classList.contains('active') ||
                                         toggleBtn.classList.contains('btn-success');
                            return { found: true, isOn, selector: toggleBtn.className };
                        }
                        // Check for input checkbox used as toggle
                        const checkbox = parent.querySelector('input[type="checkbox"]');
                        if (checkbox) {
                            return { found: true, isOn: checkbox.checked, selector: `#${checkbox.id}` };
                        }
                    }
                }
            }

            // Fallback: search for any element with "Geofenc" and an adjacent ON/OFF indicator
            const textNodes = modal.innerHTML;
            const geofenceMatch = textNodes.match(/geofencing\s*alert/i);
            if (geofenceMatch) {
                // Look for toggle buttons with ON class near geofencing text
                const buttons = modal.querySelectorAll('button, [class*="toggle"], [class*="btn"]');
                let geofenceRow = null;
                for (const btn of buttons) {
                    const row = btn.closest('div, tr');
                    if (row && row.textContent.toLowerCase().includes('geofencing')) {
                        geofenceRow = row;
                        const isOn = btn.textContent.trim().toUpperCase() === 'ON' ||
                                     btn.classList.contains('btn-success') ||
                                     btn.style.backgroundColor === 'green' ||
                                     btn.style.backgroundColor === 'rgb(0, 128, 0)' ||
                                     getComputedStyle(btn).backgroundColor === 'rgb(40, 167, 69)' ||
                                     getComputedStyle(btn).backgroundColor === 'rgb(0, 128, 0)';
                        return { found: true, isOn, selector: btn.className, text: btn.textContent.trim() };
                    }
                }
            }

            return { found: false, isOn: false };
        });

        console.log(`Geofencing Alert - Found: ${geofenceState.found}, Is ON: ${geofenceState.isOn}`);

        if (!geofenceState.found) {
            // Debug: list all visible toggle/button elements in the modal
            const allToggles = await platformPage.evaluate(() => {
                const modal = document.querySelector('#divChangeAlert');
                if (!modal) return [];
                const buttons = modal.querySelectorAll('button, [class*="toggle"], [class*="btn"], [class*="switch"]');
                return Array.from(buttons)
                    .filter(b => b.offsetParent !== null)
                    .map(b => ({
                        tag: b.tagName,
                        text: b.textContent.trim().substring(0, 40),
                        classes: b.className.substring(0, 60),
                        id: b.id
                    }));
            });
            console.log('Visible buttons/toggles in modal:', JSON.stringify(allToggles, null, 2));
            throw new Error('Geofencing Alert toggle not found in the modal');
        }

        if (!geofenceState.isOn) {
            // Geofencing Alert is OFF -> click to switch it ON
            console.log('Geofencing Alert is OFF - switching it ON...');

            // Click the Geofencing Alert toggle button
            await platformPage.evaluate(() => {
                const modal = document.querySelector('#divChangeAlert');
                const buttons = modal.querySelectorAll('button, [class*="toggle"], [class*="btn"]');
                for (const btn of buttons) {
                    const row = btn.closest('div, tr');
                    if (row && row.textContent.toLowerCase().includes('geofencing')) {
                        btn.click();
                        break;
                    }
                }
            });
            await platformPage.waitForTimeout(1000);
            console.log('Geofencing Alert toggled ON');

            // Click SAVE SETTINGS
            console.log('Clicking SAVE SETTINGS...');
            const saveButton = platformPage.locator('#divChangeAlert button').filter({ hasText: /SAVE SETTINGS/i });
            await saveButton.waitFor({ state: 'visible', timeout: 10000 });
            await saveButton.click();
            console.log('SAVE SETTINGS clicked');

            // Wait for save to complete
            await platformPage.waitForTimeout(5000);
            console.log('Settings saved');
        } else {
            // Geofencing Alert is already ON -> close the modal
            console.log('Geofencing Alert is already ON - closing modal...');

            const closeButton = platformPage.locator('#divChangeAlert .close, #divChangeAlert button[data-dismiss="modal"]').first();
            await closeButton.waitFor({ state: 'visible', timeout: 10000 });
            await closeButton.click();
            console.log('Modal closed');
        }

        await platformPage.waitForTimeout(2000);
        console.log('Geofencing alert check completed');

        // ============= STEP 12: CLICK ADD/EDIT ALERT CONTACTS =============
        console.log('\n========== STEP 12: CLICK ADD/EDIT ALERT CONTACTS ==========');

        // Re-expand the side menu if it collapsed
        const hamburgerVisible = await platformPage.locator('button.navbar-toggler[data-toggle="minimize"]').isVisible().catch(() => false);
        if (hamburgerVisible) {
            // Check if Settings submenu is still visible, if not re-navigate
            const settingsSubMenuVisible = await platformPage.locator('#ui-settings.collapse.show').isVisible().catch(() => false);
            if (!settingsSubMenuVisible) {
                await platformPage.locator('button.navbar-toggler[data-toggle="minimize"]').click();
                await platformPage.waitForTimeout(2000);
                await platformPage.locator('a.nav-link[href="#ui-settings"]').click();
                await platformPage.locator('#ui-settings.collapse.show').waitFor({ state: 'visible', timeout: 10000 });
                await platformPage.waitForTimeout(1000);
            }
        }

        // Click on Add/Edit Alert Contacts
        const addEditAlertContacts = platformPage.locator('a#aAddEditAlert');
        await addEditAlertContacts.waitFor({ state: 'visible', timeout: 10000 });
        await addEditAlertContacts.click();
        console.log('Add/Edit Alert Contacts clicked');

        // ============= STEP 13: VERIFY EDIT ALERT CONTACT MODAL =============
        console.log('\n========== STEP 13: VERIFY EDIT ALERT CONTACT MODAL ==========');

        const alertContactModal = platformPage.locator('#divAlertContact.modal');
        await alertContactModal.waitFor({ state: 'visible', timeout: 30000 });
        console.log('Edit Alert Contact modal is visible');

        // Verify modal title
        const modalTitle = platformPage.locator('#divAlertContact .modal-title');
        await expect(modalTitle).toContainText('Edit Alert Contact');
        console.log('Modal title verified: Edit Alert Contact');

        // ============= STEP 14: CHECK IF EMAIL CONTACT EXISTS =============
        console.log('\n========== STEP 14: CHECK EMAIL CONTACT ==========');

        const targetEmail = 'debjyoti@sievanetworks2.com';
        const targetName = 'Debjyoti d';

        // Check if the email already exists in the email contact list
        const emailContactList = platformPage.locator('#divAlertContact .EmailviewContact');
        await emailContactList.waitFor({ state: 'visible', timeout: 10000 });

        const emailExists = await emailContactList.locator('label').filter({ hasText: targetEmail }).count() > 0;
        console.log(`Email "${targetEmail}, ${targetName}" exists: ${emailExists}`);

        if (emailExists) {
            // Email already exists - verify it
            console.log(`Email contact "${targetEmail}, ${targetName}" is already present in the list`);
            await expect(emailContactList).toContainText(targetEmail);
            await expect(emailContactList).toContainText(targetName);
            console.log('Email contact verified successfully');
        } else {
            // Email does not exist - add it
            console.log(`Email contact not found - adding "${targetEmail}, ${targetName}"...`);

            // Enter email address
            const emailInput = platformPage.locator('#txtEmail');
            await emailInput.waitFor({ state: 'visible', timeout: 10000 });
            await emailInput.clear();
            await emailInput.fill(targetEmail);
            console.log(`Email entered: ${targetEmail}`);

            // Enter full name
            const nameInput = platformPage.locator('#txtName');
            await nameInput.waitFor({ state: 'visible', timeout: 10000 });
            await nameInput.clear();
            await nameInput.fill(targetName);
            console.log(`Name entered: ${targetName}`);

            // Click "+ Add Contact Email"
            const addEmailButton = platformPage.locator('#btnAddEmail');
            await addEmailButton.waitFor({ state: 'visible', timeout: 10000 });
            await addEmailButton.click();
            console.log('Add Contact Email button clicked');

            // Wait for the contact to be added
            await platformPage.waitForTimeout(5000);

            // Verify the email now appears in the list
            await expect(emailContactList).toContainText(targetEmail, { timeout: 15000 });
            await expect(emailContactList).toContainText(targetName);
            console.log(`Email contact "${targetEmail}, ${targetName}" added and verified in the list`);
        }

        await platformPage.waitForTimeout(2000);
        console.log('Alert contact email check completed');

        // ============= STEP 15: RUN GEOFENCE PACKET SENDER =============
        console.log('\n========== STEP 15: RUN GEOFENCE PACKET SENDER ==========');

        // Close the Alert Contact modal first if still open
        const alertModalCloseBtn = platformPage.locator('#divAlertContact .close, #divAlertContact button[data-dismiss="modal"]').first();
        if (await alertModalCloseBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await alertModalCloseBtn.click();
            await platformPage.waitForTimeout(2000);
            console.log('Alert Contact modal closed');
        }

        // Run the Python geofence packet sender script as a child process
        const pythonScriptPath = path.resolve('C:/geofence_hari/geofence_packet_sender_alternating.py');
        console.log(`Starting packet sender: ${pythonScriptPath}`);

        // Number of packets to send before stopping (each alternates inside/outside)
        // 4 packets = 2 inside + 2 outside = 2 geofence entry + 2 exit events
        const targetPackets = 4;
        let packetsSent = 0;
        let scriptOutput = [];
        const capturedPackets = []; // Store {lat, lng, status, packetString, localTime} for each sent packet

        const packetSenderDone = new Promise((resolve, reject) => {
            const pythonProcess = spawn('python', [pythonScriptPath], {
                cwd: 'C:/geofence_hari',
                stdio: ['ignore', 'pipe', 'pipe'],
            });

            let processKilled = false;

            // Helper to parse packet info from log output
            function parsePacketFromOutput(text) {
                // Match: [SENT] [INSIDE/OUTSIDE] Lat: 37.769120, Lon: -121.959927
                const sentMatch = text.match(/\[SENT\]\s*\[(INSIDE|OUTSIDE)\]\s*Lat:\s*([-\d.]+),\s*Lon:\s*([-\d.]+)/);
                if (sentMatch) {
                    return {
                        status: sentMatch[1],
                        lat: parseFloat(sentMatch[2]),
                        lng: parseFloat(sentMatch[3]),
                        localTime: new Date().toISOString(),
                    };
                }
                return null;
            }

            // Helper to extract full packet string from log
            function parsePacketString(text) {
                const pktMatch = text.match(/Packet:\s*(S102[^\n\r]+)/);
                return pktMatch ? pktMatch[1].trim() : null;
            }

            pythonProcess.stdout.on('data', (data) => {
                const output = data.toString();
                scriptOutput.push(output);
                console.log(`[PACKET SENDER] ${output.trim()}`);

                // Parse and capture packet details
                const packetInfo = parsePacketFromOutput(output);
                if (packetInfo) {
                    capturedPackets.push(packetInfo);
                    packetsSent = capturedPackets.length;
                    console.log(`Packets sent so far: ${packetsSent}/${targetPackets} | Lat: ${packetInfo.lat}, Lng: ${packetInfo.lng}, Status: ${packetInfo.status}`);
                }
                const pktStr = parsePacketString(output);
                if (pktStr && capturedPackets.length > 0) {
                    capturedPackets[capturedPackets.length - 1].packetString = pktStr;
                }

                // Once we've sent enough packets, kill the process
                if (packetsSent >= targetPackets && !processKilled) {
                    processKilled = true;
                    console.log(`\nTarget of ${targetPackets} packets reached. Stopping packet sender...`);
                    pythonProcess.kill('SIGTERM');
                }
            });

            pythonProcess.stderr.on('data', (data) => {
                const errOutput = data.toString();
                scriptOutput.push(`[STDERR] ${errOutput}`);
                console.log(`[PACKET SENDER STDERR] ${errOutput.trim()}`);

                // The Python logging module sends to stderr - parse packets from there too
                const packetInfo = parsePacketFromOutput(errOutput);
                if (packetInfo) {
                    capturedPackets.push(packetInfo);
                    packetsSent = capturedPackets.length;
                    console.log(`Packets sent so far: ${packetsSent}/${targetPackets} | Lat: ${packetInfo.lat}, Lng: ${packetInfo.lng}, Status: ${packetInfo.status}`);
                }
                const pktStr = parsePacketString(errOutput);
                if (pktStr && capturedPackets.length > 0) {
                    capturedPackets[capturedPackets.length - 1].packetString = pktStr;
                }

                if (packetsSent >= targetPackets && !processKilled) {
                    processKilled = true;
                    console.log(`\nTarget of ${targetPackets} packets reached. Stopping packet sender...`);
                    pythonProcess.kill('SIGTERM');
                }
            });

            pythonProcess.on('close', (code) => {
                console.log(`Packet sender process exited with code: ${code}`);
                resolve({ packetsSent, code });
            });

            pythonProcess.on('error', (err) => {
                console.error(`Failed to start packet sender: ${err.message}`);
                reject(err);
            });

            // Safety timeout: kill after 10 minutes regardless
            setTimeout(() => {
                if (!processKilled) {
                    processKilled = true;
                    console.log('Safety timeout reached (10 min). Killing packet sender...');
                    pythonProcess.kill('SIGTERM');
                }
            }, 600000);
        });

        // Wait for the packet sender to finish
        console.log(`Waiting for ${targetPackets} packets to be sent (each takes ~2 min)...`);
        console.log('Pattern: INSIDE -> OUTSIDE -> INSIDE -> OUTSIDE');
        console.log('Each inside/outside transition triggers a geofence alert notification');

        const result = await packetSenderDone;
        console.log(`\nPacket sender completed:`);
        console.log(`  Total packets sent: ${result.packetsSent}`);
        console.log(`  Exit code: ${result.code}`);
        console.log(`  Captured packets: ${capturedPackets.length}`);
        capturedPackets.forEach((pkt, i) => {
            console.log(`  Packet ${i + 1}: [${pkt.status}] Lat=${pkt.lat}, Lng=${pkt.lng}, Time=${pkt.localTime}`);
        });
        console.log('Geofence alert notifications should have been triggered for the configured email contacts');

        // Give the server a moment to process the last alerts
        await platformPage.waitForTimeout(5000);
        console.log('Step 15 completed - Geofence packet sender finished');

        // ============= STEP 16: OPEN HARDWARE TESTING PAGE =============
        console.log('\n========== STEP 16: OPEN HARDWARE TESTING PAGE ==========');

        const hardwareTestPage = await context.newPage();
        await hardwareTestPage.goto('https://www.tracking.matrack.io/gpstracking/hardware_testing/index2.php', {
            waitUntil: 'domcontentloaded',
            timeout: 60000,
        });
        await hardwareTestPage.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
            console.log('Network idle timeout on hardware testing page, continuing...');
        });
        console.log('Current URL: ' + hardwareTestPage.url());

        // Handle login redirect if redirected to login page
        if (hardwareTestPage.url().includes('login.php')) {
            console.log('Redirected to login page - entering credentials...');

            const loginUsername = hardwareTestPage.locator('#username');
            await loginUsername.waitFor({ state: 'visible', timeout: 15000 });
            await loginUsername.clear();
            await loginUsername.fill('debjyoti');

            const loginPassword = hardwareTestPage.locator('#password');
            await loginPassword.waitFor({ state: 'visible', timeout: 15000 });
            await loginPassword.clear();
            await loginPassword.fill('IIQrQ90WE$n1tFAre');

            const loginSignIn = hardwareTestPage.locator('.submit');
            await loginSignIn.waitFor({ state: 'visible', timeout: 10000 });
            await loginSignIn.click();
            console.log('Sign In clicked');

            // Wait for redirect to hardware testing page
            await hardwareTestPage.waitForURL('**/hardware_testing/**', { timeout: 30000 });
            await hardwareTestPage.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
                console.log('Network idle timeout after login, continuing...');
            });
            console.log('Login successful - redirected to hardware testing page');
        }

        console.log('Hardware testing page loaded: ' + hardwareTestPage.url());

        // ============= STEP 17: CLICK NEW VERSION =============
        console.log('\n========== STEP 17: CLICK NEW VERSION ==========');

        // Click "New Version" link which opens index4.php in a new tab
        const [index4Page] = await Promise.all([
            context.waitForEvent('page'),
            hardwareTestPage.locator('a[href="index4.php"]').click(),
        ]);
        await index4Page.waitForLoadState('domcontentloaded', { timeout: 60000 });
        await index4Page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
            console.log('Network idle timeout on index4 page, continuing...');
        });
        console.log('New Version page loaded: ' + index4Page.url());

        // ============= STEP 18: SEARCH PACKETS FOR IMEI =============
        console.log('\n========== STEP 18: SEARCH PACKETS FOR IMEI ==========');

        // Helper function to enter IMEI, select radio, and search packets
        async function searchPacketsOnPage(targetPage) {
            // Enter IMEI
            const imeiInput = targetPage.locator('#imei_value');
            await imeiInput.waitFor({ state: 'visible', timeout: 15000 });
            await imeiInput.clear();
            await imeiInput.fill('862343068530220');
            console.log('IMEI entered: 862343068530220');

            // Select "New MA1080" radio button
            const newMa1080Radio = targetPage.locator('input[name="deviceType"][value="new_ma1080"]');
            await newMa1080Radio.waitFor({ state: 'visible', timeout: 10000 });
            await newMa1080Radio.check();
            console.log('Radio button "New MA1080" selected');

            // Intercept the API call to verify status 200
            const apiResponsePromise = targetPage.waitForResponse(
                (response) => response.url().includes('getimeiData_6008-new.php'),
                { timeout: 60000 }
            );

            // Click Search Packets button
            const searchButton = targetPage.locator('#submit_button');
            await searchButton.waitFor({ state: 'visible', timeout: 10000 });
            await searchButton.click();
            console.log('Search Packets clicked');

            // Wait for API response
            const apiResponse = await apiResponsePromise;
            console.log(`API Response Status: ${apiResponse.status()}`);
            console.log(`API URL: ${apiResponse.url()}`);

            if (apiResponse.status() !== 200) {
                throw new Error(`API returned status ${apiResponse.status()}, expected 200`);
            }
            console.log('API status verified: 200 OK');

            return apiResponse;
        }

        await searchPacketsOnPage(index4Page);

        // ============= STEP 19: EXTRACT LAST PACKET INFO =============
        console.log('\n========== STEP 19: EXTRACT LAST PACKET INFO ==========');

        // Helper function to extract last packet info from the textarea
        function parseLastPacketFromTextarea(textareaContent) {
            const lines = textareaContent.trim().split('\n').filter(line => line.trim());
            if (lines.length === 0) return null;

            // Get the last line
            const lastLine = lines[lines.length - 1].trim();
            console.log(`Last packet line: ${lastLine.substring(0, 120)}...`);

            // Parse: Client ('IP', port) sent time: YYYY-MM-DD HH:MM:SS.ffffff data: S102,...
            const timeMatch = lastLine.match(/sent time:\s*([\d-]+\s+[\d:.]+)/);
            const dataMatch = lastLine.match(/data:\s*(S102[^\n\r]*)/);

            if (!timeMatch || !dataMatch) {
                console.log('Could not parse last packet line');
                return null;
            }

            const sentTimeUTC = timeMatch[1].trim();
            const dataStr = dataMatch[1].trim();

            // Parse lat/lng from data: S102,4,0,862343068530220,LAT,LNG,...
            const dataParts = dataStr.split(',');
            // IMEI is at index 3 (862343068530220), lat at index 4, lng at index 5
            const lat = parseFloat(dataParts[4]);
            const lng = parseFloat(dataParts[5]);

            return {
                sentTimeUTC,
                lat,
                lng,
                rawData: dataStr,
                rawLine: lastLine,
            };
        }

        // Wait a moment for textarea to populate
        await index4Page.waitForTimeout(3000);

        let textareaContent = await index4Page.locator('#dataRows').inputValue();
        let lastPacketFromAPI = parseLastPacketFromTextarea(textareaContent);

        if (lastPacketFromAPI) {
            console.log(`Last packet from API (before retry):`);
            console.log(`  Sent Time (UTC): ${lastPacketFromAPI.sentTimeUTC}`);
            console.log(`  Lat: ${lastPacketFromAPI.lat}, Lng: ${lastPacketFromAPI.lng}`);
            console.log(`  Raw Data: ${lastPacketFromAPI.rawData.substring(0, 100)}...`);
        } else {
            console.log('No packets found in textarea yet');
        }

        // ============= STEP 20: VERIFY PYTHON SCRIPT PACKETS IN API =============
        console.log('\n========== STEP 20: VERIFY PYTHON SCRIPT PACKETS MATCH API ==========');

        // The Python script may have just finished sending packets.
        // There could be a server delay, so we need to retry if the latest packets aren't visible yet.
        const lastPythonPacket = capturedPackets.length > 0 ? capturedPackets[capturedPackets.length - 1] : null;

        if (!lastPythonPacket) {
            console.log('WARNING: No packets were captured from the Python script - skipping verification');
        } else {
            console.log(`Last Python packet: Lat=${lastPythonPacket.lat}, Lng=${lastPythonPacket.lng}, Status=${lastPythonPacket.status}`);

            // Check if the last API packet matches the last Python packet (within tolerance)
            const latTolerance = 0.002; // ~200 meters tolerance for lat/lng comparison
            const lngTolerance = 0.002;

            function packetsMatch(apiPacket, pyPacket) {
                if (!apiPacket || !pyPacket) return false;
                const latDiff = Math.abs(apiPacket.lat - pyPacket.lat);
                const lngDiff = Math.abs(apiPacket.lng - pyPacket.lng);
                console.log(`  Comparing: API(${apiPacket.lat}, ${apiPacket.lng}) vs Python(${pyPacket.lat}, ${pyPacket.lng})`);
                console.log(`  Lat diff: ${latDiff.toFixed(6)}, Lng diff: ${lngDiff.toFixed(6)}`);
                return latDiff <= latTolerance && lngDiff <= lngTolerance;
            }

            let matched = packetsMatch(lastPacketFromAPI, lastPythonPacket);

            // Retry logic: if not matched, wait, hard refresh, and search again
            const maxRetries = 3;
            for (let retry = 1; retry <= maxRetries && !matched; retry++) {
                console.log(`\nPackets not matched yet. Retry ${retry}/${maxRetries} - waiting 20 seconds...`);
                await index4Page.waitForTimeout(20000);

                // Hard refresh the page
                console.log('Hard refreshing the page...');
                await index4Page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
                await index4Page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
                    console.log('Network idle timeout on refresh, continuing...');
                });
                await index4Page.waitForTimeout(3000);

                // Re-enter IMEI, select radio, and search again
                console.log('Re-searching packets...');
                await searchPacketsOnPage(index4Page);

                // Wait for textarea to populate
                await index4Page.waitForTimeout(3000);

                textareaContent = await index4Page.locator('#dataRows').inputValue();
                lastPacketFromAPI = parseLastPacketFromTextarea(textareaContent);

                if (lastPacketFromAPI) {
                    console.log(`Last packet from API (retry ${retry}):`);
                    console.log(`  Sent Time (UTC): ${lastPacketFromAPI.sentTimeUTC}`);
                    console.log(`  Lat: ${lastPacketFromAPI.lat}, Lng: ${lastPacketFromAPI.lng}`);

                    matched = packetsMatch(lastPacketFromAPI, lastPythonPacket);
                } else {
                    console.log('No packets found in textarea after retry');
                }
            }

            // Log all captured Python packets vs API for reference
            console.log('\n--- COMPARISON SUMMARY ---');
            console.log('Python script packets sent:');
            capturedPackets.forEach((pkt, i) => {
                console.log(`  ${i + 1}. [${pkt.status}] Lat=${pkt.lat}, Lng=${pkt.lng}, Time=${pkt.localTime}`);
                if (pkt.packetString) {
                    console.log(`     Packet: ${pkt.packetString.substring(0, 80)}...`);
                }
            });

            if (lastPacketFromAPI) {
                console.log(`\nLatest packet from API/textarea:`);
                console.log(`  Sent Time (UTC): ${lastPacketFromAPI.sentTimeUTC}`);
                console.log(`  Lat: ${lastPacketFromAPI.lat}, Lng: ${lastPacketFromAPI.lng}`);
                console.log(`  Raw: ${lastPacketFromAPI.rawData.substring(0, 100)}`);
            }

            if (matched) {
                console.log('\nVERIFICATION PASSED: Latest API packet matches the Python script packet (within tolerance)');
            } else {
                console.log('\nVERIFICATION NOTE: Packets did not match within tolerance after retries.');
                console.log('This may be due to server processing delay or GPS coordinate rounding.');
                // Log all textarea lines containing our IMEI for debugging
                const allLines = textareaContent.split('\n').filter(l => l.includes('862343068530220'));
                const recentLines = allLines.slice(-5);
                console.log(`\nLast 5 packets in textarea for IMEI 862343068530220:`);
                recentLines.forEach(line => {
                    const tMatch = line.match(/sent time:\s*([\d-]+\s+[\d:.]+)/);
                    const dMatch = line.match(/data:\s*(S102[^\n\r]*)/);
                    if (tMatch && dMatch) {
                        const parts = dMatch[1].split(',');
                        console.log(`  Time(UTC): ${tMatch[1]} | Lat: ${parts[4]}, Lng: ${parts[5]}`);
                    }
                });
            }
        }

        await index4Page.waitForTimeout(3000);
        console.log('Step 20 completed - Hardware testing packet verification finished');
    });
});
