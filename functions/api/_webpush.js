/* Hand-implemented Web Push (RFC 8291 message encryption + VAPID JWT signing)
   using only the Web Crypto API already available in the Workers runtime — there
   is no npm 'web-push' package usable here, so this replaces it. */

function b64urlToBytes(b64url) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64url.length + 3) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
function bytesToB64url(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function strToBytes(str) {
  return new TextEncoder().encode(str);
}
function concatBytes(...arrs) {
  const len = arrs.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(len);
  let offset = 0;
  for (const a of arrs) { out.set(a, offset); offset += a.length; }
  return out;
}

/* Combined HKDF-Extract-then-Expand, matching how Web Crypto's HKDF works when
   given (salt, keyMaterial, info, length) — this is exactly the two-stage HKDF
   construction RFC 8291 / RFC 8188 call for at each step. */
async function hkdf(saltBytes, ikmBytes, infoBytes, lengthBytes) {
  const key = await crypto.subtle.importKey("raw", ikmBytes, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: saltBytes, info: infoBytes },
    key,
    lengthBytes * 8
  );
  return new Uint8Array(bits);
}

/* RFC 8291 message encryption: derives a per-message key from the subscriber's
   p256dh public key + auth secret, an ephemeral key pair we generate fresh for
   every message, and a random salt — then AES-128-GCM encrypts the JSON payload
   in the single "aes128gcm" content-coding record format the Push API expects. */
async function encryptPayload(payloadObj, p256dhB64url, authB64url) {
  const receiverPublicKeyRaw = b64urlToBytes(p256dhB64url); // 65 bytes, uncompressed EC point
  const authSecret = b64urlToBytes(authB64url); // 16 bytes

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const ephemeralKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]
  );
  const asPublicRaw = new Uint8Array(await crypto.subtle.exportKey("raw", ephemeralKeyPair.publicKey));

  const receiverPublicKey = await crypto.subtle.importKey(
    "raw", receiverPublicKeyRaw, { name: "ECDH", namedCurve: "P-256" }, false, []
  );
  const ecdhSecretBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: receiverPublicKey }, ephemeralKeyPair.privateKey, 256
  );
  const ecdhSecret = new Uint8Array(ecdhSecretBits);

  const infoIkm = concatBytes(strToBytes("WebPush: info\0"), receiverPublicKeyRaw, asPublicRaw);
  const ikm = await hkdf(authSecret, ecdhSecret, infoIkm, 32);

  const cek = await hkdf(salt, ikm, strToBytes("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, strToBytes("Content-Encoding: nonce\0"), 12);

  const plaintext = strToBytes(JSON.stringify(payloadObj));
  const padded = concatBytes(plaintext, new Uint8Array([2])); // RFC 8188 "last record" delimiter

  const cekKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ciphertextBits = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce, tagLength: 128 }, cekKey, padded
  );
  const ciphertext = new Uint8Array(ciphertextBits);

  const rsBytes = new Uint8Array(4);
  new DataView(rsBytes.buffer).setUint32(0, 4096); // record size
  const idlen = new Uint8Array([asPublicRaw.length]); // 65

  return concatBytes(salt, rsBytes, idlen, asPublicRaw, ciphertext);
}

/* One short-lived signed JWT proving these messages come from the app's own
   VAPID identity, as every push service requires. */
async function createVapidJWT(audience, subject, privateJwk) {
  const header = { typ: "JWT", alg: "ES256" };
  const payload = { aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject };
  const headerB64 = bytesToB64url(strToBytes(JSON.stringify(header)));
  const payloadB64 = bytesToB64url(strToBytes(JSON.stringify(payload)));
  const signingInput = headerB64 + "." + payloadB64;

  const key = await crypto.subtle.importKey(
    "jwk", privateJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]
  );
  const sigBits = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, strToBytes(signingInput));
  const sigB64 = bytesToB64url(new Uint8Array(sigBits)); // Web Crypto already returns raw r||s, which is what JWS ES256 needs

  return signingInput + "." + sigB64;
}

/* Sends one push message to one subscription. Returns {ok, statusCode, stale}
   — "stale" means the push service reported this subscription no longer exists
   (404/410), so the caller should delete it from D1. */
export async function sendWebPush(env, subscription, payloadObj) {
  const endpoint = subscription.endpoint;
  const audience = new URL(endpoint).origin;
  const privateJwk = JSON.parse(env.VAPID_PRIVATE_JWK);

  const jwt = await createVapidJWT(audience, env.VAPID_SUBJECT, privateJwk);
  const body = await encryptPayload(payloadObj, subscription.p256dh, subscription.auth);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      "TTL": "86400",
      "Authorization": `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`
    },
    body
  });

  return { ok: res.ok, statusCode: res.status, stale: res.status === 404 || res.status === 410 };
}
