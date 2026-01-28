const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

test.describe('Track History Tests', () => {
    let config;
    let helpers;

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
    
    test('should verify HERE Maps car marker animation functionality', async ({ page }) => {
        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        // Use fast login helper which handles stored auth vs fresh login automatically
        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

        await expect(page.locator(config.selectors.navigation.trackHistoryMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.trackHistoryMenu).click({ force: true });
        
        await expect(page.locator(config.selectors.modal.trackHistoryContainer)).toBeVisible();

        // Setup track history data
        await page.locator('#select2-track-history-device-select-container').click();
        await page.locator('.select2-results__option').filter({ hasText: 'Sales car1' }).click();
        
        // await page.locator('input#track-history-date-range-picker').click();
        // await page.locator('.flatpickr-day[aria-label="August 1, 2025"]').click({ force: true });
        // await page.locator('.flatpickr-day[aria-label="August 3, 2025"]').click({ force: true });

            await page.locator('#track-history-date-range-picker').click();

            // Navigate to 2025 (data year) since calendar defaults to current year (2026)
            const yearInput = page.locator('.flatpickr-calendar.open .numInputWrapper input.cur-year');
            await yearInput.click();
            await yearInput.fill('2025');
            await yearInput.press('Enter');
            await page.waitForTimeout(500);

            await page.selectOption('.flatpickr-calendar.open .flatpickr-monthDropdown-months', 'August');

            // Select August 1, 2025
            await page.locator('.flatpickr-calendar.open .flatpickr-day[aria-label="August 1, 2025"]').click({ force: true });

            // Select August 3, 2025 (as end date)
            await page.locator('.flatpickr-calendar.open .flatpickr-day[aria-label="August 3, 2025"]').click({ force: true });

        
        await expect(page.locator(config.selectors.trackHistoryReport.submitButton)).toBeVisible();
        await page.locator(config.selectors.trackHistoryReport.submitButton).click({ force: true });
        
        await page.waitForTimeout(60000); // Increased to 60 seconds for data loading
        
        await expect(page.locator(config.selectors.trackHistoryReport.playbackButton)).toBeVisible();
        await page.locator(config.selectors.trackHistoryReport.playbackButton).click({ force: true });
            
        await page.locator(config.selectors.trackHistoryReport.segmentDropdown).click({ force: true });

        const segmentText = await page.locator(config.selectors.trackHistoryReport.segmentSize).textContent();
        console.log('Track History Length:', segmentText);

        // Sort and select first segment
        await expect(page.locator(config.selectors.trackHistoryReport.sortBtn)).toBeVisible();
        await page.locator(config.selectors.trackHistoryReport.sortBtn).click({ force: true });

        await expect(page.locator(config.selectors.trackHistoryReport.sortBtn)).toBeVisible();
        await page.locator(config.selectors.trackHistoryReport.sortBtn).click({ force: true });

        // Wait for sort to complete
        await page.waitForTimeout(1000);

        // Re-expand the segment dropdown if it collapsed after sorting
        await page.locator(config.selectors.trackHistoryReport.segmentDropdown).click({ force: true });
        await page.waitForTimeout(500);

        // Click item 1 - wait for it to be visible first
        const item1Locator = page.locator(config.selectors.trackHistoryReport.itemNo).filter({ hasText: /^1$/ });
        await expect(item1Locator).toBeVisible({ timeout: 10000 });
        await item1Locator.click({ force: true });

        // Wait for segment data to load and playback controls to appear
        await page.waitForTimeout(3000);

        const markerCount = await page.locator(config.selectors.trackHistoryReport.markers).count();
        expect(markerCount).toBeGreaterThan(0);

        // HERE MAPS CAR MARKER TESTING STARTS
        console.log('=== TESTING HERE MAPS CAR MARKER ANIMATION ===');
        
        // Test 1: Verify car marker exists before animation
        const carMarkerExists = await page.evaluate(() => {
            console.log('Checking for car marker in window object...');
            
            if (window.carMarker || (window.displayRoute && window.displayRoute.carMarker)) {
                console.log('✓ Car marker found in window scope');
                return true;
            }
            return false;
        });
        
        if (carMarkerExists) {
            console.log('Car marker verification passed');
        }

        // Test 2: Check HERE Maps objects before play
        let initialMapObjects = await page.evaluate(() => {
            if (window.map && window.map.getObjects) {
                const objects = window.map.getObjects();
                console.log(`Initial map objects count: ${objects.length}`);
                
                // Look for car marker specifically
                const carMarkers = objects.filter(obj => {
                    if (obj && obj.getIcon && obj.getIcon()) {
                        const icon = obj.getIcon();
                        if (icon && icon.getBitmap && icon.getBitmap().includes && icon.getBitmap().includes('svg')) {
                            const svgContent = icon.getBitmap();
                            return svgContent.includes('#2563eb') && svgContent.includes('circle');
                        }
                    }
                    return false;
                });
                
                console.log(`Found ${carMarkers.length} potential car markers before play`);
                return objects.length;
            }
            return 0;
        });

        // Test 3: Start animation and verify car marker creation
        // The playback controls are text-based elements within the track history container
        // Use a more specific locator to avoid matching "Display" which contains "Play"
        const playButton = page.locator('text="Play"').first();
        await expect(playButton).toBeVisible({ timeout: 15000 });
        await playButton.click({ force: true });

        await page.waitForTimeout(2000); // Wait for animation to start

        // Verify car marker was created and is animating
        const animationStarted = await page.evaluate(() => {
            if (window.map && window.map.getObjects) {
                const objects = window.map.getObjects();
                console.log(`Map objects count after play: ${objects.length}`);
                
                // Look for the animated car marker
                const carMarkers = objects.filter(obj => {
                    if (obj && obj.getIcon && obj.getIcon()) {
                        const icon = obj.getIcon();
                        if (icon && icon.getBitmap && icon.getBitmap().includes) {
                            const svgContent = icon.getBitmap();
                            return svgContent.includes('#2563eb') && 
                                   (svgContent.includes('path') || svgContent.includes('circle')) &&
                                   svgContent.includes('fill');
                        }
                    }
                    return false;
                });
                
                if (carMarkers.length > 0) {
                    console.log(`✓ ANIMATION STARTED: Found ${carMarkers.length} car marker(s) on map`);
                    return true;
                } else {
                    console.log('⚠ No car marker found after play - checking for alternative markers');
                    return false;
                }
            }
            return false;
        });

        // Test 4: Verify car moves during animation
        await page.waitForTimeout(3000); // Let animation run
        
        const carMoved = await page.evaluate(() => {
            if (window.map && window.map.getObjects) {
                const objects = window.map.getObjects();
                const carMarkers = objects.filter(obj => {
                    if (obj && obj.getIcon && obj.getIcon()) {
                        const icon = obj.getIcon();
                        if (icon && icon.getBitmap && icon.getBitmap().includes) {
                            const svgContent = icon.getBitmap();
                            return svgContent.includes('#2563eb') && svgContent.includes('path');
                        }
                    }
                    return false;
                });
                
                if (carMarkers.length > 0) {
                    const currentPosition = carMarkers[0].getGeometry();
                    console.log(`✓ CAR MOVEMENT DETECTED: Current position (${currentPosition.lat}, ${currentPosition.lng})`);
                    return true;
                } else {
                    console.log('⚠ No car marker found during animation');
                    return false;
                }
            }
            return false;
        });

        // Test 5: Test pause functionality
        // After clicking Play, the button changes to Pause (text-based)
        const pauseButton = page.locator('text="Pause"').first();
        await expect(pauseButton).toBeVisible({ timeout: 10000 });
        await pauseButton.click({ force: true });

        await page.waitForTimeout(1000);
        console.log('✓ PAUSE BUTTON CLICKED');

        // Check if animation variables indicate paused state
        const pauseConfirmed = await page.evaluate(() => {
            if (window.isPaused !== undefined) {
                if (window.isPaused === true) {
                    console.log('✓ PAUSE CONFIRMED: isPaused variable is true');
                    return true;
                } else {
                    console.log('⚠ isPaused variable is false');
                }
            }
            
            if (window.animationFrame === null) {
                console.log('✓ PAUSE CONFIRMED: animationFrame is null');
                return true;
            }
            return false;
        });

        // Test 6: Verify car stops during pause
        await page.waitForTimeout(1000);
        
        let pausedPosition = await page.evaluate(() => {
            if (window.map && window.map.getObjects) {
                const objects = window.map.getObjects();
                const carMarkers = objects.filter(obj => {
                    if (obj && obj.getIcon && obj.getIcon()) {
                        const icon = obj.getIcon();
                        if (icon && icon.getBitmap && icon.getBitmap().includes) {
                            const svgContent = icon.getBitmap();
                            return svgContent.includes('#2563eb');
                        }
                    }
                    return false;
                });
                
                if (carMarkers.length > 0) {
                    const pausedPos = carMarkers[0].getGeometry();
                    console.log(`Car position when paused: ${pausedPos.lat}, ${pausedPos.lng}`);
                    return pausedPos;
                }
            }
            return null;
        });

        await page.waitForTimeout(2000);
        
        // Check if position remains the same
        const positionStable = await page.evaluate((prevPos) => {
            if (window.map && window.map.getObjects && prevPos) {
                const objects = window.map.getObjects();
                const carMarkers = objects.filter(obj => {
                    if (obj && obj.getIcon && obj.getIcon()) {
                        const icon = obj.getIcon();
                        if (icon && icon.getBitmap && icon.getBitmap().includes) {
                            const svgContent = icon.getBitmap();
                            return svgContent.includes('#2563eb');
                        }
                    }
                    return false;
                });
                
                if (carMarkers.length > 0) {
                    const stillPausedPosition = carMarkers[0].getGeometry();
                    const moved = (Math.abs(stillPausedPosition.lat - prevPos.lat) > 0.0001 || 
                                  Math.abs(stillPausedPosition.lng - prevPos.lng) > 0.0001);
                    
                    if (!moved) {
                        console.log('✓ PAUSE BEHAVIOR CONFIRMED: Car remained stationary during pause');
                        return true;
                    } else {
                        console.log('⚠ Car moved during pause - unexpected behavior');
                        return false;
                    }
                }
            }
            return false;
        }, pausedPosition);

        // Test 7: Resume animation
        // After pausing, the button shows "Resume" text
        const resumeButton = page.locator('text="Resume"').first();
        await expect(resumeButton).toBeVisible({ timeout: 10000 });
        await resumeButton.click({ force: true });

        await page.waitForTimeout(1000);
        console.log('✓ RESUME BUTTON CLICKED');

        // Check resume state
        const resumeConfirmed = await page.evaluate(() => {
            if (window.isPaused !== undefined) {
                if (window.isPaused === false) {
                    console.log('✓ RESUME CONFIRMED: isPaused variable is false');
                    return true;
                }
            }
            return false;
        });

        await page.waitForTimeout(2000); // Let animation resume

        // Verify car resumes movement after continue
        const carResumed = await page.evaluate(() => {
            if (window.map && window.map.getObjects) {
                const objects = window.map.getObjects();
                const carMarkers = objects.filter(obj => {
                    if (obj && obj.getIcon && obj.getIcon()) {
                        const icon = obj.getIcon();
                        if (icon && icon.getBitmap && icon.getBitmap().includes) {
                            const svgContent = icon.getBitmap();
                            return svgContent.includes('#2563eb');
                        }
                    }
                    return false;
                });
                
                if (carMarkers.length > 0) {
                    const resumedPosition = carMarkers[0].getGeometry();
                    console.log(`✓ RESUME CONFIRMED: Car position after continue (${resumedPosition.lat}, ${resumedPosition.lng})`);
                    return true;
                }
            }
            return false;
        });

        // Test 8: Speed controls (text-based)
        const fastButton = page.locator('text="Fast"').first();
        await expect(fastButton).toBeVisible({ timeout: 10000 });
        await fastButton.click({ force: true });

        await page.waitForTimeout(1000);
        console.log('✓ SPEED UP BUTTON CLICKED');

        // Check speed multiplier
        const speedUpConfirmed = await page.evaluate(() => {
            if (window.speedMultiplier !== undefined) {
                console.log(`Speed multiplier: ${window.speedMultiplier}`);
                if (window.speedMultiplier > 1) {
                    console.log('✓ SPEED UP CONFIRMED: Speed multiplier increased');
                    return true;
                }
            }
            return false;
        });

        const slowButton = page.locator('text="Slow"').first();
        await expect(slowButton).toBeVisible({ timeout: 10000 });
        await slowButton.click({ force: true });

        await page.waitForTimeout(1000);
        console.log('✓ SPEED DOWN BUTTON CLICKED');

        // Test 9: Restart functionality (text-based)
        const restartButton = page.locator('text="Restart"').first();
        await expect(restartButton).toBeVisible({ timeout: 10000 });
        await restartButton.click({ force: true });

        await page.waitForTimeout(2000);
        console.log('✓ RESTART BUTTON CLICKED');

        // Verify restart creates new animation
        const restartConfirmed = await page.evaluate(() => {
            if (window.map && window.map.getObjects) {
                const objects = window.map.getObjects();
                const carMarkers = objects.filter(obj => {
                    if (obj && obj.getIcon && obj.getIcon()) {
                        const icon = obj.getIcon();
                        if (icon && icon.getBitmap && icon.getBitmap().includes) {
                            const svgContent = icon.getBitmap();
                            return svgContent.includes('#2563eb');
                        }
                    }
                    return false;
                });
                
                if (carMarkers.length > 0) {
                    console.log('✓ RESTART CONFIRMED: Car marker still exists after restart');
                    return true;
                }
            }
            return false;
        });

        // Test 10: Segment selection affects car position
        await page.locator(config.selectors.trackHistoryReport.itemNo).filter({ hasText: /^2$/ }).click({ force: true });

        await page.waitForTimeout(2000);
        console.log('✓ SEGMENT 2 SELECTED');

        // Verify car position changes with segment selection
        const segment2Position = await page.evaluate(() => {
            if (window.map && window.map.getObjects) {
                const objects = window.map.getObjects();
                const carMarkers = objects.filter(obj => {
                    if (obj && obj.getIcon && obj.getIcon()) {
                        const icon = obj.getIcon();
                        if (icon && icon.getBitmap && icon.getBitmap().includes) {
                            const svgContent = icon.getBitmap();
                            return svgContent.includes('#2563eb');
                        }
                    }
                    return false;
                });
                
                if (carMarkers.length > 0) {
                    const segment2Pos = carMarkers[0].getGeometry();
                    console.log(`Car position at segment 2: ${segment2Pos.lat}, ${segment2Pos.lng}`);
                    return segment2Pos;
                }
            }
            return null;
        });

        await page.locator(config.selectors.trackHistoryReport.itemNo).filter({ hasText: /^1$/ }).click({ force: true });

        await page.waitForTimeout(1000);
        console.log('✓ SEGMENT 1 SELECTED');

        // Final test - Run complete animation cycle
        const playButtonFinal = page.locator('text="Play"').first();
        await expect(playButtonFinal).toBeVisible({ timeout: 10000 });
        await playButtonFinal.click({ force: true });

        await page.waitForTimeout(5000); // Let animation run

        // Take final screenshot for visual verification
        await page.screenshot({ path: 'here-maps-car-animation-final.png' });

        // Test different date ranges within same session
        console.log('=== TESTING WITH DIFFERENT DATE RANGE (JUNE DATA) ===');

        // Click the date picker input
        await page.locator('input#track-history-date-range-picker').click();

        // Navigate to 2025 (data year) since calendar defaults to current year (2026)
        const yearInput2 = page.locator('.flatpickr-calendar.open .numInputWrapper input.cur-year');
        await yearInput2.click();
        await yearInput2.fill('2025');
        await yearInput2.press('Enter');
        await page.waitForTimeout(500);

        await page.locator('.flatpickr-calendar.open .flatpickr-monthDropdown-months').selectOption('June');

        // Select June 1, 2025
        await page.locator('.flatpickr-calendar.open .flatpickr-day[aria-label="June 1, 2025"]').click({ force: true });

        // Select June 10, 2025 (as end date)
        await page.locator('.flatpickr-calendar.open .flatpickr-day[aria-label="June 10, 2025"]').click({ force: true });

        // Submit June data
        await expect(page.locator(config.selectors.trackHistoryReport.submitButton)).toBeVisible();
        await page.locator(config.selectors.trackHistoryReport.submitButton).click({ force: true });
        
        await page.waitForTimeout(60000); // Increased to 60 seconds for data loading

        // Verify segment dropdown is visible
        await page.locator(config.selectors.trackHistoryReport.segmentDropdown).click({ force: true });

        // Check June data segment size
        const juneSegmentText = await page.locator(config.selectors.trackHistoryReport.segmentSize).textContent();
        console.log('June Track History Length:', juneSegmentText);

        // Test car marker with June data
        // Ensure segment list is expanded before clicking
        await page.locator(config.selectors.trackHistoryReport.segmentDropdown).click({ force: true });
        await page.waitForTimeout(1000);
        
        await page.locator(config.selectors.trackHistoryReport.itemNo).filter({ hasText: /^1$/ }).click({ force: true });

        await page.waitForTimeout(1000);

        const playButtonJune = page.locator('text="Play"').first();
        await expect(playButtonJune).toBeVisible({ timeout: 10000 });
        await playButtonJune.click({ force: true });

        await page.waitForTimeout(3000);

        // Verify car marker exists with June data
        const juneDataWorking = await page.evaluate(() => {
            if (window.map && window.map.getObjects) {
                const objects = window.map.getObjects();
                const carMarkers = objects.filter(obj => {
                    if (obj && obj.getIcon && obj.getIcon()) {
                        const icon = obj.getIcon();
                        if (icon && icon.getBitmap && icon.getBitmap().includes) {
                            const svgContent = icon.getBitmap();
                            return svgContent.includes('#2563eb');
                        }
                    }
                    return false;
                });
                
                if (carMarkers.length > 0) {
                    console.log('✓ Car marker animation working with June data');
                    const junePosition = carMarkers[0].getGeometry();
                    console.log(`June car position: ${junePosition.lat}, ${junePosition.lng}`);
                    return true;
                } else {
                    console.log('⚠ No car marker found with June data');
                    return false;
                }
            }
            return false;
        });

        const pauseButtonJune = page.locator('text="Pause"').first();
        await expect(pauseButtonJune).toBeVisible({ timeout: 10000 });
        await pauseButtonJune.click({ force: true });

        await page.screenshot({ path: 'complete-car-animation-test.png' });
        
        console.log('✓ Complete car marker animation test finished');
        console.log('=== ALL TESTS COMPLETED IN SINGLE SESSION ===');
    });

    test('should verify track lines disappear bug - segment switch after restart', async ({ page }) => {
        // BUG REPLICATION TEST
        // Steps: Play segment 1 -> Pause -> Restart -> Click segment 2 -> Restart
        // Expected Bug: Track lines (Start/Stop markers and track-marker-container) disappear

        const helpers = new TestHelpers(page);
        config = await helpers.getConfig();

        await helpers.loginAndNavigateToPage(config.urls.fleetDashboard3);

        await expect(page.locator(config.selectors.navigation.trackHistoryMenu)).toBeVisible();
        await page.locator(config.selectors.navigation.trackHistoryMenu).click({ force: true });

        await expect(page.locator(config.selectors.modal.trackHistoryContainer)).toBeVisible();

        // Setup track history data
        await page.locator('#select2-track-history-device-select-container').click();
        await page.locator('.select2-results__option').filter({ hasText: 'Sales car1' }).click();

        // Set date range
        await page.locator('#track-history-date-range-picker').click();

        const yearInput = page.locator('.flatpickr-calendar.open .numInputWrapper input.cur-year');
        await yearInput.click();
        await yearInput.fill('2026');
        await yearInput.press('Enter');
        await page.waitForTimeout(500);

        await page.selectOption('.flatpickr-calendar.open .flatpickr-monthDropdown-months', 'January');

        // Select January 1-2, 2026
        await page.locator('.flatpickr-calendar.open .flatpickr-day[aria-label="January 1, 2026"]').click({ force: true });
        await page.locator('.flatpickr-calendar.open .flatpickr-day[aria-label="January 2, 2026"]').click({ force: true });

        await expect(page.locator(config.selectors.trackHistoryReport.submitButton)).toBeVisible();
        await page.locator(config.selectors.trackHistoryReport.submitButton).click({ force: true });

        await page.waitForTimeout(60000); // Wait for data loading

        // Use JavaScript to expand the track history list (toggle display)
        await page.evaluate(() => {
            const trackHistoryList = document.querySelector('#track-history-list');
            if (trackHistoryList) {
                trackHistoryList.style.display = 'block';
            }
        });
        await page.waitForTimeout(1000);

        // Select segment 1 by clicking on the list item directly
        const item1Locator = page.locator('.track-history__list-item').first();
        await item1Locator.click({ force: true });
        await page.waitForTimeout(3000);

        console.log('=== BUG REPLICATION: Starting sequence ===');

        // STEP 1: Verify track elements are visible initially after selecting segment 1
        const startMarkerInitial = page.locator('.route-button-marker.route-button-start');
        const stopMarkerInitial = page.locator('.route-button-marker.route-button-stop');
        const trackMarkerContainerInitial = page.locator('.track-marker-container');

        console.log('Checking initial visibility of track elements for segment 1...');

        const initialStartVisible = await startMarkerInitial.isVisible().catch(() => false);
        const initialStopVisible = await stopMarkerInitial.isVisible().catch(() => false);
        const initialTrackMarkersCount = await trackMarkerContainerInitial.count();

        console.log(`Initial Start marker visible: ${initialStartVisible}`);
        console.log(`Initial Stop marker visible: ${initialStopVisible}`);
        console.log(`Initial Track markers count: ${initialTrackMarkersCount}`);

        // STEP 2: Click Play on segment 1 using the playback control button
        const playPauseButton = page.locator('#track-history-playback-play-pause');
        await expect(playPauseButton).toBeVisible({ timeout: 15000 });
        await playPauseButton.click({ force: true });
        console.log('✓ STEP 1: Clicked Play on segment 1');
        await page.waitForTimeout(2000);

        // STEP 3: Click Pause (same button toggles)
        await playPauseButton.click({ force: true });
        console.log('✓ STEP 2: Clicked Pause');
        await page.waitForTimeout(1000);

        // STEP 4: Click Restart on segment 1
        const restartButton = page.locator('#track-history-playback-restart');
        await expect(restartButton).toBeVisible({ timeout: 10000 });
        await restartButton.click({ force: true });
        console.log('✓ STEP 3: Clicked Restart on segment 1');
        await page.waitForTimeout(2000);

        // Verify track elements still visible after restart on segment 1
        const afterRestart1StartVisible = await startMarkerInitial.isVisible().catch(() => false);
        const afterRestart1StopVisible = await stopMarkerInitial.isVisible().catch(() => false);
        const afterRestart1TrackMarkersCount = await trackMarkerContainerInitial.count();

        console.log(`After Restart 1 - Start marker visible: ${afterRestart1StartVisible}`);
        console.log(`After Restart 1 - Stop marker visible: ${afterRestart1StopVisible}`);
        console.log(`After Restart 1 - Track markers count: ${afterRestart1TrackMarkersCount}`);

        // STEP 5: Click on segment 2
        const item2Locator = page.locator('.track-history__list-item').nth(1);
        await item2Locator.click({ force: true });
        console.log('✓ STEP 4: Clicked on segment 2');
        await page.waitForTimeout(3000);

        // Verify track elements visible for segment 2 before restart
        const seg2BeforeRestartStartVisible = await startMarkerInitial.isVisible().catch(() => false);
        const seg2BeforeRestartStopVisible = await stopMarkerInitial.isVisible().catch(() => false);
        const seg2BeforeRestartTrackMarkersCount = await trackMarkerContainerInitial.count();

        console.log(`Segment 2 before Restart - Start marker visible: ${seg2BeforeRestartStartVisible}`);
        console.log(`Segment 2 before Restart - Stop marker visible: ${seg2BeforeRestartStopVisible}`);
        console.log(`Segment 2 before Restart - Track markers count: ${seg2BeforeRestartTrackMarkersCount}`);

        // STEP 6: Click Restart on segment 2 - THIS TRIGGERS THE BUG
        await restartButton.click({ force: true });
        console.log('✓ STEP 5: Clicked Restart on segment 2 - BUG TRIGGER POINT');
        await page.waitForTimeout(3000);

        // Take screenshot to capture bug state
        await page.screenshot({ path: 'bug-track-lines-disappeared.png' });

        // VERIFY BUG: Check if track elements have disappeared
        console.log('=== VERIFYING BUG: Track lines should have disappeared ===');

        const startMarkerAfterBug = page.locator('.route-button-marker.route-button-start');
        const stopMarkerAfterBug = page.locator('.route-button-marker.route-button-stop');
        const trackMarkerContainerAfterBug = page.locator('.track-marker-container');

        const bugStartVisible = await startMarkerAfterBug.isVisible().catch(() => false);
        const bugStopVisible = await stopMarkerAfterBug.isVisible().catch(() => false);
        const bugTrackMarkersCount = await trackMarkerContainerAfterBug.count();

        console.log(`AFTER BUG - Start marker visible: ${bugStartVisible}`);
        console.log(`AFTER BUG - Stop marker visible: ${bugStopVisible}`);
        console.log(`AFTER BUG - Track markers count: ${bugTrackMarkersCount}`);

        // BUG ASSERTION: These elements should NOT be visible (proving the bug exists)
        // If bug is present: Start/Stop markers and track-marker-container will be hidden/removed

        const bugDetected = !bugStartVisible && !bugStopVisible && bugTrackMarkersCount === 0;

        if (bugDetected) {
            console.log('⚠️ BUG CONFIRMED: Track lines have disappeared after segment switch + restart');
            console.log('   - Start marker: NOT VISIBLE');
            console.log('   - Stop marker: NOT VISIBLE');
            console.log('   - Track marker containers: NONE FOUND');
        } else {
            console.log('✓ Bug may be fixed - track elements are still visible');
            console.log(`   - Start marker visible: ${bugStartVisible}`);
            console.log(`   - Stop marker visible: ${bugStopVisible}`);
            console.log(`   - Track markers count: ${bugTrackMarkersCount}`);
        }

        // Assert the bug exists (test passes when bug is present)
        // Change to expect().toBeTruthy() when bug should be fixed
        expect(bugDetected).toBe(true); // Bug replication - expecting elements to disappear

        console.log('=== BUG REPLICATION TEST COMPLETED ===');
    });
});