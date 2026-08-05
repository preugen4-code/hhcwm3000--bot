const db = require("../database/db");

module.exports = async (member) => {

    console.log(`${member.user.tag} joined`);

    const invites = await member.guild.invites.fetch();

    for (const invite of invites.values()) {

        const saved = db.prepare(
            "SELECT * FROM invites WHERE code = ?"
        ).get(invite.code);

        console.log(
            invite.code,
            "old:",
            saved?.uses,
            "new:",
            invite.uses,
            "owner:",
            saved?.ownerId
        );

        if (!saved) continue;

        if (invite.uses > saved.uses) {

            console.log("USED:", invite.code);

            db.prepare(
                "UPDATE invites SET uses = ? WHERE code = ?"
            ).run(invite.uses, invite.code);

            db.prepare(
                "UPDATE users SET invites = invites + 1 WHERE id = ?"
            ).run(saved.ownerId);

            console.log("Invite added to", saved.ownerId);

        }

    };

};
