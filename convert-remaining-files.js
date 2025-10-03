// Batch conversion script for remaining Cypress files
const fs = require('fs');
const path = require('path');

// File paths
const CYPRESS_E2E_DIR = 'D:\\claude\\cypress\\e2e';
const PLAYWRIGHT_TESTS_DIR = 'D:\\cypress-to-playwright-converted\\tests';

// Files already converted
const CONVERTED_FILES = [
  'TS001_listOfDevice.cy.js',
  'TS002_addEditDevices.cy.js', 
  'TS003_ChangeTimezone.cy.js',
  'TS004_viewEditUser.cy.js',
  'TS005_subgroup.cy.js',
  'TS006_trackInfoDisplayOptions.cy.js',
  'TS007_pulsingIcon.cy.js'
];

// Basic conversion patterns
const CONVERSION_PATTERNS = [
  { from: /describe\(/g, to: 'test.describe(' },
  { from: /it\(/g, to: 'test(' },
  { from: /\(\) => \{/g, to: 'async ({ page }) => {' },
  { from: /cy\.visit\(/g, to: 'await page.goto(' },
  { from: /cy\.get\('([^']+)'\)\.click\(\)/g, to: 'await page.click(\'$1\')' },
  { from: /cy\.get\('([^']+)'\)\.type\('([^']+)'\)/g, to: 'await page.fill(\'$1\', \'$2\')' },
  { from: /cy\.get\('([^']+)'\)\.clear\(\)\.type\('([^']+)'\)/g, to: 'await page.fill(\'$1\', \'$2\')' },
  { from: /cy\.get\('([^']+)'\)\.should\('be\.visible'\)/g, to: 'await expect(page.locator(\'$1\')).toBeVisible()' },
  { from: /cy\.get\('([^']+)'\)\.should\('contain', '([^']+)'\)/g, to: 'await expect(page.locator(\'$1\')).toContainText(\'$2\')' },
  { from: /cy\.wait\((\d+)\)/g, to: 'await page.waitForTimeout($1)' },
  { from: /cy\.contains\('([^']+)'\)/g, to: 'page.locator(\'text=$1\')' }
];

// Template for converted files
const FILE_TEMPLATE = `const { test, expect } = require('@playwright/test');
const TestHelpers = require('../utils/test-helpers');

{{CONVERTED_CONTENT}}
`;

function convertFile(inputPath, outputPath) {
  try {
    let content = fs.readFileSync(inputPath, 'utf-8');
    
    // Apply basic conversion patterns
    CONVERSION_PATTERNS.forEach(pattern => {
      content = content.replace(pattern.from, pattern.to);
    });
    
    // Add helper initialization at the start of each test
    content = content.replace(
      /test\('([^']+)', async \(\{ page \}\) => \{/g,
      `test('$1', async ({ page }) => {
    const helpers = new TestHelpers(page);
    const config = await helpers.loadConfig();`
    );
    
    // Replace template content
    const finalContent = FILE_TEMPLATE.replace('{{CONVERTED_CONTENT}}', content);
    
    // Write to output
    fs.writeFileSync(outputPath, finalContent);
    console.log(`✅ Converted: ${path.basename(inputPath)} -> ${path.basename(outputPath)}`);
    
  } catch (error) {
    console.error(`❌ Error converting ${inputPath}:`, error.message);
  }
}

function convertRemainingFiles() {
  console.log('🔄 Starting batch conversion of remaining Cypress files...\n');
  
  // Read all files from Cypress e2e directory
  const allFiles = fs.readdirSync(CYPRESS_E2E_DIR).filter(file => file.endsWith('.cy.js'));
  
  // Filter out already converted files
  const remainingFiles = allFiles.filter(file => !CONVERTED_FILES.includes(file));
  
  console.log(`📂 Found ${remainingFiles.length} files to convert:\n`);
  remainingFiles.forEach((file, index) => {
    console.log(`   ${index + 1}. ${file}`);
  });
  console.log('');
  
  // Convert each remaining file
  let converted = 0;
  let failed = 0;
  
  remainingFiles.forEach(file => {
    const inputPath = path.join(CYPRESS_E2E_DIR, file);
    const outputPath = path.join(PLAYWRIGHT_TESTS_DIR, file.replace('.cy.js', '.spec.js'));
    
    try {
      convertFile(inputPath, outputPath);
      converted++;
    } catch (error) {
      console.error(`❌ Failed to convert ${file}:`, error.message);
      failed++;
    }
  });
  
  console.log(`\n🎉 Conversion complete!`);
  console.log(`   ✅ Successfully converted: ${converted} files`);
  console.log(`   ❌ Failed conversions: ${failed} files`);
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Review converted files in: ${PLAYWRIGHT_TESTS_DIR}`);
  console.log(`   2. Run tests: npm test`);
  console.log(`   3. Fix any conversion issues manually`);
  console.log(`   4. Use CONVERSION_TEMPLATE.md for complex conversions`);
}

// Check if this script is run directly
if (require.main === module) {
  // Create tests directory if it doesn't exist
  if (!fs.existsSync(PLAYWRIGHT_TESTS_DIR)) {
    fs.mkdirSync(PLAYWRIGHT_TESTS_DIR, { recursive: true });
  }
  
  convertRemainingFiles();
}

module.exports = { convertFile, convertRemainingFiles };