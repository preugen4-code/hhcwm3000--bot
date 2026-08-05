const db = require("../database/db");
const config = require("../config");
const { recordInviteProgress } = require("../utils/inviteChallenge");

module.exports = async (member) => {
    try {
        const invites = await member.guild.invites.fetch();
        let usedInvite;

        for (const invite of invites.values()) {
            const saved = db.prepare(
                "SELECT code, ownerId, uses FROM invites WHERE code = ?"
            ).get(invite.code);

            if (saved && (invite.uses ?? 0) > saved.uses) {
                usedInvite = {
                    code: invite.code,
                    ownerId: saved.ownerId,
                    addedUses: (invite.uses ?? 0) - saved.uses
                };
                break;
            }
        }

        const saveInvite = db.prepare(`
            INSERT INTO invites (code, ownerId, uses)
            VALUES (?, ?, ?)
            ON CONFLICT(code) DO UPDATE SET uses = excluded.uses
        `);
        for (const invite of invites.values()) {
            const saved = db.prepare(
                "SELECT ownerId FROM invites WHERE code = ?"
            ).get(invite.code);
            saveInvite.run(
                invite.code,
                saved?.ownerId ?? invite.inviter?.id ?? null,
                invite.uses ?? 0
            );
        }

        if (!usedInvite?.ownerId) {
            console.warn(`Could not determine the invite used by ${member.user.tag}.`);
            return;
        }

        const insertJoin = db.prepare(`
            INSERT OR IGNORE INTO invite_join_members (inviteCode, memberId)
            VALUES (?, ?)
        `).run(usedInvite.code, member.id);

        if (insertJoin.changes === 0) {
            console.log(
                `${member.user.tag} rejoined using ${usedInvite.code}; invite not counted twice.`
            );
            return;
        }

        db.prepare(`
            INSERT INTO users (id, invites)
            VALUES (?, ?)
            ON CONFLICT(id) DO UPDATE SET invites = invites + excluded.invites
        `).run(usedInvite.ownerId, usedInvite.addedUses);

        const inviter = await member.client.users.fetch(usedInvite.ownerId);
        const { invites: totalInvites } = db.prepare(
            "SELECT invites FROM users WHERE id = ?"
        ).get(usedInvite.ownerId);

        await recordInviteProgress(member.client, usedInvite.ownerId, totalInvites);

        try {
            await inviter.send(
                `🎉 ${member.user.tag} joined using your invite! You now have ${totalInvites}/${config.inviteRequirement} invites.`
            );
        } catch (error) {
            console.warn(`Could not send a DM to ${inviter.tag}.`, error.message);
        }

        console.log(
            `${inviter.tag} received ${usedInvite.addedUses} invite(s): ` +
            `${totalInvites}/${config.inviteRequirement}.`
        );
    } catch (error) {
        console.error(
            `Invite tracking failed for ${member.user.tag}. Check the Manage Server permission and Server Members Intent.`,
            error
        );
    }
};
