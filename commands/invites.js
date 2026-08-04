const { SlashCommandBuilder } = require("discord.js");
const db = require("../database/db");
const { getOrCreateInvite } = require("../utils/inviteManager");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("invites")
        .setDescription("Shows your invite link and invite count."),

    async execute(interaction) {

        const code = await getOrCreateInvite(interaction.member);

        let user = db.prepare(
            "SELECT * FROM users WHERE id = ?"
        ).get(interaction.user.id);

        if (!user) {
            db.prepare(
                "INSERT INTO users (id, inviteCode, invites) VALUES (?, ?, 0)"
            ).run(interaction.user.id, code);

            user = {
                inviteCode: code,
                invites: 0
            };
        }

        await interaction.reply({
            embeds: [{
                title: "🎉 Your Invites",
                description:
`**Your Invite Link**
https://discord.gg/${user.inviteCode}

**Invites**
${user.invites}/5`,
                color: 0x8b5cf6
            }],
            ephemeral: true
        });

    }
};
