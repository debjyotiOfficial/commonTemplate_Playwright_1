const fs = require('fs');
const path = require('path');

/**
 * Custom Playwright Reporter for Fleet GPS Tracking Platform
 * Generates HTML and Excel-compatible CSV reports with:
 * - Test Case No (auto-generated based on test index)
 * - Module
 * - Test Case Description
 * - Status (PASSED/FAILED/SKIPPED)
 * - Failure Reason with detailed error analysis
 * - Video Identifier
 * - Test Steps (improved visibility)
 *
 * Reports are saved in separate folders per test file
 * AND a combined master report accumulates all test runs
 */
class CustomReporter {
    constructor(options = {}) {
        this.options = options;
        this.results = [];
        this.testFiles = new Map(); // Track tests by file
        this.startTime = null;
        this.endTime = null;
        this.baseOutputDir = options.outputDir || 'test-reports/custom';
        this.currentTestFile = null;
        this.masterDataFile = path.join(this.baseOutputDir, 'master-data.json');
    }

    onBegin(config, suite) {
        this.startTime = new Date();
        this.config = config;
        console.log(`\n========================================================`);
        console.log(`   Custom Reporter: Starting test run`);
        console.log(`   Time: ${this.startTime.toLocaleString()}`);
        console.log(`   Total tests: ${suite.allTests().length}`);
        console.log(`========================================================\n`);

        // Ensure base output directory exists
        if (!fs.existsSync(this.baseOutputDir)) {
            fs.mkdirSync(this.baseOutputDir, { recursive: true });
        }
    }

    /**
     * Load existing master data from previous test runs
     */
    loadMasterData() {
        try {
            if (fs.existsSync(this.masterDataFile)) {
                const data = JSON.parse(fs.readFileSync(this.masterDataFile, 'utf-8'));
                return data.tests || [];
            }
        } catch (error) {
            console.log('No existing master data found, starting fresh');
        }
        return [];
    }

    /**
     * Save master data with accumulated results
     */
    saveMasterData(allResults) {
        const masterData = {
            lastUpdated: new Date().toISOString(),
            tests: allResults
        };
        fs.writeFileSync(this.masterDataFile, JSON.stringify(masterData, null, 2));
    }

    onTestBegin(test) {
        console.log(`>> Starting: ${test.title}`);
    }

    onTestEnd(test, result) {
        const status = result.status === 'passed' ? 'PASSED' :
                       result.status === 'failed' ? 'FAILED' :
                       result.status === 'skipped' ? 'SKIPPED' : result.status.toUpperCase();

        const statusIcon = result.status === 'passed' ? '[PASS]' :
                          result.status === 'failed' ? '[FAIL]' :
                          result.status === 'skipped' ? '[SKIP]' : '[????]';

        console.log(`${statusIcon} ${test.title} (${(result.duration / 1000).toFixed(2)}s)`);

        // Get the test file name for folder organization
        const testFileName = this.getTestFileName(test.location.file);

        // Extract module name from test file or parent suite
        const moduleName = this.extractModuleName(test);

        // Generate test case number based on module and index
        const testCaseNo = this.generateTestCaseNo(test, testFileName);

        // Get video attachment - check multiple possible names
        let videoPath = null;
        let videoIdentifier = 'N/A';
        let copiedVideoPath = null;

        if (result.attachments && result.attachments.length > 0) {
            const videoAttachment = result.attachments.find(a =>
                a.name === 'video' ||
                a.contentType === 'video/webm' ||
                (a.path && a.path.endsWith('.webm'))
            );
            if (videoAttachment && videoAttachment.path) {
                const originalVideoPath = videoAttachment.path;

                // Create a unique video filename based on test case
                const safeTestName = test.title.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50);
                const videoFileName = `${testFileName}-${safeTestName}.webm`;

                // Copy video to videos folder in report directory
                const videosDir = path.join(this.baseOutputDir, 'videos');
                if (!fs.existsSync(videosDir)) {
                    fs.mkdirSync(videosDir, { recursive: true });
                }

                copiedVideoPath = path.join(videosDir, videoFileName);

                // Copy the video file
                try {
                    if (fs.existsSync(originalVideoPath)) {
                        fs.copyFileSync(originalVideoPath, copiedVideoPath);
                        // Use relative path for video so it works when folder is shared
                        videoPath = `videos/${videoFileName}`;
                        videoIdentifier = videoFileName;
                        console.log(`   Video copied: ${videoFileName}`);
                    } else {
                        videoPath = null;
                        videoIdentifier = path.basename(originalVideoPath);
                    }
                } catch (err) {
                    console.log(`   Warning: Could not copy video: ${err.message}`);
                    videoPath = null;
                    videoIdentifier = path.basename(originalVideoPath);
                }
            }
        }

        // Get failure reason and parse error details
        let failureReason = '';
        let parsedError = null;
        if (result.status === 'failed' && result.error) {
            // Parse the error for clean, developer-friendly display
            parsedError = this.parseError(result.error, test);

            // Use the clean message as the failure reason
            failureReason = parsedError ? parsedError.cleanMessage : (result.error.message || 'Unknown error');
            // Clean up the error message - remove ANSI codes and get first meaningful line
            failureReason = failureReason.replace(/\x1b\[[0-9;]*m/g, '').replace(/\[2m|\[22m|\[31m|\[39m|\[1m|\[0m/g, '');
            failureReason = failureReason.split('\n')[0].substring(0, 500);
        }

        // Extract test steps from stdout (console.log statements)
        const steps = this.extractSteps(result);

        const testResult = {
            testCaseNo: testCaseNo,
            module: moduleName,
            title: test.title,
            description: this.extractDescription(test.title),
            status: result.status,
            statusDisplay: status,
            duration: result.duration,
            failureReason: failureReason,
            parsedError: parsedError,
            videoPath: videoPath,
            videoIdentifier: videoIdentifier,
            steps: steps,
            startTime: new Date(Date.now() - result.duration).toISOString(),
            endTime: new Date().toISOString(),
            retries: result.retry,
            file: test.location.file,
            fileName: testFileName,
            line: test.location.line
        };

        this.results.push(testResult);

        // Track by file for separate folder generation
        if (!this.testFiles.has(testFileName)) {
            this.testFiles.set(testFileName, []);
        }
        this.testFiles.get(testFileName).push(testResult);
    }

    onEnd(result) {
        this.endTime = new Date();
        const duration = (this.endTime - this.startTime) / 1000;

        console.log(`\n========================================================`);
        console.log(`   Custom Reporter: Test run completed`);
        console.log(`   Duration: ${duration.toFixed(2)}s`);
        console.log(`   Status: ${result.status}`);
        console.log(`========================================================`);

        // Generate reports for each test file in separate folders
        this.testFiles.forEach((results, fileName) => {
            const folderName = this.getFolderName(fileName);
            const outputDir = path.join(this.baseOutputDir, folderName);

            // Create/clear the folder
            if (fs.existsSync(outputDir)) {
                // Remove old reports
                const files = fs.readdirSync(outputDir);
                files.forEach(file => {
                    if (file.startsWith('test-report')) {
                        fs.unlinkSync(path.join(outputDir, file));
                    }
                });
            } else {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            this.generateHTMLReport(results, outputDir, folderName);
            this.generateCSVReport(results, outputDir);
            this.generateJSONReport(results, outputDir);
        });

        // Load existing master data and merge with current results
        const existingResults = this.loadMasterData();

        // Get file names from current run to know which to update
        const currentFileNames = new Set(this.results.map(r => r.fileName));

        // Keep results from files NOT in current run, update results from files IN current run
        const mergedResults = existingResults.filter(r => !currentFileNames.has(r.fileName));

        // Add current results (this replaces old results for the same files)
        mergedResults.push(...this.results);

        // Sort by module/test case number for consistent ordering
        mergedResults.sort((a, b) => {
            if (a.fileName !== b.fileName) return a.fileName.localeCompare(b.fileName);
            return a.testCaseNo.localeCompare(b.testCaseNo);
        });

        // Save merged master data
        this.saveMasterData(mergedResults);

        // Generate combined master report with ALL accumulated results
        this.generateMasterReport(mergedResults);

        // Print summary
        this.printSummary(mergedResults);
    }

    getTestFileName(filePath) {
        return path.basename(filePath, '.spec.js');
    }

    getFolderName(fileName) {
        // Convert TS020_AfterHours to afterHours (for naming convention)
        const match = fileName.match(/TS\d+_(.+)/);
        if (match) {
            // Convert PascalCase to camelCase
            const name = match[1];
            return name.charAt(0).toLowerCase() + name.slice(1);
        }
        // Handle auth.setup or other dot-separated names
        if (fileName.includes('.')) {
            return fileName.split('.')[0]; // auth.setup -> auth
        }
        // Default: just lowercase and clean
        return fileName.toLowerCase().replace(/[^a-z0-9]/gi, '');
    }

    generateTestCaseNo(test, testFileName) {
        // Extract module number from file name (e.g., TS020 from TS020_AfterHours)
        const moduleMatch = testFileName.match(/^(TS\d+)/);
        const moduleNo = moduleMatch ? moduleMatch[1] : 'TC';

        // Try to extract test case letter from title first (e.g., "TS020-A - ...")
        const titleMatch = test.title.match(/^TS\d+-([A-Z])/);
        if (titleMatch) {
            return `${moduleNo}-${titleMatch[1]}`;
        }

        // Generate sequential number based on test index within this file
        const testsInFile = this.testFiles.get(testFileName) || [];
        const index = testsInFile.length + 1;

        // Convert index to letter (1=A, 2=B, etc.) or use number if > 26
        if (index <= 26) {
            return `${moduleNo}-${String.fromCharCode(64 + index)}`;
        }
        return `${moduleNo}-${index}`;
    }

    extractModuleName(test) {
        // Try to get module from parent suite title first
        if (test.parent && test.parent.title && test.parent.title.trim()) {
            return test.parent.title;
        }

        // Try to get module from file name (e.g., TS020_AfterHours.spec.js -> After Hours)
        const fileName = path.basename(test.location.file, '.spec.js');
        const match = fileName.match(/TS\d+_(.+)/);
        if (match) {
            // Convert camelCase/PascalCase to readable format with spaces
            return match[1].replace(/([A-Z])/g, ' $1').trim();
        }

        return fileName;
    }

    extractDescription(title) {
        // Remove the test case number prefix to get description
        let desc = title.replace(/^TS\d+-[A-Z]\s*-?\s*/, '').trim();
        // If no change, return original title
        return desc || title;
    }

    /**
     * Parse Playwright error and extract clean, developer-friendly details
     * @param {Object} error - The error object from Playwright
     * @param {Object} test - The test object with location info
     * @returns {Object} Parsed error details
     */
    parseError(error, test) {
        if (!error) return null;

        const errorMessage = error.message || '';
        const errorStack = error.stack || '';

        // Remove ANSI color codes
        const cleanMessage = errorMessage.replace(/\x1b\[[0-9;]*m/g, '').replace(/\[2m|\[22m|\[31m|\[39m|\[1m|\[0m/g, '');
        const cleanStack = errorStack.replace(/\x1b\[[0-9;]*m/g, '').replace(/\[2m|\[22m|\[31m|\[39m|\[1m|\[0m/g, '');

        const parsed = {
            type: 'Unknown Error',
            element: null,
            expected: null,
            actual: null,
            timeout: null,
            file: test?.location?.file ? require('path').basename(test.location.file) : 'Unknown',
            line: test?.location?.line || 'Unknown',
            suggestion: null,
            cleanMessage: cleanMessage.split('\n')[0], // First line only
            fullMessage: cleanMessage,
            stackTrace: cleanStack
        };

        // Detect error type and extract details
        if (cleanMessage.includes('toBeVisible')) {
            parsed.type = 'Element Not Visible';
            parsed.expected = 'Element should be visible on page';
            parsed.actual = 'Element was not found or not visible';
            parsed.suggestion = 'Check if the page loaded correctly, or if the selector has changed';
        } else if (cleanMessage.includes('toBeHidden')) {
            parsed.type = 'Element Not Hidden';
            parsed.expected = 'Element should be hidden';
            parsed.actual = 'Element is still visible';
            parsed.suggestion = 'Check if a modal/overlay was supposed to close';
        } else if (cleanMessage.includes('toHaveText')) {
            parsed.type = 'Text Mismatch';
            parsed.expected = 'Element should contain specific text';
            parsed.actual = 'Text content did not match';
            parsed.suggestion = 'Verify the expected text value or check for dynamic content';
        } else if (cleanMessage.includes('toBeEnabled')) {
            parsed.type = 'Element Not Enabled';
            parsed.expected = 'Element should be enabled/clickable';
            parsed.actual = 'Element is disabled';
            parsed.suggestion = 'Check if form validation is blocking the element';
        } else if (cleanMessage.includes('toBeDisabled')) {
            parsed.type = 'Element Not Disabled';
            parsed.expected = 'Element should be disabled';
            parsed.actual = 'Element is enabled';
            parsed.suggestion = 'Check the application logic for disable conditions';
        } else if (cleanMessage.includes('toHaveValue')) {
            parsed.type = 'Value Mismatch';
            parsed.expected = 'Input should have specific value';
            parsed.actual = 'Value did not match';
            parsed.suggestion = 'Check if the input was properly filled';
        } else if (cleanMessage.includes('toHaveCount')) {
            parsed.type = 'Count Mismatch';
            parsed.expected = 'Expected specific number of elements';
            parsed.actual = 'Found different number of elements';
            parsed.suggestion = 'Check if data loaded correctly or filter conditions';
        } else if (cleanMessage.includes('toEqual') || cleanMessage.includes('toBe')) {
            parsed.type = 'Assertion Failed';
            parsed.expected = 'Values should be equal';
            parsed.actual = 'Values did not match';
            parsed.suggestion = 'Check the expected vs actual values in the assertion';
        } else if (cleanMessage.includes('toBeGreaterThan') || cleanMessage.includes('toBeLessThan')) {
            parsed.type = 'Comparison Failed';
            parsed.expected = 'Value comparison should pass';
            parsed.actual = 'Comparison condition not met';
            parsed.suggestion = 'Check the numeric values being compared';
        } else if (cleanMessage.includes('Timeout') || cleanMessage.includes('timeout')) {
            parsed.type = 'Timeout Error';
            parsed.expected = 'Operation should complete within time limit';
            parsed.actual = 'Operation took too long';
            parsed.suggestion = 'Page may be slow to load, or element never appeared. Check network/server status';
        } else if (cleanMessage.includes('click') && cleanMessage.includes('intercept')) {
            parsed.type = 'Click Intercepted';
            parsed.expected = 'Element should be clickable';
            parsed.actual = 'Another element is covering the target';
            parsed.suggestion = 'Close any popups/modals, or scroll element into view';
        } else if (cleanMessage.includes('navigation')) {
            parsed.type = 'Navigation Error';
            parsed.expected = 'Page should navigate successfully';
            parsed.actual = 'Navigation failed or timed out';
            parsed.suggestion = 'Check URL, network connectivity, or server availability';
        } else if (cleanMessage.includes('strict mode violation')) {
            parsed.type = 'Multiple Elements Found';
            parsed.expected = 'Selector should match exactly one element';
            parsed.actual = 'Selector matched multiple elements';
            parsed.suggestion = 'Make selector more specific (add :first, :nth-child, or more specific attributes)';
        } else if (cleanMessage.includes('Cannot read') || cleanMessage.includes('undefined')) {
            parsed.type = 'Reference Error';
            parsed.expected = 'Variable/property should be defined';
            parsed.actual = 'Variable/property is undefined or null';
            parsed.suggestion = 'Check if the element or data exists before accessing its properties';
        } else if (cleanMessage.includes('Network') || cleanMessage.includes('fetch')) {
            parsed.type = 'Network Error';
            parsed.expected = 'Network request should succeed';
            parsed.actual = 'Network request failed';
            parsed.suggestion = 'Check network connectivity and API availability';
        }

        // Extract locator/selector from error message
        const locatorMatch = cleanMessage.match(/locator\(['"]([^'"]+)['"]\)|locator\(([^)]+)\)|Locator:\s*([^\n]+)/i);
        if (locatorMatch) {
            parsed.element = locatorMatch[1] || locatorMatch[2] || locatorMatch[3];
            parsed.element = parsed.element?.trim().replace(/^locator\(/, '').replace(/\)$/, '');
        }

        // Extract timeout value
        const timeoutMatch = cleanMessage.match(/timeout[:\s]*(\d+)ms/i);
        if (timeoutMatch) {
            parsed.timeout = `${parseInt(timeoutMatch[1]) / 1000}s`;
        }

        // Extract expected/actual if present in message
        const expectedMatch = cleanMessage.match(/Expected:\s*([^\n]+)/i);
        if (expectedMatch && !parsed.expected) {
            parsed.expected = expectedMatch[1].trim();
        }

        const actualMatch = cleanMessage.match(/Received:\s*([^\n]+)|Actual:\s*([^\n]+)/i);
        if (actualMatch) {
            parsed.actual = (actualMatch[1] || actualMatch[2]).trim();
        }

        return parsed;
    }

    /**
     * Generate HTML for formatted error details
     * @param {Object} parsedError - Parsed error object
     * @returns {string} HTML string
     */
    generateErrorDetailsHtml(parsedError) {
        if (!parsedError) return '';

        return `
            <div class="error-details">
                <div class="error-details-header">
                    <span class="error-type-badge">${this.escapeHtml(parsedError.type)}</span>
                </div>
                <div class="error-details-body">
                    <div class="error-row">
                        <span class="error-label">File:</span>
                        <span class="error-value">${this.escapeHtml(parsedError.file)}</span>
                    </div>
                    <div class="error-row">
                        <span class="error-label">Line:</span>
                        <span class="error-value">${parsedError.line}</span>
                    </div>
                    ${parsedError.element ? `
                    <div class="error-row">
                        <span class="error-label">Element:</span>
                        <span class="error-value element-selector">${this.escapeHtml(parsedError.element)}</span>
                    </div>
                    ` : ''}
                    ${parsedError.timeout ? `
                    <div class="error-row">
                        <span class="error-label">Timeout:</span>
                        <span class="error-value">${parsedError.timeout}</span>
                    </div>
                    ` : ''}
                    <div class="error-row">
                        <span class="error-label">Expected:</span>
                        <span class="error-value">${this.escapeHtml(parsedError.expected || 'N/A')}</span>
                    </div>
                    <div class="error-row">
                        <span class="error-label">Actual:</span>
                        <span class="error-value error-actual">${this.escapeHtml(parsedError.actual || 'N/A')}</span>
                    </div>
                    ${parsedError.suggestion ? `
                    <div class="error-row suggestion">
                        <span class="error-label">Suggestion:</span>
                        <span class="error-value">${this.escapeHtml(parsedError.suggestion)}</span>
                    </div>
                    ` : ''}
                    <div class="error-row full-error">
                        <span class="error-label">Full Error:</span>
                        <span class="error-value"><pre>${this.escapeHtml(parsedError.fullMessage || 'N/A')}</pre></span>
                    </div>
                </div>
            </div>
        `;
    }

    extractSteps(result) {
        const steps = [];
        let stepCounter = 1;

        // Extract steps from stdout (console.log output)
        if (result.stdout && result.stdout.length > 0) {
            result.stdout.forEach(output => {
                const text = typeof output === 'string' ? output : output.toString();
                const lines = text.split('\n').filter(line => line.trim());

                lines.forEach(line => {
                    const trimmedLine = line.trim();

                    // Categorize different types of output
                    if (trimmedLine.includes('========== SECTION') || trimmedLine.includes('==========')) {
                        steps.push({
                            number: '',
                            text: trimmedLine.replace(/=/g, '').trim(),
                            status: 'section',
                            type: 'section'
                        });
                    } else if (trimmedLine.startsWith('[PASS]') || trimmedLine.includes('[PASS]') || trimmedLine.includes('PASSED')) {
                        steps.push({
                            number: stepCounter++,
                            text: trimmedLine.replace('[PASS]', '').replace('PASSED', '').trim(),
                            status: 'passed',
                            type: 'step'
                        });
                    } else if (trimmedLine.startsWith('[FAIL]') || trimmedLine.includes('[FAIL]') || trimmedLine.includes('failed') || trimmedLine.includes('Error')) {
                        steps.push({
                            number: stepCounter++,
                            text: trimmedLine,
                            status: 'failed',
                            type: 'step'
                        });
                    } else if (trimmedLine.startsWith('[WARN]') || trimmedLine.includes('warning') || trimmedLine.includes('Warning')) {
                        steps.push({
                            number: stepCounter++,
                            text: trimmedLine,
                            status: 'warning',
                            type: 'step'
                        });
                    } else if (trimmedLine.includes('PURPOSE:') || trimmedLine.includes('STEP:')) {
                        steps.push({
                            number: '',
                            text: trimmedLine,
                            status: 'info',
                            type: 'info'
                        });
                    } else if (trimmedLine.startsWith('---') || trimmedLine.includes('---')) {
                        steps.push({
                            number: '',
                            text: trimmedLine.replace(/-/g, '').trim(),
                            status: 'info',
                            type: 'subsection'
                        });
                    } else if (trimmedLine.length > 5 && !trimmedLine.startsWith('at ')) {
                        // Capture other meaningful output
                        steps.push({
                            number: '',
                            text: trimmedLine,
                            status: 'info',
                            type: 'log'
                        });
                    }
                });
            });
        }

        return steps;
    }

    generateHTMLReport(results, outputDir, moduleName) {
        const htmlPath = path.join(outputDir, 'test-report.html');

        const passed = results.filter(r => r.status === 'passed').length;
        const failed = results.filter(r => r.status === 'failed').length;
        const skipped = results.filter(r => r.status === 'skipped').length;
        const total = results.length;
        const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

        const html = this.generateHTMLTemplate(results, moduleName, passed, failed, skipped, total, passRate, false);

        fs.writeFileSync(htmlPath, html);
        console.log(`   HTML Report: ${htmlPath}`);
    }

    generateHTMLTemplate(results, moduleName, passed, failed, skipped, total, passRate, isMaster = false) {
        const modules = isMaster ? [...new Set(results.map(r => r.module))].sort() : [];

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${isMaster ? 'Master Test Report - All Modules' : `Test Report - ${moduleName}`} - ${new Date().toLocaleDateString()}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f0f2f5; color: #333; line-height: 1.6; }
        .container { max-width: 1600px; margin: 0 auto; padding: 20px; }

        /* Header */
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); }
        .header h1 { font-size: 28px; margin-bottom: 8px; }
        .header .module-name { font-size: 18px; opacity: 0.9; margin-bottom: 10px; }
        .header .subtitle { opacity: 0.8; font-size: 13px; }

        /* Summary Cards */
        .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 20px; margin-bottom: 25px; }
        .card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); text-align: center; transition: transform 0.2s; }
        .card:hover { transform: translateY(-3px); }
        .card .number { font-size: 48px; font-weight: 700; margin-bottom: 5px; }
        .card .label { color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; }
        .card.passed .number { color: #10b981; }
        .card.failed .number { color: #ef4444; }
        .card.skipped .number { color: #f59e0b; }
        .card.total .number { color: #6366f1; }
        .card.rate .number { color: #8b5cf6; }

        /* Filters */
        .filters { background: white; padding: 20px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); display: flex; align-items: center; gap: 15px; flex-wrap: wrap; }
        .filters input[type="text"] { padding: 10px 16px; border: 2px solid #e2e8f0; border-radius: 8px; width: 300px; font-size: 14px; transition: border-color 0.2s; }
        .filters input[type="text"]:focus { outline: none; border-color: #6366f1; }
        .filters select { padding: 10px 16px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px; cursor: pointer; }
        .export-btn { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; transition: transform 0.2s; }
        .export-btn:hover { transform: translateY(-2px); }
        .clear-btn { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; transition: transform 0.2s; margin-left: auto; }
        .clear-btn:hover { transform: translateY(-2px); }

        /* Table */
        .table-container { background: white; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); overflow: hidden; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f8fafc; padding: 16px 20px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
        td { padding: 16px 20px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        tr:hover { background: #f8fafc; }
        tr:last-child td { border-bottom: none; }

        /* Test Case No */
        .test-case-no { background: #6366f1; color: white; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 13px; display: inline-block; }

        /* Status Badges */
        .status { padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .status.passed { background: #d1fae5; color: #065f46; }
        .status.failed { background: #fee2e2; color: #991b1b; }
        .status.skipped { background: #fef3c7; color: #92400e; }

        /* Test Steps */
        .steps-container { margin-top: 15px; }
        .steps-toggle { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
        .steps-toggle:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4); }
        .steps-toggle .arrow { transition: transform 0.3s; }
        .steps-toggle.open .arrow { transform: rotate(180deg); }

        .steps-panel { display: none; margin-top: 15px; background: #f8fafc; border-radius: 10px; border: 2px solid #e2e8f0; overflow: hidden; }
        .steps-panel.show { display: block; animation: slideDown 0.3s ease; }

        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .steps-header { background: #e2e8f0; padding: 12px 16px; font-weight: 600; color: #475569; font-size: 13px; border-bottom: 1px solid #cbd5e1; }
        .steps-list { max-height: 400px; overflow-y: auto; }

        .step-item { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: flex-start; gap: 12px; font-size: 14px; transition: background 0.2s; }
        .step-item:last-child { border-bottom: none; }
        .step-item:hover { background: #f1f5f9; }

        .step-number { background: #6366f1; color: white; min-width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; flex-shrink: 0; }
        .step-text { flex: 1; line-height: 1.5; }
        .step-icon { font-size: 18px; flex-shrink: 0; }

        .step-item.passed { background: #f0fdf4; }
        .step-item.passed .step-number { background: #10b981; }
        .step-item.passed .step-text { color: #065f46; }

        .step-item.failed { background: #fef2f2; }
        .step-item.failed .step-number { background: #ef4444; }
        .step-item.failed .step-text { color: #991b1b; font-weight: 500; }

        .step-item.section { background: #6366f1; color: white; font-weight: 700; font-size: 15px; }
        .step-item.section .step-number { background: white; color: #6366f1; }

        .step-item.subsection { background: #e0e7ff; }
        .step-item.subsection .step-text { color: #4338ca; font-weight: 600; }

        .step-item.info { background: #eff6ff; }
        .step-item.info .step-text { color: #1e40af; }

        .step-item.warning { background: #fffbeb; }
        .step-item.warning .step-number { background: #f59e0b; }
        .step-item.warning .step-text { color: #92400e; }

        /* Failure Reason */
        .failure-reason { background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); color: #991b1b; padding: 14px 18px; border-radius: 8px; font-size: 13px; margin-top: 12px; border-left: 4px solid #ef4444; }

        /* Error Details */
        .error-details { background: #fff; border: 2px solid #ef4444; border-radius: 10px; margin-top: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(239, 68, 68, 0.15); }
        .error-details-header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 12px 16px; font-weight: 600; }
        .error-type-badge { background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        .error-details-body { padding: 16px; }
        .error-row { display: flex; padding: 8px 0; border-bottom: 1px solid #f3f4f6; align-items: flex-start; }
        .error-row:last-child { border-bottom: none; }
        .error-label { font-weight: 600; color: #4b5563; min-width: 120px; flex-shrink: 0; }
        .error-value { color: #1f2937; flex: 1; word-break: break-word; }
        .error-value.element-selector { font-family: 'Consolas', 'Monaco', monospace; background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 12px; color: #7c3aed; }
        .error-value.error-actual { color: #dc2626; font-weight: 500; }
        .error-row.suggestion { background: #fef3c7; margin: 8px -16px -16px -16px; padding: 12px 16px; border-radius: 0 0 8px 8px; }
        .error-row.suggestion .error-label { color: #92400e; }
        .error-row.suggestion .error-value { color: #78350f; }
        .error-row.full-error { flex-direction: column; }
        .error-row.full-error .error-value pre { background: #1f2937; color: #f3f4f6; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 11px; margin-top: 8px; white-space: pre-wrap; word-wrap: break-word; }
        .error-toggle { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px; display: inline-flex; align-items: center; gap: 6px; margin-top: 10px; transition: all 0.2s; }
        .error-toggle:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4); }
        .error-toggle .arrow { transition: transform 0.3s; font-size: 10px; }
        .error-toggle.open .arrow { transform: rotate(180deg); }
        .error-panel { display: none; }
        .error-panel.show { display: block; animation: slideDown 0.3s ease; }

        /* Video Link */
        .video-link { color: #6366f1; text-decoration: none; font-size: 13px; display: flex; align-items: center; gap: 6px; font-weight: 500; }
        .video-link:hover { text-decoration: underline; }
        .no-video { color: #9ca3af; font-size: 13px; }

        /* Footer */
        .footer { text-align: center; padding: 25px; color: #666; font-size: 12px; }

        /* Responsive */
        @media (max-width: 1200px) {
            .summary { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 768px) {
            .summary { grid-template-columns: repeat(2, 1fr); }
            .filters { flex-direction: column; }
            .filters input[type="text"] { width: 100%; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${isMaster ? 'Master Test Execution Report' : 'Test Execution Report'}</h1>
            <div class="module-name">${isMaster ? `All Modules (${modules.length} modules, ${total} tests)` : `Module: ${moduleName}`}</div>
            <div class="subtitle">
                Generated: ${new Date().toLocaleString()} |
                Duration: ${((this.endTime - this.startTime) / 1000).toFixed(2)}s |
                Project: Fleet GPS Tracking Platform
            </div>
        </div>

        <div class="summary">
            <div class="card total">
                <div class="number">${total}</div>
                <div class="label">Total Tests</div>
            </div>
            <div class="card passed">
                <div class="number">${passed}</div>
                <div class="label">Passed</div>
            </div>
            <div class="card failed">
                <div class="number">${failed}</div>
                <div class="label">Failed</div>
            </div>
            <div class="card skipped">
                <div class="number">${skipped}</div>
                <div class="label">Skipped</div>
            </div>
            <div class="card rate">
                <div class="number">${passRate}%</div>
                <div class="label">Pass Rate</div>
            </div>
        </div>

        <div class="filters">
            <input type="text" id="searchInput" placeholder="Search tests..." onkeyup="filterTests()">
            <select id="statusFilter" onchange="filterTests()">
                <option value="">All Status</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
                <option value="skipped">Skipped</option>
            </select>
            ${isMaster ? `
            <select id="moduleFilter" onchange="filterTests()">
                <option value="">All Modules</option>
                ${modules.map(m => `<option value="${m}">${m}</option>`).join('')}
            </select>
            ` : ''}
            <button class="export-btn" onclick="exportToExcel()">Export to Excel</button>
        </div>

        <div class="table-container">
            <table id="testTable">
                <thead>
                    <tr>
                        <th style="width: 100px;">Test Case No</th>
                        <th style="width: 150px;">Module</th>
                        <th>Test Case Description</th>
                        <th style="width: 100px;">Status</th>
                        <th style="width: 90px;">Duration</th>
                        <th style="width: 140px;">Video</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.map((r, index) => `
                    <tr data-status="${r.status}" data-module="${r.module}">
                        <td><span class="test-case-no">${r.testCaseNo}</span></td>
                        <td>${r.module}</td>
                        <td>
                            <strong>${this.escapeHtml(r.description)}</strong>
                            ${r.status === 'failed' && r.parsedError ? `
                                <button class="error-toggle" onclick="toggleError(${index})">
                                    View Error Details
                                    <span class="arrow">&#9660;</span>
                                </button>
                                <div id="error-${index}" class="error-panel">
                                    ${this.generateErrorDetailsHtml(r.parsedError)}
                                </div>
                            ` : (r.status === 'failed' ? `<div class="failure-reason"><strong>Error:</strong> ${this.escapeHtml(r.failureReason)}</div>` : '')}
                            <div class="steps-container">
                                <button class="steps-toggle" onclick="toggleSteps(${index})">
                                    <span>View Test Steps (${r.steps ? r.steps.length : 0})</span>
                                    <span class="arrow">&#9660;</span>
                                </button>
                                <div id="steps-${index}" class="steps-panel">
                                    <div class="steps-header">Test Execution Steps</div>
                                    <div class="steps-list">
                                        ${r.steps && r.steps.length > 0 ? r.steps.map((s, si) => `
                                            <div class="step-item ${s.status} ${s.type}">
                                                ${s.number ? `<span class="step-number">${s.number}</span>` : `<span class="step-icon">${this.getStepIcon(s)}</span>`}
                                                <span class="step-text">${this.escapeHtml(s.text)}</span>
                                            </div>
                                        `).join('') : '<div class="step-item info"><span class="step-text">No detailed steps captured for this test</span></div>'}
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td><span class="status ${r.status}">${r.status.toUpperCase()}</span></td>
                        <td><strong>${(r.duration / 1000).toFixed(2)}s</strong></td>
                        <td>
                            ${r.videoPath ? `<a href="${r.videoPath}" class="video-link" target="_blank">Video: ${r.videoIdentifier}</a>` : '<span class="no-video">No video</span>'}
                        </td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="footer">
            <p>Generated by Custom Playwright Reporter | Fleet GPS Tracking Platform Test Suite</p>
            ${isMaster ? '<p style="margin-top: 5px; font-size: 11px; color: #999;">This is an accumulated report. Run tests to add more results. Delete master-data.json to reset.</p>' : ''}
        </div>
    </div>

    <script>
        function filterTests() {
            const searchText = document.getElementById('searchInput').value.toLowerCase();
            const statusFilter = document.getElementById('statusFilter').value;
            const moduleFilter = document.getElementById('moduleFilter') ? document.getElementById('moduleFilter').value : '';

            const rows = document.querySelectorAll('#testTable tbody tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                const status = row.dataset.status;
                const module = row.dataset.module;

                const matchesSearch = text.includes(searchText);
                const matchesStatus = !statusFilter || status === statusFilter;
                const matchesModule = !moduleFilter || module === moduleFilter;

                row.style.display = matchesSearch && matchesStatus && matchesModule ? '' : 'none';
            });
        }

        function toggleSteps(index) {
            const panel = document.getElementById('steps-' + index);
            const button = panel.previousElementSibling;
            panel.classList.toggle('show');
            button.classList.toggle('open');
        }

        function toggleError(index) {
            const panel = document.getElementById('error-' + index);
            const button = panel.previousElementSibling;
            panel.classList.toggle('show');
            button.classList.toggle('open');
        }

        function exportToExcel() {
            let csv = [];
            csv.push(['Test Case No', 'Module', 'Test Case Description', 'Status', 'Duration', 'Failure Reason', 'Video Identifier'].join(','));

            const data = ${JSON.stringify(results.map(r => ({
                testCaseNo: r.testCaseNo,
                module: r.module,
                description: r.description,
                status: r.status.toUpperCase(),
                duration: (r.duration / 1000).toFixed(2) + 's',
                failureReason: r.failureReason || '',
                videoIdentifier: r.videoIdentifier
            })))};

            data.forEach(row => {
                csv.push([
                    '"' + row.testCaseNo + '"',
                    '"' + row.module + '"',
                    '"' + row.description.replace(/"/g, '""') + '"',
                    '"' + row.status + '"',
                    '"' + row.duration + '"',
                    '"' + row.failureReason.replace(/"/g, '""') + '"',
                    '"' + row.videoIdentifier + '"'
                ].join(','));
            });

            const blob = new Blob([csv.join('\\n')], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = '${isMaster ? 'master-' : ''}test-report-${new Date().toISOString().split('T')[0]}.csv';
            link.click();
        }
    </script>
</body>
</html>`;
    }

    getStepIcon(step) {
        switch(step.type) {
            case 'section': return '>';
            case 'subsection': return '-';
            case 'info': return 'i';
            case 'warning': return '!';
            default: return '*';
        }
    }

    generateCSVReport(results, outputDir) {
        const csvPath = path.join(outputDir, 'test-report.csv');

        const headers = ['Test Case No', 'Module', 'Test Case Description', 'Status', 'Duration (s)', 'Failure Reason', 'Video Identifier', 'File', 'Line'];
        const rows = results.map(r => [
            r.testCaseNo,
            `"${r.module}"`,
            `"${r.description.replace(/"/g, '""')}"`,
            r.status.toUpperCase(),
            (r.duration / 1000).toFixed(2),
            `"${(r.failureReason || '').replace(/"/g, '""')}"`,
            r.videoIdentifier,
            path.basename(r.file),
            r.line
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        fs.writeFileSync(csvPath, csv);
        console.log(`   CSV Report: ${csvPath}`);
    }

    generateJSONReport(results, outputDir) {
        const jsonPath = path.join(outputDir, 'test-report.json');

        const report = {
            summary: {
                total: results.length,
                passed: results.filter(r => r.status === 'passed').length,
                failed: results.filter(r => r.status === 'failed').length,
                skipped: results.filter(r => r.status === 'skipped').length,
                duration: this.endTime - this.startTime,
                startTime: this.startTime.toISOString(),
                endTime: this.endTime.toISOString()
            },
            tests: results
        };

        fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
        console.log(`   JSON Report: ${jsonPath}`);
    }

    /**
     * Generate master report containing ALL accumulated test results
     */
    generateMasterReport(allResults) {
        const htmlPath = path.join(this.baseOutputDir, 'test-report.html');
        const csvPath = path.join(this.baseOutputDir, 'test-report.csv');

        const passed = allResults.filter(r => r.status === 'passed').length;
        const failed = allResults.filter(r => r.status === 'failed').length;
        const skipped = allResults.filter(r => r.status === 'skipped').length;
        const total = allResults.length;
        const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

        // Get unique modules for filtering
        const modules = [...new Set(allResults.map(r => r.module))].sort();

        const html = this.generateHTMLTemplate(allResults, 'All Modules', passed, failed, skipped, total, passRate, true);

        fs.writeFileSync(htmlPath, html);
        console.log(`   Master HTML Report: ${htmlPath}`);

        // Generate master CSV
        const headers = ['Test Case No', 'Module', 'Test Case Description', 'Status', 'Duration (s)', 'Failure Reason', 'Video Identifier', 'File', 'Line'];
        const rows = allResults.map(r => [
            r.testCaseNo,
            `"${r.module}"`,
            `"${r.description.replace(/"/g, '""')}"`,
            r.status.toUpperCase(),
            (r.duration / 1000).toFixed(2),
            `"${(r.failureReason || '').replace(/"/g, '""')}"`,
            r.videoIdentifier,
            r.fileName,
            r.line
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        fs.writeFileSync(csvPath, csv);
        console.log(`   Master CSV Report: ${csvPath}`);
    }

    printSummary(allResults) {
        // Current run summary
        const currentPassed = this.results.filter(r => r.status === 'passed').length;
        const currentFailed = this.results.filter(r => r.status === 'failed').length;
        const currentSkipped = this.results.filter(r => r.status === 'skipped').length;

        // Overall summary (all accumulated tests)
        const totalPassed = allResults.filter(r => r.status === 'passed').length;
        const totalFailed = allResults.filter(r => r.status === 'failed').length;
        const totalSkipped = allResults.filter(r => r.status === 'skipped').length;

        console.log(`\n${'='.repeat(60)}`);
        console.log('                    CURRENT RUN SUMMARY');
        console.log('='.repeat(60));
        console.log(`  Passed:    ${currentPassed}`);
        console.log(`  Failed:    ${currentFailed}`);
        console.log(`  Skipped:   ${currentSkipped}`);
        console.log(`  Total:     ${this.results.length}`);
        console.log(`  Pass Rate: ${this.results.length > 0 ? ((currentPassed / this.results.length) * 100).toFixed(1) : 0}%`);
        console.log('='.repeat(60));

        console.log(`\n${'='.repeat(60)}`);
        console.log('                OVERALL ACCUMULATED SUMMARY');
        console.log('='.repeat(60));
        console.log(`  Passed:    ${totalPassed}`);
        console.log(`  Failed:    ${totalFailed}`);
        console.log(`  Skipped:   ${totalSkipped}`);
        console.log(`  Total:     ${allResults.length}`);
        console.log(`  Pass Rate: ${allResults.length > 0 ? ((totalPassed / allResults.length) * 100).toFixed(1) : 0}%`);

        // Show modules included
        const modules = [...new Set(allResults.map(r => r.module))];
        console.log(`  Modules:   ${modules.length} (${modules.slice(0, 5).join(', ')}${modules.length > 5 ? '...' : ''})`);
        console.log('='.repeat(60));

        if (currentFailed > 0) {
            console.log('\nFAILED TESTS (Current Run):');
            this.results.filter(r => r.status === 'failed').forEach(r => {
                console.log(`   * ${r.testCaseNo} - ${r.description}`);
                if (r.failureReason) {
                    console.log(`     Error: ${r.failureReason.substring(0, 100)}...`);
                }
            });
        }

        console.log(`\nReports saved to: ${this.baseOutputDir}/`);
        console.log(`   test-report.html (MASTER - All ${allResults.length} tests)`);
        this.testFiles.forEach((_, fileName) => {
            console.log(`   ${this.getFolderName(fileName)}/`);
        });
    }

    escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

module.exports = CustomReporter;
