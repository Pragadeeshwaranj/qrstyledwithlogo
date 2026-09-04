const fs = require('fs');
const zlib = require('zlib');

// Environment-safe compress/decompress helpers (compatible with Node.js and Google Apps Script / Webpack / pako fallbacks)
function customDeflateSync(data) {
    if (typeof zlib.deflateSync === 'function') {
        return zlib.deflateSync(data);
    }
    if (typeof zlib.deflate === 'function') {
        return zlib.deflate(data);
    }
    throw new Error('No deflateSync or deflate implementation found in zlib module.');
}

function customInflateSync(data) {
    if (typeof zlib.inflateSync === 'function') {
        return zlib.inflateSync(data);
    }
    if (typeof zlib.inflate === 'function') {
        return zlib.inflate(data);
    }
    throw new Error('No inflateSync or inflate implementation found in zlib module.');
}

/**
 * QR Code 2005 bar code symbol creation according ISO/IEC 18004:2006
 * SOURCE: https://github.com/zingl/2D-Barcode/
 * (Encoding engine kept as-is — only the rendering pipeline below was rewritten
 *  to support dot-style modules, rounded "eyes", and a logo with a circular backdrop.)
 */
function quickresponse(text, level, ver) {
    var mode, size, align, blk, ec;
    var enc = [];
    var i, j, k, c, b, d, w, x, y, n;
    var erc = [
        [2, 5, 6, 8, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30], // L
        [99, 6, 8, 10, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28], // M
        [99, 99, 99, 14, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30], // Q
        [99, 99, 99, 99, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30], // H
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25], // blocks L
        [1, 1, 1, 1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49], // M
        [1, 1, 1, 1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68], // Q
        [1, 1, 1, 1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]  // H
    ];
    var lev = (3 - "HQMLhqml3210".indexOf(level || 0)) & 3;
    var chars = [
        "0123456789",
        "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:",
        String.fromCharCode.apply(null, Array.from({ length: 127 }, (_, i) => i)),
        typeof kanji === "undefined" || kanji.length != 7973 ? "" : kanji
    ];
    function len(mod, chr) {
        if (chars[mod].indexOf(chr) >= 0) return [20, 33, 48, 78][mod];
        return mod != 2 ? 1e9 : chr.charCodeAt(0) < 2048 ? 96 : 144;
    }
    function cib(mod) {
        return ver < 1 ? ver + (((19 - 2 * mod) / 3) | 0) : [[10, 12, 14], [9, 11, 13], [8, 16, 16], [8, 10, 12]][mod][((ver + 7) / 17) | 0];
    }
    function push(val, bits) {
        val <<= 8; eb += bits;
        enc[enc.length - 1] |= val >> eb;
        while (eb > 7) enc[enc.length] = (val >> (eb -= 8)) & 255;
    }
    ver = isNaN(ver) ? 0 : ver - 1;
    do {
        if (++ver >= erc[0].length - 3) return [];
        if (ver < 2 || ver == 10 || ver == 27) {
            var enc = [0], el, eb = 0;
            var head = [];
            for (j = 0; j < 4; j++) head.push((Math.min(4, ver + 3) + cib(j)) * 6);
            var bits = [[]], cost = head.slice();
            for (i = text.length; i-- > 0;) {
                bits.unshift(cost.slice());
                for (j = 0; j < cost.length; j++) cost[j] += len(j, text.charAt(i));
                b = Math.min.apply(null, cost);
                for (j = 0; j < cost.length; j++) cost[j] = Math.min(cost[j], (((b + 5) / 6) | 0) * 6 + head[j]);
            }
            n = mode = cost.indexOf(b);
            for (i = j = 0; j++ < text.length;) {
                [2, 3, 1, 0].forEach(function (k) {
                    b = bits[j][k] + len(k, text.charAt(j)) + 5;
                    if (b < 1e7 && (mode == k || 6 * ((b / 6) | 0) == bits[j - 1][mode] - head[mode])) n = k;
                });
                if (mode != n || j == text.length) {
                    if (ver < -1 && ver + 3 < mode) push(0, 50);
                    if (ver > 0) push(1 << mode, 4);
                    else push(mode, ver + 3);
                    b = unescape(encodeURIComponent(text.substring(i, j)));
                    push(mode == 2 ? b.length : j - i, cib(mode));
                    if (mode == 0) {
                        for (; i < j - 2; i += 3) push(text.substr(i, 3), 10);
                        if (i < j) push(text.substring(i, j), j - i == 1 ? 4 : 7);
                    } else if (mode == 1) {
                        for (; i < j - 1; i += 2) push(chars[1].indexOf(text.charAt(i)) * 45 + chars[1].indexOf(text.charAt(i + 1)), 11);
                        if (i < j) push(chars[1].indexOf(text.charAt(i)), 6);
                    } else if (mode == 2) {
                        for (i = 0; i < b.length; i++) push(b.charCodeAt(i), 8);
                    } else {
                        for (; i < j; i++) push(chars[3].indexOf(text.charAt(i)), 13);
                    }
                    i = j; mode = n;
                }
            }
        }
        size = ver * (ver < 1 ? 2 : 4) + 17;
        align = ver < 2 ? 0 : ((ver / 7) | 0) + 2;
        el = (size - 1) * (size - 1) - (5 * align - 1) * (5 * align - 1);
        el -= ver < 1 ? 59 : ver < 2 ? 191 : ver < 7 ? 136 : 172;
        i = ver < 1 ? 8 - (ver & 1) * 4 : 8;
        c = erc[lev + 4][ver + 3] * erc[lev][ver + 3];
    } while (((el & -8) - c * 8) < enc.length * 8 + eb - i);

    for (; (!level || (level.charCodeAt(0) & -33) == 65) && lev < 3; lev++) {
        j = erc[lev + 5][ver + 3] * erc[lev + 1][ver + 3];
        if ((el & -8) - j * 8 < enc.length * 8 + eb - i) break;
    }
    blk = erc[lev + 4][ver + 3];
    ec = erc[lev][ver + 3];
    el = (el >> 3) - ec * blk;
    w = Math.floor(el / blk);
    b = blk + w * blk - el;

    if ((-3 & ver) == -3 && el == enc.length) enc[w - 1] >>= 4;
    if (el >= enc.length) push(0, ver > 0 ? 4 : ver + 6);
    if (eb == 0 || el < enc.length) enc.pop();
    for (i = 236; el > enc.length; i ^= 236 ^ 17) enc.push((-3 & ver) == -3 && enc.length == el - 1 ? 0 : i);

    var rs = new Array(ec + 1);
    var lg = new Array(256), ex = new Array(255);
    for (j = 1, i = 0; i < 255; i++) {
        ex[i] = j; lg[j] = i;
        j += j; if (j > 255) j ^= 285;
    }
    for (i = 0, rs[0] = 1; i < ec; i++) {
        for (j = i + 1, rs[j] = 0; j > 0; j--) rs[j] ^= ex[(lg[rs[j - 1]] + i) % 255];
    }
    for (i = 0; i <= ec * blk; i++) enc.push(0);
    for (k = c = 0, eb = el; c < blk; c++, eb += ec) {
        for (i = c < b ? w : w + 1; i-- > 0; k++) {
            for (j = 0, x = enc[eb] ^ enc[k]; j++ < ec;) {
                enc[eb + j - 1] = enc[eb + j] ^ (x ? ex[(lg[rs[j]] + lg[x]) % 255] : 0);
            }
        }
    }

    var matrixQr = Array(size).fill(null).map(() => []);
    function set(x, y, pat) {
        for (var i = 0; i < pat.length; i++) {
            for (var p = pat[i], j = 0; 1 << j <= pat[0]; j++, p >>= 1) {
                matrixQr[y + i][x + j] = (p & 1) | 2;
            }
        }
    }
    c = ver < 1 ? 0 : 6;
    for (i = 8; i < size; i++) matrixQr[c][i] = matrixQr[i][c] = (i & 1) ^ 3;
    set(0, 0, [383, 321, 349, 349, 349, 321, 383, 256, 511]);
    if (ver > 0) {
        set(0, size - 8, [256, 383, 321, 349, 349, 349, 321, 383]);
        set(size - 8, 0, [254, 130, 186, 186, 186, 130, 254, 0, 255]);
        c = ((((ver + 1) / (1 - align)) * 4) & -2);
        for (x = 0; x < align; x++) {
            for (y = 0; y < align; y++) {
                if ((x > 0 && y > 0) || (x != y && x + y != align - 1)) {
                    set(
                        x == 0 ? 4 : size - 9 + c * (align - 1 - x),
                        y == 0 ? 4 : size - 9 + c * (align - 1 - y),
                        [31, 17, 21, 17, 31]
                    );
                }
            }
        }
        if (ver > 6) {
            for (i = 0; i < 18; i++) {
                matrixQr[size + (i % 3) - 11][(i / 3) | 0] = matrixQr[(i / 3) | 0][size + (i % 3) - 11] = 2;
            }
        }
    }

    y = x = size - 1;
    for (i = 0; i < eb; i++) {
        c = k = 0; j = w + 1;
        if (i >= el) { c = k = el; j = ec; }
        else if (i + blk - b >= el) c = k = -b;
        else if (i % blk >= b) c = -b;
        else j--;
        c = enc[c + ((i - k) % blk) * j + (((i - k) / blk) | 0)];
        for (j = (-3 & ver) == -3 && i == el - 1 ? 8 : 128; j > 0; j >>= 1) {
            if (c & j) matrixQr[y][x] = 1;
            k = ver > 0 && x < 6 ? 1 : 0;
            do {
                if ((1 & x--) ^ k) {
                    if ((size - x - k) & 2) { if (y > 0) y--; else continue; }
                    else { if (y < size - 1) y++; else continue; }
                    x += 2;
                }
            } while (matrixQr[y][x] & 2);
        }
    }

    var get = [
        function (x, y) { return (((x + y) | (matrixQr[y][x] >> 1)) ^ matrixQr[y][x]) & 1 ^ 1; },
        function (x, y) { return ((y | (matrixQr[y][x] >> 1)) ^ matrixQr[y][x]) & 1 ^ 1; },
        function (x, y) { return (((x % 3 > 0) | (matrixQr[y][x] >> 1)) ^ matrixQr[y][x]) & 1 ^ 1; },
        function (x, y) { return ((((x + y) % 3 > 0) | (matrixQr[y][x] >> 1)) ^ matrixQr[y][x]) & 1 ^ 1; },
        function (x, y) { return ((((x / 3) + (y >> 1)) | (matrixQr[y][x] >> 1)) ^ matrixQr[y][x]) & 1 ^ 1; },
        function (x, y) { return (((((x * y) & 1) + ((x * y) % 3) > 0) | (matrixQr[y][x] >> 1)) ^ matrixQr[y][x]) & 1 ^ 1; },
        function (x, y) { return ((((x * y) + ((x * y) % 3)) | (matrixQr[y][x] >> 1)) ^ matrixQr[y][x]) & 1 ^ 1; },
        function (x, y) { return ((((x + y) + ((x * y) % 3)) | (matrixQr[y][x] >> 1)) ^ matrixQr[y][x]) & 1 ^ 1; }
    ];
    if (ver < 1) get = [get[1], get[4], get[6], get[7]];
    var msk, pen = 30000, p;
    for (var m = 0; m < get.length; m++) {
        x = y = p = d = 0;
        if (ver < 1) {
            for (i = 1; i < size; i++) {
                x -= get[m](i, size - 1);
                y -= get[m](size - 1, i);
            }
            p = x > y ? 16 * x + y : x + 16 * y;
        } else {
            [
                [[1, 1, 1, 1, 1]], [[0, 0, 0, 0, 0]],
                [[1, 1], [1, 1]], [[0, 0], [0, 0]],
                [[1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0]], [[0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1]],
                [[1]]
            ].forEach(function (pat, pi) {
                for (p += d, d = y = 0; y + pat.length <= size; y++) {
                    var add = [3, 3, 40, 1, 3, 0, 40, 0];
                    for (x = 0; x + pat[0].length <= size; x++) {
                        i = j = 1;
                        for (var py = 0; py < pat.length; py++) {
                            for (var px = 0; px < pat[py].length; px++) {
                                if (get[m](x + px, y + py) != pat[py][px]) i = 0;
                                if (get[m](y + py, x + px) != pat[py][px]) j = 0;
                            }
                        }
                        d += add[pi >> 1] * i + add[(pi >> 1) | 4] * j;
                        add[0] = 3 - 2 * i; add[4] = 3 - 2 * j;
                    }
                }
            });
            p += Math.floor(Math.abs(10 - (20 * d) / (size * size))) * 10;
        }
        if (p < pen) { pen = p; msk = m; }
    }
    for (y = 0; y < size; y++) {
        for (x = 0; x < size; x++) matrixQr[y][x] = get[msk](x, y);
    }

    j = ver == -3 ? msk : ver < 1 ? (2 * ver + lev + 5) * 4 + msk : ((5 - lev) & 3) * 8 + msk;
    for (k = j *= 1024, i = 4; i >= 0; i--) {
        if (j >= 1024 << i) j ^= 1335 << i;
    }
    k ^= j ^ (ver < 1 ? 17477 : 21522);
    for (j = 0; j < 15; j++, k >>= 1) {
        if (ver < 1) matrixQr[j < 8 ? j + 1 : 8][j < 8 ? 8 : 15 - j] = k & 1;
        else matrixQr[8][j < 8 ? size - j - 1 : j == 8 ? 7 : 14 - j] = matrixQr[j < 6 ? j : j < 8 ? j + 1 : size + j - 15][8] = k & 1;
    }
    for (k = ver * 4096, i = 5; i >= 0; i--) {
        if (k >= 4096 << i) k ^= 7973 << i;
    }
    if (ver > 6) {
        for (k ^= ver * 4096, j = 0; j < 18; j++, k >>= 1) {
            matrixQr[size + (j % 3) - 11][(j / 3) | 0] = matrixQr[(j / 3) | 0][size + (j % 3) - 11] = k & 1;
        }
    }

    return matrixQr;
}

/* ============================================================
 * PNG helpers (unchanged core, still zero-dependency)
 * ============================================================ */

function hexToRgb(hex) {
    const bigint = parseInt(hex.replace('#', ''), 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function decodeRawPng(pngBuffer) {
    const PNG_SIGNATURE = Buffer.from([
        137, 80, 78, 71, 13, 10, 26, 10
    ]);

    if (!pngBuffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
        throw new Error('Invalid PNG signature');
    }

    let offset = 8;

    let width = 0;
    let height = 0;
    let bitDepth = 0;
    let colorType = 0;
    let compression = 0;
    let filterMethod = 0;
    let interlace = 0;

    const idatBuffers = [];

    while (offset < pngBuffer.length) {
        if (offset + 8 > pngBuffer.length) {
            throw new Error('Invalid PNG chunk');
        }

        const length = pngBuffer.readUInt32BE(offset);
        const type = pngBuffer.toString('ascii', offset + 4, offset + 8);

        const dataStart = offset + 8;
        const dataEnd = dataStart + length;

        if (dataEnd + 4 > pngBuffer.length) {
            throw new Error(`Invalid PNG ${type} chunk`);
        }

        const data = pngBuffer.subarray(dataStart, dataEnd);

        if (type === 'IHDR') {
            width = data.readUInt32BE(0);
            height = data.readUInt32BE(4);
            bitDepth = data[8];
            colorType = data[9];
            compression = data[10];
            filterMethod = data[11];
            interlace = data[12];
        } else if (type === 'IDAT') {
            idatBuffers.push(data);
        } else if (type === 'IEND') {
            break;
        }

        offset = dataEnd + 4;
    }

    if (!width || !height) {
        throw new Error('PNG has no valid dimensions');
    }

    // This renderer expects 8-bit RGBA PNG.
    if (bitDepth !== 8) {
        throw new Error(
            `Unsupported PNG bit depth: ${bitDepth}. Expected 8.`
        );
    }

    if (colorType !== 6) {
        throw new Error(
            `Unsupported PNG color type: ${colorType}. Expected RGBA (6).`
        );
    }

    if (compression !== 0 || filterMethod !== 0) {
        throw new Error('Unsupported PNG compression/filter method');
    }

    if (interlace !== 0) {
        throw new Error(
            'Interlaced PNG is not supported. Please save logo.png as non-interlaced PNG.'
        );
    }

    const compressed = Buffer.concat(idatBuffers);
    const decompressed = customInflateSync(compressed);

    // RGBA = 4 bytes per pixel
    const bytesPerPixel = 4;
    const scanlineLength = width * bytesPerPixel;
    const lineSize = scanlineLength + 1;

    if (decompressed.length < height * lineSize) {
        throw new Error('PNG image data is incomplete');
    }

    const rgbaBuffer = Buffer.alloc(width * height * 4);

    function paethPredictor(a, b, c) {
        const p = a + b - c;

        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);

        if (pa <= pb && pa <= pc) {
            return a;
        }

        if (pb <= pc) {
            return b;
        }

        return c;
    }

    for (let y = 0; y < height; y++) {
        const filter = decompressed[y * lineSize];

        const srcRow = y * lineSize + 1;
        const destRow = y * width * 4;

        const previousRow =
            y > 0
                ? (y - 1) * width * 4
                : -1;

        for (let x = 0; x < scanlineLength; x++) {
            const raw = decompressed[srcRow + x];

            const left =
                x >= bytesPerPixel
                    ? rgbaBuffer[destRow + x - bytesPerPixel]
                    : 0;

            const up =
                y > 0
                    ? rgbaBuffer[previousRow + x]
                    : 0;

            const upperLeft =
                y > 0 && x >= bytesPerPixel
                    ? rgbaBuffer[previousRow + x - bytesPerPixel]
                    : 0;

            let value;

            switch (filter) {
                // Filter 0: None
                case 0:
                    value = raw;
                    break;

                // Filter 1: Sub
                case 1:
                    value = (raw + left) & 255;
                    break;

                // Filter 2: Up
                case 2:
                    value = (raw + up) & 255;
                    break;

                // Filter 3: Average
                case 3:
                    value =
                        (raw + Math.floor((left + up) / 2)) & 255;
                    break;

                // Filter 4: Paeth
                case 4:
                    value =
                        (raw + paethPredictor(left, up, upperLeft)) & 255;
                    break;

                default:
                    throw new Error(
                        `Unsupported PNG filter type: ${filter}`
                    );
            }

            rgbaBuffer[destRow + x] = value;
        }
    }

    return {
        width,
        height,
        data: rgbaBuffer
    };
}

function crc32(buf) {
    let c = ~0;
    for (let i = 0; i < buf.length; i++) {
        c ^= buf[i];
        for (let k = 0; k < 8; k++) {
            c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
        }
    }
    return ~c;
}

function createChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crcVal = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeInt32BE(crcVal, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function canvasToPngBuffer(canvas, width, height) {
    const lineSize = 1 + width * 3;
    const rawData = Buffer.alloc(height * lineSize);

    for (let y = 0; y < height; y++) {
        const rowOffset = y * lineSize;
        rawData[rowOffset] = 0; // filter: none
        const row = canvas[y];
        for (let x = 0; x < width; x++) {
            const p = rowOffset + 1 + x * 3;
            const col = row[x];
            rawData[p] = col[0];
            rawData[p + 1] = col[1];
            rawData[p + 2] = col[2];
        }
    }

    const compressedData = customDeflateSync(rawData);
    const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = 2;

    return Buffer.concat([
        sig,
        createChunk('IHDR', ihdr),
        createChunk('IDAT', compressedData),
        createChunk('IEND', Buffer.alloc(0))
    ]);
}

/* ============================================================
 * Vector-style rasterizer: dot modules + rounded "eyes" + logo
 * ============================================================ */

function makeCanvas(width, height, fillColor) {
    const canvas = new Array(height);
    for (let y = 0; y < height; y++) {
        const row = new Array(width);
        for (let x = 0; x < width; x++) row[x] = fillColor;
        canvas[y] = row;
    }
    return canvas;
}

function setPixel(canvas, width, height, x, y, color) {
    x = x | 0; y = y | 0;
    if (x >= 0 && x < width && y >= 0 && y < height) canvas[y][x] = color;
}

function fillCircle(canvas, width, height, cx, cy, radius, color) {
    const r2 = radius * radius;
    const minY = Math.max(0, Math.floor(cy - radius));
    const maxY = Math.min(height - 1, Math.ceil(cy + radius));
    const minX = Math.max(0, Math.floor(cx - radius));
    const maxX = Math.min(width - 1, Math.ceil(cx + radius));
    for (let y = minY; y <= maxY; y++) {
        const dy = y + 0.5 - cy;
        for (let x = minX; x <= maxX; x++) {
            const dx = x + 0.5 - cx;
            if (dx * dx + dy * dy <= r2) canvas[y][x] = color;
        }
    }
}

// Axis-aligned rounded rectangle, corners clipped by quarter-circles of `radius`.
function fillRoundedRect(canvas, width, height, x0, y0, w, h, radius, color) {
    radius = Math.max(0, Math.min(radius, w / 2, h / 2));
    const minY = Math.max(0, Math.floor(y0));
    const maxY = Math.min(height - 1, Math.ceil(y0 + h) - 1);
    const minX = Math.max(0, Math.floor(x0));
    const maxX = Math.min(width - 1, Math.ceil(x0 + w) - 1);

    for (let y = minY; y <= maxY; y++) {
        const ly = y + 0.5 - y0;
        for (let x = minX; x <= maxX; x++) {
            const lx = x + 0.5 - x0;
            let inside = true;

            if (lx < radius && ly < radius) {
                const dx = radius - lx, dy = radius - ly;
                inside = dx * dx + dy * dy <= radius * radius;
            } else if (lx > w - radius && ly < radius) {
                const dx = lx - (w - radius), dy = radius - ly;
                inside = dx * dx + dy * dy <= radius * radius;
            } else if (lx < radius && ly > h - radius) {
                const dx = radius - lx, dy = ly - (h - radius);
                inside = dx * dx + dy * dy <= radius * radius;
            } else if (lx > w - radius && ly > h - radius) {
                const dx = lx - (w - radius), dy = ly - (h - radius);
                inside = dx * dx + dy * dy <= radius * radius;
            }

            if (inside) canvas[y][x] = color;
        }
    }
}

// Returns true if module (mx,my) falls inside one of the three 7x7 finder
// ("eye") blocks, which are always in the same fixed corners for every version.
function isInFinderBlock(mx, my, matrixSize) {
    const blocks = [
        [0, 0], [0, matrixSize - 7], [matrixSize - 7, 0]
    ];
    for (const [bx, by] of blocks) {
        if (mx >= bx && mx < bx + 7 && my >= by && my < by + 7) return true;
    }
    return false;
}

function drawFinderEye(canvas, width, height, pxX, pxY, cellSize, qrColor, bgColor) {
    const outerSize = 7 * cellSize;
    const outerRadius = cellSize * 2.1;
    fillRoundedRect(canvas, width, height, pxX, pxY, outerSize, outerSize, outerRadius, qrColor);

    const innerBgOffset = cellSize;
    const innerBgSize = 5 * cellSize;
    const innerBgRadius = cellSize * 1.6;
    fillRoundedRect(canvas, width, height, pxX + innerBgOffset, pxY + innerBgOffset, innerBgSize, innerBgSize, innerBgRadius, bgColor);

    const dotOffset = 2 * cellSize;
    const dotSize = 3 * cellSize;
    const dotRadius = cellSize * 1.55; // near-circular rounded square, matches reference style
    fillRoundedRect(canvas, width, height, pxX + dotOffset, pxY + dotOffset, dotSize, dotSize, dotRadius, qrColor);
}

/**
 * Renders a QR matrix as a styled PNG: circular "dot" data modules,
 * rounded-square finder eyes, and an optional logo sitting on a circular
 * backdrop in the center — matching common "styled QR" presets.
 */
function styledMatrixToPngBuffer(binaryMatrix, options = {}) {
    const scale = options.scale || 16;
    const border = options.border ?? 4;
    const qrColor = hexToRgb(options.qrColor || '#000000');
    const bgColor = hexToRgb(options.bgColor || '#ffffff');
    const borderColor = hexToRgb(options.borderColor || options.bgColor || '#ffffff');
    const dotScale = options.dotScale ?? 0.86; // fraction of a cell each data dot fills
    const logoSizeRatio = options.logoSizeRatio ?? 0.26; // logo diameter relative to QR width
    const logoPaddingRatio = options.logoPaddingRatio ?? 0.18; // white backdrop padding around logo

    const matrixSize = binaryMatrix.length;
    const borderPx = border * scale;
    const qrPx = matrixSize * scale;
    const width = qrPx + 2 * borderPx;
    const height = qrPx + 2 * borderPx;

    // 1. Base canvas: border color everywhere, then the bg color for the QR quiet zone + body.
    const canvas = makeCanvas(width, height, borderColor);
    fillRoundedRect(canvas, width, height, borderPx, borderPx, qrPx, qrPx, 0, bgColor);

    // 2. Data modules as dots (skip cells that belong to a finder eye — drawn separately below).
    const dotRadius = (scale * dotScale) / 2;
    for (let my = 0; my < matrixSize; my++) {
        for (let mx = 0; mx < matrixSize; mx++) {
            if (isInFinderBlock(mx, my, matrixSize)) continue;
            if (binaryMatrix[my][mx] !== 1) continue;
            const cx = borderPx + mx * scale + scale / 2;
            const cy = borderPx + my * scale + scale / 2;
            fillCircle(canvas, width, height, cx, cy, dotRadius, qrColor);
        }
    }

    // 3. The three finder eyes, drawn as clean rounded shapes (not per-module dots).
    const eyeOrigins = [
        [0, 0],
        [0, matrixSize - 7],
        [matrixSize - 7, 0]
    ];
    for (const [ex, ey] of eyeOrigins) {
        const pxX = borderPx + ex * scale;
        const pxY = borderPx + ey * scale;
        drawFinderEye(canvas, width, height, pxX, pxY, scale, qrColor, bgColor);
    }

    // 4. Optional logo, sitting on a circular backdrop in the center.
    let rawLogoBuf = null;
    if (options.logo) {
        if (Buffer.isBuffer(options.logo) || options.logo instanceof Uint8Array || Array.isArray(options.logo)) {
            rawLogoBuf = Buffer.from(options.logo);
        } else if (typeof options.logo === 'string') {
            if (fs.existsSync(options.logo)) {
                rawLogoBuf = fs.readFileSync(options.logo);
            }
        }
    } else if (options.logoPath && typeof options.logoPath === 'string') {
        if (fs.existsSync(options.logoPath)) {
            rawLogoBuf = fs.readFileSync(options.logoPath);
        }
    }

    if (rawLogoBuf) {
        const logo = decodeRawPng(rawLogoBuf);

        const targetDiameter = qrPx * logoSizeRatio;
        const scaleFactor = targetDiameter / Math.max(logo.width, logo.height);
        const drawW = Math.round(logo.width * scaleFactor);
        const drawH = Math.round(logo.height * scaleFactor);

        const cx = width / 2;
        const cy = height / 2;
        const backdropRadius = (Math.max(drawW, drawH) / 2) * (1 + logoPaddingRatio);

        fillCircle(canvas, width, height, cx, cy, backdropRadius, bgColor);

        const logoX0 = Math.round(cx - drawW / 2);
        const logoY0 = Math.round(cy - drawH / 2);
        const clipR2 = backdropRadius * backdropRadius;

        for (let y = 0; y < drawH; y++) {
            const srcY = Math.min(logo.height - 1, Math.floor(y / scaleFactor));
            for (let x = 0; x < drawW; x++) {
                const srcX = Math.min(logo.width - 1, Math.floor(x / scaleFactor));
                const idx = (srcY * logo.width + srcX) * 4;
                const alpha = logo.data[idx + 3] / 255;
                if (alpha <= 0) continue;

                const destX = logoX0 + x;
                const destY = logoY0 + y;
                const dx = destX + 0.5 - cx, dy = destY + 0.5 - cy;
                if (dx * dx + dy * dy > clipR2) continue;

                const bg = canvas[destY] && canvas[destY][destX] ? canvas[destY][destX] : bgColor;
                const r = Math.round(logo.data[idx] * alpha + bg[0] * (1 - alpha));
                const g = Math.round(logo.data[idx + 1] * alpha + bg[1] * (1 - alpha));
                const b = Math.round(logo.data[idx + 2] * alpha + bg[2] * (1 - alpha));
                setPixel(canvas, width, height, destX, destY, [r, g, b]);
            }
        }
    }

    return canvasToPngBuffer(canvas, width, height);
}

/* ============================================================
 * Contrast safety check
 * ============================================================ */

function relativeLuminance([r, g, b]) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

// Bright/pastel foreground colors (a common ask for "branded" QR codes) look
// fine on screen but quietly break real scanners, because QR decoders binarize
// on luminance, not hue — a vivid green or yellow can read almost as light as
// white. This doesn't block generation, it just warns so a bad color choice
// doesn't ship as a QR nobody can scan.
function warnIfLowContrast(qrColor, bgColor) {
    const fg = relativeLuminance(hexToRgb(qrColor));
    const bg = relativeLuminance(hexToRgb(bgColor));
    const gap = bg - fg;
    if (fg > 140 || gap < 100) {
        console.warn(
            `[qr-styled] Low contrast: qrColor ${qrColor} (luminance ${fg.toFixed(0)}) is too close to ` +
            `bgColor ${bgColor} (luminance ${bg.toFixed(0)}) for reliable scanning. ` +
            `Aim for a foreground luminance under ~140 and at least ~100 less than the background ` +
            `— e.g. darken the color (try mixing in some black) rather than using it at full brightness.`
        );
    }
}

/* ============================================================
 * Main entry point
 * ============================================================ */

function generateQrPngWithLogo(text, options = {}) {
    const hasLogo = !!(options.logo || options.logoPath);
    const level = options.level || (hasLogo ? 'H' : 'Q');
    warnIfLowContrast(options.qrColor || '#000000', options.bgColor || '#ffffff');
    // IMPORTANT: quickresponse() auto-selects the smallest QR version that fits
    // the given text + error-correction level, and it only recomputes its
    // internal bit-length tables at version thresholds (1, 10, 27). Forcing an
    // arbitrary starting version here can skip that recompute step and silently
    // produce a corrupt (empty-data) symbol that *looks* like a QR code but
    // will not scan. So we always let it auto-size from scratch — if you need
    // more room for a logo, raise the error-correction level instead (done
    // above) or pass a longer/shorter `text`.
    const binaryMatrix = quickresponse(text, level);
    if (!binaryMatrix.length) {
        throw new Error('Could not encode text (it may be too long for a QR code at this error-correction level).');
    }
    const pngBuffer = styledMatrixToPngBuffer(binaryMatrix, options);

    const outPath = options.outputPath || options.output;
    if (outPath && typeof outPath === 'string') {
        fs.writeFileSync(outPath, pngBuffer);
    }

    return pngBuffer;
}

module.exports = { generateQrPngWithLogo, quickresponse, styledMatrixToPngBuffer };
