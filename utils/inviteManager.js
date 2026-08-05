const db = require("../database/db");

async function getOrCreateInvite(member) {
    const existing = db.prepare(
        "SELECT * FROM users WHERE id = ?"
    ).get(member.id);

    if (existing && existing.inviteCode) {
        // Reclaim the correct logical owner after a restart or a migration.
        db.prepare(`
            UPDATE invites SET ownerId = ? WHERE code = ?
        `).run(member.id, existing.inviteCode);
        return existing.inviteCode;
    }

    const channel = member.guild.channels.cache.find(
        c =>
            c.type === 0 &&
            c.permissionsFor(member.guild.members.me)?.has("CreateInstantInvite")
    );

    if (!channel) {
        throw new Error("Kein Channel zum Erstellen von Invites gefunden.");
    }

    const invite = await channel.createInvite({
        maxAge: 0,
        maxUses: 0,
        unique: true,
        reason: `Persönlicher Invite für ${member.user.tag}`
    });

    if (existing) {
        db.prepare(
            "UPDATE users SET inviteCode = ? WHERE id = ?"
        ).run(invite.code, member.id);
    } else {
        db.prepare(
            "INSERT INTO users (id, inviteCode, invites) VALUES (?, ?, 0)"
        ).run(member.id, invite.code);
    }

    // Register the link immediately so its first use is counted as well.
    db.prepare(`
        INSERT INTO invites (code, ownerId, uses)
        VALUES (?, ?, ?)
        ON CONFLICT(code) DO UPDATE SET
            ownerId = excluded.ownerId,
            uses = excluded.uses
    `).run(invite.code, member.id, invite.uses ?? 0);

    return invite.code;
}

module.exports = {
    getOrCreateInvite
};
