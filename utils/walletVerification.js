const http = require("http");
const crypto = require("crypto");
const db = require("../database/db");
const config = require("../config");

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function decodeBase58(value) {
    const bytes = [0];
    for (const char of value) {
        const number = BASE58.indexOf(char);
        if (number < 0) throw new Error("Invalid wallet address.");
        let carry = number;
        for (let index = 0; index < bytes.length; index++) {
            carry += bytes[index] * 58;
            bytes[index] = carry & 255;
            carry >>= 8;
        }
        while (carry) { bytes.push(carry & 255); carry >>= 8; }
    }
    for (const char of value) {
        if (char !== "1") break;
        bytes.push(0);
    }
    return Buffer.from(bytes.reverse());
}

function signatureIsValid(message, address, signature) {
    const publicKey = decodeBase58(address);
    if (publicKey.length !== 32) return false;
    const signatureBytes = Buffer.from(signature, "base64");
    if (signatureBytes.length !== 64) return false;
    const spkiPrefix = Buffer.from("302a300506032b6570032100", "hex");
    const key = crypto.createPublicKey({
        key: Buffer.concat([spkiPrefix, publicKey]), format: "der", type: "spki"
    });
    return crypto.verify(null, Buffer.from(message, "utf8"), key, signatureBytes);
}

function verificationMessage(session) {
    return `Verify this wallet for Discord server ${config.guildId}.\nNonce: ${session.nonce}\nThis request is free and does not authorize a transaction.`;
}

function page(token, message) {
    return `<!doctype html><html><head><meta charset="utf-8"><title>Verify Solana Wallet</title><style>body{font-family:system-ui;background:#111827;color:#fff;display:grid;place-items:center;min-height:90vh}.card{max-width:460px;padding:32px;border:1px solid #7c3aed;border-radius:16px;background:#1f2937}button{background:#7c3aed;color:#fff;border:0;border-radius:8px;padding:12px 18px;font-weight:700;cursor:pointer}small{color:#cbd5e1}</style></head><body><main class="card"><h1>💜 Verify Solana Wallet</h1><p>Connect Phantom and sign a free verification message. Never enter a seed phrase or private key.</p><button id="verify">Connect Phantom & Verify</button><p id="status"></p><small>${message}</small></main><script>const token=${JSON.stringify(token)};const message=${JSON.stringify(message)};document.querySelector('#verify').onclick=async()=>{const status=document.querySelector('#status');try{const provider=window.phantom&&window.phantom.solana;if(!provider||!provider.isPhantom)throw new Error('Phantom wallet was not found. Open this link in Phantom or install the extension.');status.textContent='Connecting wallet…';const response=await provider.connect();const signed=await provider.signMessage(new TextEncoder().encode(message),'utf8');const signature=btoa(String.fromCharCode(...signed.signature));status.textContent='Verifying…';const result=await fetch('/wallet/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token,address:response.publicKey.toString(),signature})});const body=await result.json();if(!result.ok)throw new Error(body.error);status.textContent='✅ Verified! You can return to Discord.';}catch(error){status.textContent='❌ '+error.message;}}</script></body></html>`;
}

function createVerificationSession(userId) {
    const token = crypto.randomBytes(24).toString("base64url");
    const nonce = crypto.randomBytes(24).toString("base64url");
    db.prepare("DELETE FROM wallet_verification_sessions WHERE expiresAt < ?").run(Date.now());
    db.prepare("INSERT INTO wallet_verification_sessions (token, userId, nonce, expiresAt) VALUES (?, ?, ?, ?)")
        .run(token, userId, nonce, Date.now() + 10 * 60 * 1000);
    return token;
}

function startWalletVerificationServer(client) {
    const server = http.createServer(async (request, response) => {
        const url = new URL(request.url, "http://localhost");
        if (request.method === "GET" && url.pathname.startsWith("/wallet/")) {
            const token = url.pathname.split("/").pop();
            const session = db.prepare("SELECT * FROM wallet_verification_sessions WHERE token = ? AND expiresAt > ?").get(token, Date.now());
            response.writeHead(session ? 200 : 404, { "content-type": "text/html; charset=utf-8" });
            return response.end(session ? page(token, verificationMessage(session)) : "Verification link expired.");
        }
        if (request.method === "POST" && url.pathname === "/wallet/verify") {
            let data = "";
            request.on("data", chunk => { data += chunk; });
            request.on("end", async () => {
                try {
                    const { token, address, signature } = JSON.parse(data);
                    const session = db.prepare("SELECT * FROM wallet_verification_sessions WHERE token = ? AND expiresAt > ?").get(token, Date.now());
                    if (!session || !signatureIsValid(verificationMessage(session), address, signature)) throw new Error("Invalid or expired verification.");
                    db.prepare("INSERT INTO verified_wallets (userId, walletAddress, verifiedAt) VALUES (?, ?, ?) ON CONFLICT(userId) DO UPDATE SET walletAddress = excluded.walletAddress, verifiedAt = excluded.verifiedAt").run(session.userId, address, Date.now());
                    db.prepare("DELETE FROM wallet_verification_sessions WHERE token = ?").run(token);
                    const member = await client.guilds.cache.get(config.guildId)?.members.fetch(session.userId);
                    if (!member) throw new Error("Discord member not found.");
                    if (!process.env.WALLET_VERIFIED_ROLE_ID) throw new Error("Wallet role is not configured.");
                    await member.roles.add(process.env.WALLET_VERIFIED_ROLE_ID, "Wallet signature verified");
                    response.writeHead(200, { "content-type": "application/json" }); response.end(JSON.stringify({ ok: true }));
                } catch (error) { response.writeHead(400, { "content-type": "application/json" }); response.end(JSON.stringify({ error: error.message })); }
            });
            return;
        }
        response.writeHead(404); response.end();
    });
    server.listen(process.env.PORT || 3000, () => console.log("Wallet verification server started."));
}

module.exports = { createVerificationSession, startWalletVerificationServer };
