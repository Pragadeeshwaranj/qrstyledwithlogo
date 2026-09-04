const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { generateQrPngWithLogo } = require('./index.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and body parsers
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Setup multer for memory storage uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Serve static assets from 'public' directory
app.use(express.static(path.join(__dirname, '../public')));

/**
 * Helper to fetch a remote logo buffer using standard Node.js networking
 */
function fetchLogoBuffer(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, (res) => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error(`Failed to fetch logo from URL: ${url} (Status: ${res.statusCode})`));
            }
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
        }).on('error', (err) => reject(err));
    });
}

/**
 * Safely parse query/body options into correct types for the QR generator
 */
function parseQrOptions(input) {
    const options = {};

    if (input.scale !== undefined) {
        const val = parseInt(input.scale, 10);
        if (!isNaN(val) && val > 0) options.scale = val;
    }
    if (input.border !== undefined) {
        const val = parseInt(input.border, 10);
        if (!isNaN(val) && val >= 0) options.border = val;
    }
    if (input.dotScale !== undefined) {
        const val = parseFloat(input.dotScale);
        if (!isNaN(val) && val >= 0 && val <= 1) options.dotScale = val;
    }
    if (input.logoSizeRatio !== undefined) {
        const val = parseFloat(input.logoSizeRatio);
        if (!isNaN(val) && val >= 0 && val <= 1) options.logoSizeRatio = val;
    }
    if (input.logoPaddingRatio !== undefined) {
        const val = parseFloat(input.logoPaddingRatio);
        if (!isNaN(val) && val >= 0 && val <= 1) options.logoPaddingRatio = val;
    }

    if (input.qrColor) options.qrColor = input.qrColor;
    if (input.bgColor) options.bgColor = input.bgColor;
    if (input.borderColor) options.borderColor = input.borderColor;

    if (input.level) {
        const upper = input.level.toUpperCase();
        if (['L', 'M', 'Q', 'H'].includes(upper)) options.level = upper;
    }

    return options;
}

/**
 * Primary generation handler
 */
async function handleQrGeneration(req, res, input, uploadedFile) {
    const text = input.text;
    if (!text) {
        return res.status(400).json({ error: 'Missing required field: text' });
    }

    try {
        const options = parseQrOptions(input);

        // 1. Determine Logo source
        let logoBuffer = null;

        if (uploadedFile && uploadedFile.buffer) {
            // Priority 1: Multer upload
            logoBuffer = uploadedFile.buffer;
        } else if (input.logoBase64) {
            // Priority 2: Base64 string
            const base64Data = input.logoBase64.replace(/^data:image\/png;base64,/, '');
            logoBuffer = Buffer.from(base64Data, 'base64');
        } else if (input.logoUrl) {
            // Priority 3: Remote URL
            logoBuffer = await fetchLogoBuffer(input.logoUrl);
        } else if (input.useDefaultLogo === 'true' || input.useDefaultLogo === true) {
            // Priority 4: Default local project logo
            const defaultLogoPath = path.resolve(__dirname, '../logo.png');
            if (fs.existsSync(defaultLogoPath)) {
                logoBuffer = fs.readFileSync(defaultLogoPath);
            }
        }

        if (logoBuffer) {
            options.logo = logoBuffer;
        }

        // 2. Generate the QR Code PNG
        const pngBuffer = generateQrPngWithLogo(text, options);

        // 3. Return PNG
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Length', pngBuffer.length);
        res.send(pngBuffer);

    } catch (error) {
        console.error('Error generating QR code in API:', error.message);
        res.status(500).json({
            error: 'Failed to generate QR code',
            details: error.message
        });
    }
}

/**
 * @api {get} /api/qr Generate QR (GET)
 * Supports query parameters. E.g., /api/qr?text=Hello&qrColor=%234C8A00&useDefaultLogo=true
 */
app.get('/api/qr', async (req, res) => {
    await handleQrGeneration(req, res, req.query, null);
});

/**
 * @api {post} /api/qr Generate QR (POST JSON)
 * Supports JSON payloads.
 */
app.post('/api/qr', async (req, res) => {
    await handleQrGeneration(req, res, req.body, null);
});

/**
 * @api {post} /api/qr/upload Generate QR (POST Multipart Form Data)
 * Supports custom logo file uploads alongside configuration fields.
 */
app.post('/api/qr/upload', upload.single('logo'), async (req, res) => {
    await handleQrGeneration(req, res, req.body, req.file);
});

// Start the server only if run directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`=========================================`);
        console.log(`🚀 Styled QR Code API is online!`);
        console.log(`💻 Local playground: http://localhost:${PORT}`);
        console.log(`⚙️  API Endpoints:`);
        console.log(`   - GET  http://localhost:${PORT}/api/qr?text=...`);
        console.log(`   - POST http://localhost:${PORT}/api/qr (JSON)`);
        console.log(`   - POST http://localhost:${PORT}/api/qr/upload (Multipart)`);
        console.log(`=========================================`);
    });
}

module.exports = app;
