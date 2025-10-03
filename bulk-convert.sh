#!/bin/bash

# Bulk convert remaining Cypress files to Playwright

SOURCE_DIR="/d/claude/cypress/e2e"
TARGET_DIR="/d/cypress-to-playwright-converted/tests"

# Already converted files
CONVERTED=(
    "TS001_listOfDevice.cy.js"
    "TS002_addEditDevices.cy.js"
    "TS003_ChangeTimezone.cy.js"
    "TS004_viewEditUser.cy.js"
    "TS005_subgroup.cy.js"
    "TS006_trackInfoDisplayOptions.cy.js"
    "TS007_pulsingIcon.cy.js"
)

# Convert each remaining file
for file in "$SOURCE_DIR"/TS*.cy.js; do
    if [[ -f "$file" ]]; then
        filename=$(basename "$file")
        target_file="${filename%.cy.js}.spec.js"
        target_path="$TARGET_DIR/$target_file"
        
        # Skip if already converted
        skip=false
        for converted in "${CONVERTED[@]}"; do
            if [[ "$converted" == "$filename" ]]; then
                skip=true
                break
            fi
        done
        
        if [[ "$skip" == true ]]; then
            echo "Skipping already converted: $filename"
            continue
        fi
        
        echo "Converting: $filename -> $target_file"
        
        # Create Playwright version
        cat > "$target_path" << 'EOF'
const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

EOF
        
        # Process the file content
        sed -e "s/describe(/test.describe(/g" \
            -e "s/\bit(/test(/g" \
            -e "s/test('\([^']*\)', () => {/test('\1', async ({ page }) => {/g" \
            -e "s/cy\.visit(/await page.goto(/g" \
            -e "s/cy\.get(/await page.locator(/g" \
            -e "s/cy\.wait(/await page.waitForTimeout(/g" \
            -e "s/cy\.contains(/await page.locator('text=/g" \
            -e "s/\.should('be\.visible')/; await expect(element).toBeVisible()/g" \
            -e "s/\.should('contain', \([^)]*\))/; await expect(element).toContainText(\1)/g" \
            -e "s/\.click()/; await element.click()/g" \
            -e "s/\.clear()/; await element.clear()/g" \
            -e "s/\.type(/; await element.fill(/g" \
            -e "s/\.check()/; await element.check()/g" \
            -e "s/\.select(/; await element.selectOption(/g" \
            -e "s/Cypress\.config.*;//g" \
            -e "s/Cypress\.on.*;//g" \
            "$file" | \
        awk '
        BEGIN { 
            print "let config;"
            print "let helpers;"
            print ""
            print "test.beforeAll(async ({ browser }) => {"
            print "    const page = await browser.newPage();"
            print "    helpers = new TestHelpers(page);"
            print "    config = await helpers.getConfig();"
            print "    await page.close();"
            print "});"
            print ""
            print "test.beforeEach(async ({ page }) => {"
            print "    helpers = new TestHelpers(page);"
            print "    await helpers.clearStorageAndSetTimeouts();"
            print "    test.setTimeout(200000);"
            print "});"
            print ""
            in_test = 0
        }
        /^[[:space:]]*test\.describe/ { in_describe = 1 }
        /^[[:space:]]*test\(/ { 
            in_test = 1 
            print "    " $0
            print "        const helpers = new TestHelpers(page);"
            print "        config = await helpers.getConfig();"
            next
        }
        /^[[:space:]]*before\(/ { next }
        /^[[:space:]]*beforeEach\(/ { next }
        /^[[:space:]]*\}\);[[:space:]]*$/ && in_test { 
            print "    " $0
            in_test = 0
            next
        }
        in_describe { print "    " $0 }
        !in_describe { print $0 }
        ' >> "$target_path"
        
        echo "Converted: $filename"
    fi
done

echo "Bulk conversion complete!"