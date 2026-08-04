const db = require("../database/db");
const { getOrCreateInvite } = require("../utils/inviteManager");

module.exports = async (interaction) => {

    if (!interaction.isButton()) return;

    if (interaction.customId !== "enter_giveaway") return;

    const giveaway = db.prepare(
        "SELECT * FROM giveaways WHERE messageId = ?"
    ).get(interaction.message.id);

    if (!giveaway) {

        return interaction.reply({
            ephemeral: true,
            embeds: [{
                color: 0xff0000,
                title: "❌ Giveaway Not Found",
                description: "This giveaway no longer exists."
            }]
        });

    }

    if (giveaway.ended === 1) {

        return interaction.reply({
            ephemeral: true,
            embeds: [{
                color: 0xff0000,
                title: "❌ Giveaway Ended",
                description: "This giveaway has already ended."
            }]
        });

    }

    const alreadyEntered = db.prepare(
        "SELECT * FROM giveaway_entries WHERE messageId = ? AND userId = ?"
    ).get(
        interaction.message.id,
        interaction.user.id
    );

    if (alreadyEntered) {

        return interaction.reply({
            ephemeral: true,
            embeds: [{
                color: 0xFEE75C,
                title: "ℹ️ Already Entered",
                description:
`You have already entered this giveaway.

Good luck! 🍀`
            }]
        });

    }

    const user = db.prepare(
        "SELECT * FROM users WHERE id = ?"
    ).get(interaction.user.id);

    const invites = user ? user.invites : 0;

    if (invites < 5) {

        const inviteCode = await getOrCreateInvite(interaction.member);

        return interaction.reply({
            ephemeral: true,
            embeds: [{
                color: 0xff0000,
                title: "❌ Requirements Not Met",
                description:
`You need at least **5 invites** to enter this giveaway.

**Current Invites**
${invites}/5

🔗 **Your Invite Link**
https://discord.gg/${inviteCode}

Invite your friends using your personal invite link and come back once you've reached 5 invites.`
            }]
        });

    }

    db.prepare(
        "INSERT INTO giveaway_entries (messageId, userId) VALUES (?, ?)"
    ).run(
        interaction.message.id,
        interaction.user.id
    );

    return interaction.reply({
        ephemeral: true,
        embeds: [{
            color: 0x57F287,
            title: "✅ Successfully Entered!",
            description:
`You have met all requirements.

🏆 **Prize**
${giveaway.prize}

Good luck! 🍀`
        }]
    });

};
