/**
 * API Integration and Validation Test
 * Starts the Express API server on an ephemeral port, performs requests,
 * and validates headers, status codes, and response bodies.
 */
const http = require('http');
const app = require('../src/server.js');

const TEST_PORT = 3199;

function runTest() {
    console.log('Starting verification test for Express API...');
    
    // Start server on testing port
    const server = app.listen(TEST_PORT, async () => {
        console.log(`Test server successfully listening on port ${TEST_PORT}`);
        
        try {
            // Test 1: GET /api/qr with simple query
            console.log('\n--- Test 1: GET /api/qr ---');
            const getRes = await makeGetRequest(`http://localhost:${TEST_PORT}/api/qr?text=https://example.com&qrColor=%234C8A00`);
            validateResponse(getRes, 'image/png');
            console.log('✅ GET request test passed!');

            // Test 2: POST /api/qr with JSON body
            console.log('\n--- Test 2: POST /api/qr (JSON) ---');
            const postPayload = JSON.stringify({
                text: 'https://github.com',
                qrColor: '#000000',
                scale: 12
            });
            const postRes = await makePostRequest(`http://localhost:${TEST_PORT}/api/qr`, postPayload, 'application/json');
            validateResponse(postRes, 'image/png');
            console.log('✅ POST JSON request test passed!');

            // Test 3: Validation Error Handling
            console.log('\n--- Test 3: Validation Error (Missing Text) ---');
            const errRes = await makeGetRequest(`http://localhost:${TEST_PORT}/api/qr`);
            if (errRes.statusCode !== 400) {
                throw new Error(`Expected 400 Bad Request, got: ${errRes.statusCode}`);
            }
            const errBody = JSON.parse(errRes.body);
            if (!errBody.error || !errBody.error.includes('Missing required field')) {
                throw new Error(`Expected error body, got: ${errRes.body}`);
            }
            console.log('✅ Error validation test passed!');

            console.log('\n=========================================');
            console.log('🎉 ALL EXPRESS API VERIFICATION TESTS PASSED!');
            console.log('=========================================');
            server.close();
            process.exit(0);

        } catch (error) {
            console.error('\n❌ Verification test failed:', error.message);
            server.close();
            process.exit(1);
        }
    });
}

/**
 * HTTP GET Helper
 */
function makeGetRequest(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: Buffer.concat(chunks)
                });
            });
        }).on('error', reject);
    });
}

/**
 * HTTP POST Helper
 */
function makePostRequest(url, payload, contentType) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const req = http.request({
            hostname: u.hostname,
            port: u.port,
            path: u.pathname,
            method: 'POST',
            headers: {
                'Content-Type': contentType,
                'Content-Length': Buffer.byteLength(payload)
            }
        }, (res) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: Buffer.concat(chunks)
                });
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

/**
 * Verify response properties
 */
function validateResponse(response, expectedContentType) {
    if (response.statusCode !== 200) {
        throw new Error(`Expected 200 OK, got: ${response.statusCode}. Body: ${response.body.toString()}`);
    }
    const contentType = response.headers['content-type'];
    if (!contentType || !contentType.includes(expectedContentType)) {
        throw new Error(`Expected Content-Type '${expectedContentType}', got: '${contentType}'`);
    }
    const contentLength = parseInt(response.headers['content-length'], 10);
    if (isNaN(contentLength) || contentLength <= 0) {
        throw new Error(`Expected valid Content-Length, got: ${response.headers['content-length']}`);
    }
    if (response.body.length !== contentLength) {
        throw new Error(`Content-Length header matches neither actual body size (${response.body.length} !== ${contentLength})`);
    }
}

// Run the verification suite
runTest();
