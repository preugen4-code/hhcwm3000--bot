const config = require("../config");
const db = require("../database/db");

module.exports = async (client) => {
    console.log(`Logged in as ${client.user.tag}`);

    const guild = client.guilds.cache.get(config.guildId);
    if (!guild) {
        console.error(`Guild ${config.guildId} was not found.`);
        return;
    }

    try {
        // Repair links created by older versions: their real owner is stored
        // in users.inviteCode, not Discord's inviter (which is the bot).
        db.prepare(`
            UPDATE invites
            SET ownerId = (
                SELECT users.id FROM users WHERE users.inviteCode = invites.code
            )
            WHERE EXISTS (
                SELECT 1 FROM users WHERE users.inviteCode = invites.code
            )
        `).run();

        const invites = await guild.invites.fetch();
        const upsert = db.prepare(`
            INSERT INTO invites (code, ownerId, uses)
            VALUES (?, ?, ?)
            ON CONFLICT(code) DO UPDATE SET
                uses = excluded.uses,
                ownerId = COALESCE(invites.ownerId, excluded.ownerId)
        `);

        for (const invite of invites.values()) {
            const saved = db.prepare(
                "SELECT ownerId FROM invites WHERE code = ?"
            ).get(invite.code);

            // For personal links saved.ownerId is the member who requested it.
            // Discord's invite.inviter is normally the bot itself.
            upsert.run(
                invite.code,
                saved?.ownerId ?? invite.inviter?.id ?? null,
                invite.uses ?? 0
            );
        }

        console.log(`Invite tracking ready: ${invites.size} links cached.`);
    } catch (error) {
        console.error(
            "Unable to fetch server invites. Give the bot the Manage Server permission.",
            error
        );
    }
};
