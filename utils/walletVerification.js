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
    for (const char of value) { if (char === "1") bytes.push(0); else break; }
    return Buffer.from(bytes.reverse());
}

function signatureIsValid(message, address, signature) {
    const publicKey = decodeBase58(address);
    const signatureBytes = Buffer.from(signature, "base64");
    if (publicKey.length !== 32 || signatureBytes.length !== 64) return false;
    const key = crypto.createPublicKey({
        key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), publicKey]),
        format: "der", type: "spki"
    });
    return crypto.verify(null, Buffer.from(message, "utf8"), key, signatureBytes);
}

function verificationMessage(session) {
    return `Verify this wallet for Discord server ${config.guildId}.\nNonce: ${session.nonce}\nThis request is free and does not authorize a transaction.`;
}

function page(token, message) {
    const safeToken = JSON.stringify(token);
    const safeMessage = JSON.stringify(message);
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hhcwm3000 Fomo — Wallet Verification</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:Inter,ui-sans-serif,system-ui;background:#09090f;color:#f8fafc;display:grid;place-items:center;padding:24px;background-image:radial-gradient(circle at 18% 5%,#5134a344,transparent 26rem),radial-gradient(circle at 90% 95%,#00ffa833,transparent 24rem)}
.shell{width:min(560px,100%);border:1px solid #ffffff1a;border-radius:24px;padding:1px;background:linear-gradient(135deg,#a855f7aa,#22d3ee55,#ffffff0b);box-shadow:0 24px 80px #0008}.card{padding:34px;border-radius:23px;background:#11111bd9}.brand{display:flex;align-items:center;gap:10px;font-weight:800;color:#d8b4fe}.mark{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:linear-gradient(135deg,#a855f7,#4f46e5)}h1{font-size:30px;letter-spacing:-.8px;margin:22px 0 10px}p{line-height:1.55;color:#cbd5e1}.safe{display:flex;gap:12px;margin:24px 0;padding:16px;border:1px solid #2dd4bf44;border-radius:14px;background:#0d282744}.safe strong{display:block;color:#5eead4}.safe span{font-size:13px;color:#b6d7d4}.steps{display:grid;gap:10px;margin:24px 0}.step{display:flex;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid #ffffff0e}.number{color:#c4b5fd;font-weight:800}button{width:100%;border:0;border-radius:14px;padding:15px 18px;background:linear-gradient(90deg,#8b5cf6,#6366f1);color:white;font-size:16px;font-weight:800;cursor:pointer;box-shadow:0 8px 24px #6d28d955}button:disabled{opacity:.65;cursor:wait}#status{min-height:24px;margin:16px 0 0;text-align:center;font-weight:650}.fine{font-size:12px;text-align:center;color:#94a3b8;margin-top:20px}
</style></head><body><section class="shell"><main class="card"><div class="brand"><span class="mark">◎</span><span>HHCWM3000 FOMO</span></div><h1>Verify your Solana wallet</h1><p>Prove that you own a wallet and unlock your Discord role. This is a one-time, free signature.</p><div class="safe"><div>🛡️</div><div><strong>Your wallet stays safe</strong><span>We never ask for seed phrases, private keys, wallet exports, or a transaction.</span></div></div><div class="steps"><div class="step"><b class="number">01</b><span>Connect your Phantom wallet</span></div><div class="step"><b class="number">02</b><span>Review and sign a verification message</span></div><div class="step"><b class="number">03</b><span>Receive your Discord wallet role automatically</span></div></div><button id="verify">Connect Phantom & Verify</button><div id="status"></div><div class="fine">This request does not transfer funds or grant wallet access.</div></main></section><script>
const token=${safeToken};const message=${safeMessage};const button=document.querySelector('#verify');const status=document.querySelector('#status');
button.onclick=async()=>{try{const provider=window.phantom&&window.phantom.solana;if(!provider||!provider.isPhantom)throw new Error('Phantom was not found. Open this page in Phantom or install the Phantom extension.');button.disabled=true;button.textContent='Connecting wallet…';const response=await provider.connect();button.textContent='Sign verification message…';const signed=await provider.signMessage(new TextEncoder().encode(message),'utf8');const signature=btoa(String.fromCharCode(...signed.signature));button.textContent='Verifying…';const result=await fetch('/wallet/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token,address:response.publicKey.toString(),signature})});const body=await result.json();if(!result.ok)throw new Error(body.error);button.textContent='Verified';status.textContent='✅ Wallet verified — check Discord for your role and confirmation.';}catch(error){button.disabled=false;button.textContent='Try again';status.textContent='❌ '+error.message;}};
</script></body></html>`;
}

function createVerificationSession(userId) {
    const token = crypto.randomBytes(24).toString("base64url");
    const nonce = crypto.randomBytes(24).toString("base64url");
    db.prepare("DELETE FROM wallet_verification_sessions WHERE expiresAt < ?").run(Date.now());
    db.prepare("INSERT INTO wallet_verification_sessions (token, userId, nonce, expiresAt) VALUES (?, ?, ?, ?)").run(token, userId, nonce, Date.now() + 10 * 60 * 1000);
    return token;
}

function startWalletVerificationServer(client) {
    const server = http.createServer(async (request, response) => {
        const url = new URL(request.url, "http://localhost");
        if (request.method === "GET" && url.pathname.startsWith("/wallet/")) {
            const token = url.pathname.split("/").pop();
            const session = db.prepare("SELECT * FROM wallet_verification_sessions WHERE token = ? AND expiresAt > ?").get(token, Date.now());
            response.writeHead(session ? 200 : 404, { "content-type": "text/html; charset=utf-8" });
            return response.end(session ? page(token, verificationMessage(session)) : "Verification link expired. Return to Discord and run /verifywallet again.");
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
                    try { await member.send(`✅ Your Solana wallet was verified successfully. You now have the wallet-verified role in **Hhcwm3000 Fomo**.`); } catch (error) { console.warn("Wallet verified, but the confirmation DM could not be sent.", error.message); }
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
