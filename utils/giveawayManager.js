const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require("discord.js");

const db = require("../database/db");

module.exports = async function(client) {

    setInterval(async () => {

        const giveaways = db.prepare(
            "SELECT * FROM giveaways WHERE ended = 0"
        ).all();

        for (const giveaway of giveaways) {

            if (Date.now() < giveaway.endTime)
                continue;

            db.prepare(
                "UPDATE giveaways SET ended = 1 WHERE messageId = ?"
            ).run(giveaway.messageId);

            try {

                const channel = await client.channels.fetch(giveaway.channelId);

                const message = await channel.messages.fetch(giveaway.messageId);

                const entries = db.prepare(
                    "SELECT * FROM giveaway_entries WHERE messageId = ?"
                ).all(giveaway.messageId);

                const disabledRow = new ActionRowBuilder()

                    .addComponents(

                        new ButtonBuilder()

                            .setCustomId("ended")

                            .setLabel("🎉 Giveaway Ended")

                            .setDisabled(true)

                            .setStyle(ButtonStyle.Secondary)

                    );

                const endedEmbed = new EmbedBuilder()

                    .setColor("#8b5cf6")

                    .setTitle("🎉 GIVEAWAY ENDED")

                    .setDescription(

`🏆 **Prize**
${giveaway.prize}

👥 **Winners**
${giveaway.winners}

⏰ **Ended**

📋 **Requirements**
✅ Minimum **5 Invites**`

                    );

                await message.edit({

                    embeds: [endedEmbed],

                    components: [disabledRow]

                });

                if (entries.length === 0) {

                    await channel.send({

                        embeds: [

                            new EmbedBuilder()

                                .setColor("Red")

                                .setTitle("❌ Giveaway Ended")

                                .setDescription(
                                    "No valid participants entered this giveaway."
                                )

                        ]

                    });

                    continue;

                }

                const shuffled = entries.sort(() => Math.random() - 0.5);

                const winners = shuffled.slice(0, giveaway.winners);

                const mentions = winners.map(
                    w => `<@${w.userId}>`
                ).join("\n");

                await channel.send({

                    embeds: [

                        new EmbedBuilder()

                            .setColor("#57F287")

                            .setTitle("🏆 Giveaway Ended")

                            .setDescription(

`The **${giveaway.prize}** giveaway has ended!

👑 **Winner(s)**

${mentions}

Congratulations! 🎉`

                            )

                    ]

                });

            } catch (err) {

                console.log(err);

            }

        }

    }, 1000);

};
