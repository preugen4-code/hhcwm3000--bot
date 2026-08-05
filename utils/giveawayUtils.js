const { EmbedBuilder } = require("discord.js");
const config = require("../config");

function parseDuration(value) {
    const match = /^(\d+)(s|m|h|d)$/i.exec(value.trim());
    if (!match) return null;

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    const milliseconds = amount * multipliers[unit];

    if (!Number.isSafeInteger(milliseconds) || milliseconds <= 0) return null;
    return { milliseconds, label: `${amount}${unit}` };
}

function giveawayEmbed(giveaway, entryCount, ended = false) {
    const endSeconds = Math.floor(giveaway.endTime / 1000);
    const requirements = giveaway.testMode
        ? "No invite requirement (test giveaway)"
        : `${config.inviteRequirement} invites required`;

    return new EmbedBuilder()
        .setColor(ended ? 0x5865F2 : config.giveawayColor)
        .setTitle(ended ? "Giveaway Ended" : "Giveaway")
        .setDescription(`**Prize**\n${giveaway.prize}`)
        .addFields(
            { name: "Winners", value: String(giveaway.winners), inline: true },
            { name: "Entries", value: String(entryCount), inline: true },
            { name: ended ? "Ended" : "Time left", value: `<t:${endSeconds}:R>`, inline: true },
            { name: "Ends", value: `<t:${endSeconds}:F>`, inline: false },
            { name: "Requirements", value: requirements, inline: false }
        )
        .setFooter({ text: giveaway.testMode ? "TEST GIVEAWAY" : "Click the button below to enter" });
}

module.exports = { parseDuration, giveawayEmbed };
