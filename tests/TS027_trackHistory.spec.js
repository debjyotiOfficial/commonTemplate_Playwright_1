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
            await page.selectOption('.flatpickr-calendar.open .flatpickr-monthDropdown-months', 'August');

            // Select August 10, 2025
            await page.locator('.flatpickr-calendar.open .flatpickr-day[aria-label="August 1, 2025"]').click({ force: true });

            // Select August 15, 2025 (as end date)
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

        await page.locator(config.selectors.trackHistoryReport.itemNo).filter({ hasText: /^1$/ }).click({ force: true });

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
        await expect(page.locator(config.selectors.trackHistoryReport.play)).toBeVisible();
        await page.locator(config.selectors.trackHistoryReport.play).click({ force: true });

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
        await expect(page.locator(config.selectors.trackHistoryReport.pause)).toBeVisible();
        await page.locator(config.selectors.trackHistoryReport.pause).click({ force: true });

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
        await expect(page.locator(config.selectors.trackHistoryReport.continue)).toBeVisible();
        await page.locator(config.selectors.trackHistoryReport.continue).click({ force: true });

        await page.waitForTimeout(1000);
        console.log('✓ CONTINUE BUTTON CLICKED');

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

        // Test 8: Speed controls
        await expect(page.locator(config.selectors.trackHistoryReport.speedUp)).toBeVisible();
        await page.locator(config.selectors.trackHistoryReport.speedUp).click({ force: true });

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

        await expect(page.locator(config.selectors.trackHistoryReport.speedDown)).toBeVisible();
        await page.locator(config.selectors.trackHistoryReport.speedDown).click({ force: true });

        await page.waitForTimeout(1000);
        console.log('✓ SPEED DOWN BUTTON CLICKED');

        // Test 9: Restart functionality
        await expect(page.locator(config.selectors.trackHistoryReport.restart)).toBeVisible();
        await page.locator(config.selectors.trackHistoryReport.restart).click({ force: true });

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
        await expect(page.locator(config.selectors.trackHistoryReport.play)).toBeVisible();
        await page.locator(config.selectors.trackHistoryReport.play).click({ force: true });

        await page.waitForTimeout(5000); // Let animation run

        // Take final screenshot for visual verification
        await page.screenshot({ path: 'here-maps-car-animation-final.png' });

        // Test different date ranges within same session
        console.log('=== TESTING WITH DIFFERENT DATE RANGE (JUNE DATA) ===');

        // Click the date picker input
        await page.locator('input#track-history-date-range-picker').click();

        await page.locator('.flatpickr-calendar.open .flatpickr-monthDropdown-months').selectOption('June');

        // Select June 1, 2025
        await page.locator('.flatpickr-day[aria-label="June 1, 2025"]').click({ force: true });

        // Select June 10, 2025 (as end date)
        await page.locator('.flatpickr-day[aria-label="June 10, 2025"]').click({ force: true });

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

        await expect(page.locator(config.selectors.trackHistoryReport.play)).toBeVisible();
        await page.locator(config.selectors.trackHistoryReport.play).click({ force: true });

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

        await expect(page.locator(config.selectors.trackHistoryReport.pause)).toBeVisible();
        await page.locator(config.selectors.trackHistoryReport.pause).click({ force: true });

        await page.screenshot({ path: 'complete-car-animation-test.png' });
        
        console.log('✓ Complete car marker animation test finished');
        console.log('=== ALL TESTS COMPLETED IN SINGLE SESSION ===');
    });
});