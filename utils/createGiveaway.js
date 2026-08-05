const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const db = require("../database/db");
const { parseDuration, giveawayEmbed } = require("./giveawayUtils");

async function createGiveaway(interaction, testMode) {
    const prize = interaction.options.getString("prize");
    const durationInput = interaction.options.getString("duration");
    const winners = interaction.options.getInteger("winners");
    const duration = parseDuration(durationInput);

    if (!duration) {
        return interaction.reply({
            content: "Invalid duration. Use for example: `10s`, `10m`, `10h`, or `10d`.",
            ephemeral: true
        });
    }

    const giveaway = {
        prize,
        winners,
        endTime: Date.now() + duration.milliseconds,
        testMode: testMode ? 1 : 0
    };
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("enter_giveaway")
            .setLabel(testMode ? "Enter Test Giveaway" : "Enter Giveaway")
            .setStyle(ButtonStyle.Primary)
    );
    const message = await interaction.channel.send({
        embeds: [giveawayEmbed(giveaway, 0)],
        components: [row]
    });

    db.prepare(`
        INSERT INTO giveaways
        (messageId, channelId, guildId, prize, winners, endTime, ended, testMode, reminderSent)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, 0)
    `).run(
        message.id, interaction.channel.id, interaction.guild.id,
        prize, winners, giveaway.endTime, giveaway.testMode
    );

    return interaction.reply({
        content: `${testMode ? "Test giveaway" : "Giveaway"} created for ${duration.label}.`,
        ephemeral: true
    });
}

module.exports = { createGiveaway };
