const fs = require('fs');
const path = require('path');
const { generateQrPngWithLogo } = require('../src/index.js');

const logoPath = path.resolve(__dirname, '../logo.png');
const outputPath = path.resolve(__dirname, '../qrcode_logo.png');

console.log('Generating QR code with logo buffer...');
console.log(`Logo path (to be read as Buffer): ${logoPath}`);
console.log(`Output path: ${outputPath}`);

try {
    // Read the logo file into a raw Buffer to test options.logo Buffer support
    const logoBuffer = fs.readFileSync(logoPath);

    const pngBuffer = generateQrPngWithLogo("www.google.com", {
        scale: 16,
        border: 4,
        qrColor: "#4C8A00",   // a darker, scan-safe green — see warnIfLowContrast()
        bgColor: "#FFFFFF",
        borderColor: "#FFFFFF",
        dotScale: 0.86,
        logoSizeRatio: 0.2,
        logoPaddingRatio: 0.2,
        logo: logoBuffer,      // Pass the logo directly as a Buffer instead of a path
        outputPath: outputPath // Have the library synchronously write directly to disk!
    });

    console.log("Successfully generated qrcode_logo.png directly using library's outputPath option!");
    console.log(`Returned Buffer length: ${pngBuffer.length} bytes`);
} catch (error) {
    console.error("Failed to generate QR code:", error);
    process.exit(1);
}
