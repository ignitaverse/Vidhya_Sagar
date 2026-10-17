/*
sw.js - FEATURE (naya, maanga gaya): browser me video ke bytes 2 ghante
tak cache karta hai, taaki poori video dekh chuke ke baad beech me seek
karne par (ya dubara dekhne par) network se dobara maangna na pade.

Kaam kaise karta hai (chhote, GRID-aligned "chunks" mein):
  1. `<video>` tag jo bhi Range request karta hai, usko yahan intercept
     karte hain (sirf `/stream/` URLs ke liye - baaki sab bilkul normal).
  2. Request ko ek FIXED grid (GRID_BYTES) par align karte hain - jaise
     agar user byte 150 maange, hum poora chunk [0, GRID_BYTES-1] cache
     karte hain. Isse baad ke THODE-ALAG Range requests (jo browser khud
     internally karta rehta hai) bhi usi cached chunk se match ho jaate
     hain, na ki har baar naya cache-miss.
  3. Agar saare zaroori chunks cache me (aur 2 ghante se FRESH) hain, to
     SEEDHA wahi se jod kar jawab de dete hain - koi network call nahi.
  4. Nahi to, poora grid-aligned chunk NETWORK se ek hi baar maangte hain
     (chhota, browser-wala range nahi) - isi call se (a) abhi ka jawab
     bhi mil jaata hai, (b) aage ke liye cache bhi ho jaata hai.
  5. KISI BHI tarah ki galti/error par - seedha normal network fetch,
     kabhi bhi is cache ki wajah se video atakni/tootni nahi chahiye.

SAFETY: ye SW sirf APNE scope ke andar `/stream/` URLs ko hi chhuta hai.
Baaki har request bilkul normal, bina kisi badlaav ke, network tak jaati
hai. Agar kabhi kuch bhi anumaanit (unexpected) ho, hum turant plain
`fetch(request)` par gir jaate hain.
*/

const SW_CACHE_NAME = 'vs-video-cache-v1';
const SW_GRID_BYTES = 2 * 1024 * 1024; // 2MB — hit-rate aur re-fetch-waste ke beech balance
const SW_TTL_MS = 2 * 60 * 60 * 1000; // FEATURE: "2 ghante baad auto delete" — jaisa maanga gaya
const SW_MAX_LOOKUP_CHUNKS = 64; // ek saath itne se zyada chunks ka span ho to cache ka fayda nahi, seedha network

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

function _isStreamUrl(url) {
  try {
    return new URL(url).pathname.includes('/stream/');
  } catch (e) {
    return false;
  }
}

function _parseRange(header) {
  // "bytes=100-199" -> {start:100, end:199}; "bytes=100-" -> {start:100, end:null}
  if (!header) return null;
  const m = /^bytes=(\d+)-(\d*)$/.exec(String(header).trim());
  if (!m) return null;
  return { start: parseInt(m[1], 10), end: m[2] ? parseInt(m[2], 10) : null };
}

function _chunkKey(baseUrl, idx) {
  // Asli fetch URL se ALAG - sirf is EK cache ke andar is grid-chunk ki
  // internal pehchaan ke liye, kabhi network par nahi bhejा jaata.
  const sep = baseUrl.indexOf('?') === -1 ? '?' : '&';
  return baseUrl + sep + '__swchunk=' + idx;
}

// Ek 206 Partial-Content Response banata hai, diye gaye bytes se.
function _sliceResponse(bytes, rangeStart, rangeEnd, contentType, totalSize) {
  return new Response(bytes, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': contentType || 'application/octet-stream',
      'Content-Range': `bytes ${rangeStart}-${rangeEnd}/${totalSize || '*'}`,
      'Content-Length': String(bytes.byteLength != null ? bytes.byteLength : bytes.length),
      'Accept-Ranges': 'bytes',
    },
  });
}

async function _handleStreamRequest(event) {
  const req = event.request;
  try {
    const rangeHeader = req.headers.get('Range');
    const range = _parseRange(rangeHeader);
    // Range hi na ho, ya end na bataya gaya ho (browser kabhi-kabhi
    // "poori file se end tak" maangta hai) - itna bada span cache karne
    // ka fayda nahi, seedha (bina chhue) network.
    if (!range || range.end == null) return fetch(req);

    const baseUrl = req.url.split('#')[0];
    const firstChunk = Math.floor(range.start / SW_GRID_BYTES);
    const lastChunk = Math.floor(range.end / SW_GRID_BYTES);
    if (lastChunk - firstChunk + 1 > SW_MAX_LOOKUP_CHUNKS) return fetch(req);

    const cache = await caches.open(SW_CACHE_NAME);
    const now = Date.now();

    const found = [];
    for (let idx = firstChunk; idx <= lastChunk; idx++) {
      const cached = await cache.match(_chunkKey(baseUrl, idx));
      if (!cached) { found.push(null); continue; }
      const cachedAt = parseInt(cached.headers.get('X-SW-Cached-At') || '0', 10);
      if (!cachedAt || now - cachedAt > SW_TTL_MS) {
        // FEATURE: 2-ghante expiry - mila to stale nikla, turant hata do
        // (lazy eviction - agli baar poochhne par fir se fresh aayega).
        await cache.delete(_chunkKey(baseUrl, idx)).catch(() => {});
        found.push(null);
        continue;
      }
      found.push(cached);
    }

    if (found.every((c) => c !== null)) {
      // Poora cache-hit - koi network call nahi.
      const buffers = await Promise.all(found.map((c) => c.arrayBuffer()));
      let total = 0;
      for (const b of buffers) total += b.byteLength;
      const full = new Uint8Array(total);
      let off = 0;
      for (const b of buffers) { full.set(new Uint8Array(b), off); off += b.byteLength; }
      const localStart = range.start - firstChunk * SW_GRID_BYTES;
      const wantLen = range.end - range.start + 1;
      if (localStart < 0 || localStart + wantLen > full.length) return fetch(req); // safety: expected se kam mila, cache par bharosa mat karo
      const slice = full.slice(localStart, localStart + wantLen);
      const contentType = found[0].headers.get('X-SW-Content-Type') || undefined;
      const totalSize = found[0].headers.get('X-SW-Total-Size') || undefined;
      return _sliceResponse(slice, range.start, range.end, contentType, totalSize);
    }

    // Kam se kam ek chunk missing/stale - POORA grid-aligned span ek
    // hi network call se maangte hain (chhote browser-range ki jagah) -
    // isi se ABHI ka jawab bhi milega aur AAGE ke liye cache bhi hoga.
    const alignedStart = firstChunk * SW_GRID_BYTES;
    const alignedEnd = lastChunk * SW_GRID_BYTES + SW_GRID_BYTES - 1;
    const netHeaders = new Headers(req.headers);
    netHeaders.set('Range', `bytes=${alignedStart}-${alignedEnd}`);
    const netReq = new Request(req.url, { headers: netHeaders, mode: 'cors', credentials: 'omit' });

    let netResp;
    try {
      netResp = await fetch(netReq);
    } catch (e) {
      return fetch(req); // network khud fail - seedha ASLI (bina-badle) request try karo
    }
    if (!netResp.ok && netResp.status !== 206) return fetch(req); // server ne shayad aligned-range allow nahi kiya - safe fallback

    const contentType = netResp.headers.get('Content-Type') || 'application/octet-stream';
    const contentRange = netResp.headers.get('Content-Range') || '';
    const totalMatch = /\/(\d+|\*)\s*$/.exec(contentRange);
    const totalSize = totalMatch ? totalMatch[1] : '*';

    const buf = await netResp.arrayBuffer();

    // Server jitna de (file ke end tak kam bhi ho sakta hai) - usi
    // hisaab se grid-chunks banate hain, poora SW_GRID_BYTES na maan lo.
    const writes = [];
    let cursor = 0;
    let idx = firstChunk;
    while (cursor < buf.byteLength) {
      const take = Math.min(SW_GRID_BYTES, buf.byteLength - cursor);
      const chunkBuf = buf.slice(cursor, cursor + take);
      writes.push(
        cache
          .put(
            _chunkKey(baseUrl, idx),
            new Response(chunkBuf, {
              headers: {
                'X-SW-Cached-At': String(now),
                'X-SW-Content-Type': contentType,
                'X-SW-Total-Size': totalSize,
              },
            })
          )
          .catch(() => {}) // disk quota waghera - best-effort, kabhi fail na ho
      );
      cursor += take;
      idx++;
    }
    // Response turant bhej dete hain; cache-writes background mein hone
    // do - inke liye user ko rokte nahi.
    event.waitUntil(Promise.all(writes));

    const localStart = range.start - alignedStart;
    const wantLen = range.end - range.start + 1;
    const slice = buf.slice(localStart, Math.min(localStart + wantLen, buf.byteLength));
    return _sliceResponse(new Uint8Array(slice), range.start, range.start + slice.byteLength - 1, contentType, totalSize);
  } catch (err) {
    // KISI BHI anumaanit (unexpected) galti par - seedha plain network.
    // Video playback kabhi bhi is cache ki wajah se nahi tootni chahiye.
    return fetch(req);
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || !_isStreamUrl(req.url)) return; // sirf /stream/ GET requests - baaki sab untouched
  event.respondWith(_handleStreamRequest(event));
});
