const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require("discord.js");
const db = require("../database/db");
const config = require("../config");
const { giveawayEmbed } = require("./giveawayUtils");

function endedRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("ended")
            .setLabel("Giveaway Ended")
            .setDisabled(true)
            .setStyle(ButtonStyle.Secondary)
    );
}

module.exports = function giveawayManager(client) {
    setInterval(async () => {
        const giveaways = db.prepare(
            "SELECT * FROM giveaways WHERE ended = 0"
        ).all();

        for (const giveaway of giveaways) {
            try {
                const channel = await client.channels.fetch(giveaway.channelId);
                const entries = db.prepare(
                    "SELECT userId FROM giveaway_entries WHERE messageId = ?"
                ).all(giveaway.messageId);
                const remaining = giveaway.endTime - Date.now();

                if (remaining > 0) {
                    if (!giveaway.reminderSent && remaining <= config.giveawayReminderMs) {
                        db.prepare(
                            "UPDATE giveaways SET reminderSent = 1 WHERE messageId = ?"
                        ).run(giveaway.messageId);

                        await channel.send({
                            content: `@everyone Giveaway almost over! **${giveaway.prize}** ends <t:${Math.floor(giveaway.endTime / 1000)}:R>.`,
                            allowedMentions: { parse: ["everyone"] }
                        });
                    }
                    continue;
                }

                db.prepare(
                    "UPDATE giveaways SET ended = 1 WHERE messageId = ?"
                ).run(giveaway.messageId);

                const message = await channel.messages.fetch(giveaway.messageId);
                await message.edit({
                    embeds: [giveawayEmbed(giveaway, entries.length, true)],
                    components: [endedRow()]
                });

                if (entries.length === 0) {
                    await channel.send({
                        content: "@everyone Giveaway ended — no one entered.",
                        allowedMentions: { parse: ["everyone"] }
                    });
                    continue;
                }

                const winnerIds = [...entries]
                    .sort(() => Math.random() - 0.5)
                    .slice(0, giveaway.winners)
                    .map(entry => entry.userId);
                const mentions = winnerIds.map(id => `<@${id}>`).join(", ");

                await channel.send({
                    content: `@everyone Giveaway ended! Congratulations ${mentions} — you won **${giveaway.prize}**!`,
                    allowedMentions: { parse: ["everyone", "users"] },
                    embeds: [new EmbedBuilder()
                        .setColor(0x57F287)
                        .setTitle("Giveaway Winners")
                        .setDescription(`**Prize:** ${giveaway.prize}\n**Winner(s):** ${mentions}`)]
                });
            } catch (error) {
                console.error(`Failed to process giveaway ${giveaway.messageId}.`, error);
            }
        }
    }, 1000);
};
