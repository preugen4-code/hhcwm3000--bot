module.exports = async (client) => {
    console.log(`✅ ${client.user.tag} ist online!`);

    const guild = client.guilds.cache.get("1457819772455751863");

    if (!guild) return;

    const invites = await guild.invites.fetch();

    const db = require("../database/db");

    for (const invite of invites.values()) {
        db.prepare(`
            INSERT OR REPLACE INTO invites
            (code, ownerId, uses)
            VALUES (?, ?, ?)
        `).run(
            invite.code,
            invite.inviter?.id ?? null,
            invite.uses
        );
    }

    console.log(`✅ ${invites.size} Invite-Links gespeichert.`);
};
