# qr-styled-with-logo

A professional, zero-dependency, pure-JavaScript QR code generation and rendering library for Node.js. 

This library features a modernized vector-style rendering pipeline that generates high-fidelity QR codes with:
- **Circular dot-style** data modules.
- **Rounded-corner "finder eyes"** instead of rigid squares.
- **Centered logo overlays** placed perfectly on a clean, customizable circular backdrop.
- **Luminance-based contrast warnings** to ensure your custom-colored codes scan reliably in the real world.

No native C++ modules, no external canvas or graphics dependencies required—ideal for lightweight and serverless environments.

---

## Features

- 🚀 **Zero Dependencies**: Pure JS rendering, including zlib-based raw PNG parsing and generation.
- 🎨 **Modern Design**: Rounded elements and perfect circle data modules that match modern branding trends.
- 🖼️ **Logo Overlay**: Overlay any 8-bit RGBA PNG image directly in the center with a proportional backdrop and optional safe clipping.
- 🔒 **Contrast Safety Checks**: Built-in verification warns you if the chosen foreground/background colors are too close for reliable scanning.
- ⚡ **Auto-Sizing Engine**: Implements the ISO/IEC 18004:2006 (QR Code 2005) standard. Auto-calculates the optimal QR version size to fit your text payload.

---

## Installation

```bash
npm install qr-styled-with-logo
```

---

## Quick Start

### Basic Usage with Logo

Create a file `generate.js` and write:

```javascript
const fs = require('fs');
const { generateQrPngWithLogo } = require('qr-styled-with-logo');

try {
  // You can pass the logo as a file path string or a raw file Buffer!
  const logoBuffer = fs.readFileSync('./logo.png');

  // Generate and save directly to file!
  const pngBuffer = generateQrPngWithLogo('https://example.com', {
    scale: 16,
    border: 4,
    qrColor: '#4C8A00',      // A scan-safe green
    bgColor: '#FFFFFF',      // Background color
    borderColor: '#FFFFFF',  // Outer border color
    logo: logoBuffer,        // Can be a Buffer or a file path string
    logoSizeRatio: 0.2,      // Logo occupies 20% of QR width
    logoPaddingRatio: 0.2,   // Padding around logo
    outputPath: 'qrcode.png' // Save directly to disk
  });

  console.log('QR Code generated and saved successfully! Buffer length:', pngBuffer.length);
} catch (error) {
  console.error('Error generating QR code:', error);
}
```

---

## API Reference

### `generateQrPngWithLogo(text, options)`

Generates a stylized PNG QR Code, returning it as a Node.js `Buffer`. If an output file path is supplied, it also saves the PNG to disk synchronously.

#### Parameters

- **`text`** `(String)`: The payload string to encode inside the QR code.
- **`options`** `(Object, optional)`:
  - **`scale`** `(Number)`: The pixel size of each QR module (cell). Default: `16`.
  - **`border`** `(Number)`: Number of quiet zone/border modules surrounding the QR code. Default: `4`.
  - **`qrColor`** `(String)`: Hex color string (e.g., `#000000`) for the QR code elements (dots and outer/inner eye frames). Default: `#000000`.
  - **`bgColor`** `(String)`: Hex color string (e.g., `#FFFFFF`) for the quiet zone and background canvas. Default: `#FFFFFF`.
  - **`borderColor`** `(String)`: Hex color string for the outermost border block. Default: matches `bgColor`.
  - **`dotScale`** `(Number)`: Size ratio of data dot modules (from `0.0` to `1.0`). Default: `0.86`.
  - **`logo`** `(String | Buffer)`: The logo file path or the raw file `Buffer` (8-bit RGBA, non-interlaced PNG).
  - **`logoPath`** `(String)`: File system path to the logo (retained for backward compatibility; alias for `logo`).
  - **`logoSizeRatio`** `(Number)`: Diameter ratio of the logo relative to the total QR code width (from `0.0` to `1.0`). Default: `0.26`.
  - **`logoPaddingRatio`** `(Number)`: White circular backdrop padding size around the logo. Default: `0.18`.
  - **`level`** `(String)`: Error correction level (`L`, `M`, `Q`, `H`). If a logo is specified, it defaults to `H` (High: 30% restoration) for scan safety. If no logo is specified, it defaults to `Q` (Quartile: 25%).
  - **`outputPath`** `(String)`: The file system path to synchronously save the generated PNG image directly to disk. (e.g., `'./qrcode.png'`)
  - **`output`** `(String)`: Alias for `outputPath` (retained for convenience).

---

## Technical Considerations

### Logo Recommendations
- **Format**: Only **8-bit RGBA, non-interlaced PNG** files are supported. Interlaced or indexed PNGs will throw an error.
- **Transparency**: Fully supports alpha transparency in the logo.
- **Safety**: Keep the `logoSizeRatio` under `0.25` (25%) when using `H` error-correction to ensure the QR code remains 100% scannable.

### Scan Safety Contrast Warning
QR scanners evaluate readability on luminance (brightness contrast) rather than color hue. A bright neon color might look high-contrast to human eyes but appears identical to white for an optical scanner. 

This library automatically calculates the relative luminance and prints a warning to `console.warn` if the contrast gap is dangerously low. For reliable results, use a foreground color with a luminance under `140` and at least a `100` unit gap between the foreground and background.

---

## Usage in Google Apps Script (GAS)

Since Google Apps Script runs on a V8 engine rather than Node.js, standard Node-specific modules (like `fs` or native C++ `zlib`) are not natively supported. 

This repository includes a pre-configured Webpack bundler to compile a browser/GAS-safe polyfilled bundle (`qr-styled.gas.js`) which substitutes native `zlib` with a pure-JavaScript compression algorithm (`pako`) and injects a `Buffer` polyfill.

### 1. Build the GAS Bundle
Run the following command to generate the standalone build:
```bash
npm run build:gas
```
This generates the file `dist/qr-styled.gas.js`.

### 2. Install in Google Apps Script
1. Open your Google Apps Script editor.
2. Create a new script file named `QrStyledLib.gs`.
3. Copy the entire content of the compiled `dist/qr-styled.gas.js` file and paste it into `QrStyledLib.gs`. Save the script.

### 3. Generate Styled QR Codes in GAS
You can now call the globally exposed function `QrStyled(text, options)` directly in your `Code.gs` files:

```javascript
function createStyledQrInDrive() {
  try {
    // 1. Fetch a PNG logo (e.g. from Drive or Web)
    const logoBlob = UrlFetchApp.fetch("https://example.com/logo.png").getBlob();
    const logoBytes = logoBlob.getBytes();

    // Map GAS signed Byte[] elements to unsigned Uint8Array (Node-friendly Buffer format)
    const logoUint8 = new Uint8Array(logoBytes.map(b => b < 0 ? b + 256 : b));

    // 2. Generate the QR Code PNG bytes using QrStyled
    const qrBufferBytes = QrStyled("https://example.com/target", {
      scale: 16,
      border: 4,
      qrColor: "#4C8A00",   // Branded scan-safe green
      bgColor: "#FFFFFF",
      logo: logoUint8,       // Pass the logo bytes Uint8Array directly!
      logoSizeRatio: 0.2,
      logoPaddingRatio: 0.2
    });

    // 3. Convert returned Uint8Array back to a standard GAS Blob
    const signedQrBytes = Array.from(qrBufferBytes).map(b => b > 127 ? b - 256 : b);
    const qrBlob = Utilities.newBlob(signedQrBytes, "image/png", "qrcode_valeo.png");

    // 4. Save to Google Drive
    const file = DriveApp.getRootFolder().createFile(qrBlob);
    Logger.log("Successfully created styled QR code file on Google Drive: " + file.getUrl());
  } catch (error) {
    Logger.log("Error: " + error.toString());
  }
}
```

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.
QR Code generator logic based on [Zingl's 2D-Barcode engine](https://github.com/zingl/2D-Barcode).
