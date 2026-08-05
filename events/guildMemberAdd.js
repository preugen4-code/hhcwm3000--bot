const db = require("../database/db");

module.exports = async (member) => {
    const invites = await member.guild.invites.fetch();

    for (const invite of invites.values()) {

        const saved = db.prepare(
            "SELECT * FROM invites WHERE code = ?"
        ).get(invite.code);

        if (!saved) {
            db.prepare(
                "INSERT INTO invites (code, ownerId, uses) VALUES (?, ?, ?)"
            ).run(
                invite.code,
                invite.inviter?.id ?? null,
                invite.uses
            );
            continue;
        }

        if (invite.uses > saved.uses) {

            db.prepare(
                "UPDATE invites SET uses = ? WHERE code = ?"
            ).run(invite.uses, invite.code);

            db.prepare(
                "UPDATE users SET invites = invites + 1 WHERE id = ?"
            ).run(saved.ownerId);

            console.log({
    code: invite.code,
    oldUses: saved.uses,
    newUses: invite.uses,
    ownerId: saved.ownerId
});
        }
    }
};
