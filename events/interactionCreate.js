const db = require("../database/db");
const { getOrCreateInvite } = require("../utils/inviteManager");
const config = require("../config");
const { giveawayEmbed } = require("../utils/giveawayUtils");

module.exports = async (interaction) => {

    if (!interaction.isButton()) return;

    if (interaction.customId === "get_invite_link") {
        // Creating an invite can exceed Discord's three-second interaction
        // deadline, so acknowledge the button press immediately.
        await interaction.deferReply({ ephemeral: true });

        try {
            const inviteCode = await getOrCreateInvite(interaction.member);

            return interaction.editReply({
                embeds: [{
                    color: config.giveawayColor,
                    title: "Your Invite Link",
                    description: `Share this personal link:\nhttps://discord.gg/${inviteCode}`
                }]
            });
        } catch (error) {
            console.error("Unable to create an invite link.", error);
            return interaction.editReply(
                "I could not create an invite link. Give the bot the Create Invite permission in a text channel."
            );
        }
    }

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

    if (!giveaway.testMode && invites < config.inviteRequirement) {

        const inviteCode = await getOrCreateInvite(interaction.member);

        return interaction.reply({
            ephemeral: true,
            embeds: [{
                color: 0xff0000,
                title: "❌ Requirements Not Met",
                description:
`You need at least **${config.inviteRequirement} invites** to enter this giveaway.

**Current Invites**
${invites}/${config.inviteRequirement}

🔗 **Your Invite Link**
https://discord.gg/${inviteCode}

Invite your friends using your personal invite link and come back once you've reached ${config.inviteRequirement} invites.`
            }]
        });

    }

    db.prepare(
        "INSERT INTO giveaway_entries (messageId, userId) VALUES (?, ?)"
    ).run(
        interaction.message.id,
        interaction.user.id
    );

    const { entryCount } = db.prepare(
        "SELECT COUNT(*) AS entryCount FROM giveaway_entries WHERE messageId = ?"
    ).get(interaction.message.id);

    await interaction.message.edit({
        embeds: [giveawayEmbed(giveaway, entryCount)]
    });

    return interaction.reply({
        ephemeral: true,
        embeds: [{
            color: 0x57F287,
            title: "✅ Successfully Entered!",
            description:
`${giveaway.testMode ? "You entered the test giveaway." : "You have met all requirements."}

🏆 **Prize**
${giveaway.prize}

Good luck! 🍀`
        }]
    });

};
