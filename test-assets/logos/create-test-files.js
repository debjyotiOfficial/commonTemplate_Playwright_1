const fs = require('fs');
const path = require('path');

// Create invalid text file
fs.writeFileSync(path.join(__dirname, 'invalid-file.txt'), 'This is not an image file. It should be rejected by the upload.');
console.log('Created invalid-file.txt');

// Create corrupted image (PNG header but invalid data)
const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const invalidData = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x00, 0xAB, 0xCD, 0xEF, 0x12, 0x34]);
const corruptedData = Buffer.concat([pngHeader, invalidData]);
fs.writeFileSync(path.join(__dirname, 'corrupted-image.png'), corruptedData);
console.log('Created corrupted-image.png');

// For oversized file, create a large text-based file with PNG extension
// (Since we don't have image libraries, we'll create a large file that exceeds size limit)
const largeContent = Buffer.alloc(3 * 1024 * 1024); // 3MB of zeros
largeContent.fill(0xFF);
// Add PNG header to make it look like a PNG
pngHeader.copy(largeContent, 0);
fs.writeFileSync(path.join(__dirname, 'oversized-logo-5mb.png'), largeContent);
console.log('Created oversized-logo-5mb.png (3MB)');

console.log('All test files created successfully!');
