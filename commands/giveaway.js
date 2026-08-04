const {
    SlashCommandBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    PermissionFlagsBits
} = require("discord.js");

const db = require("../database/db");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("giveaway")
        .setDescription("Create a giveaway.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        .addStringOption(option =>
            option
                .setName("prize")
                .setDescription("Giveaway prize")
                .setRequired(true)
        )

        .addIntegerOption(option =>
            option
                .setName("hours")
                .setDescription("Duration in hours")
                .setRequired(true)
        )

        .addIntegerOption(option =>
            option
                .setName("winners")
                .setDescription("Number of winners")
                .setRequired(true)
        ),

    async execute(interaction) {

        const prize = interaction.options.getString("prize");
        const hours = interaction.options.getInteger("hours");
        const winners = interaction.options.getInteger("winners");

        const endTime = Date.now() + (hours * 60 * 60 * 1000);

        const embed = new EmbedBuilder()

            .setColor("#8b5cf6")

            .setTitle("🎉 GIVEAWAY")

            .setDescription(

`🏆 **Prize**
${prize}

👥 **Winners**
${winners}

⏰ **Duration**
${hours} Hour(s)

📋 **Requirements**
✅ Minimum **5 Invites**`

            );

        const row = new ActionRowBuilder()

            .addComponents(

                new ButtonBuilder()

                    .setCustomId("enter_giveaway")

                    .setLabel("🎉 Enter Giveaway")

                    .setStyle(ButtonStyle.Primary)

            );

        const message = await interaction.channel.send({

            embeds: [embed],

            components: [row]

        });

        db.prepare(

            `INSERT INTO giveaways
            (messageId, channelId, guildId, prize, winners, endTime, ended)
            VALUES (?, ?, ?, ?, ?, ?, 0)`

        ).run(

            message.id,

            interaction.channel.id,

            interaction.guild.id,

            prize,

            winners,

            endTime

        );

        await interaction.reply({

            content: "✅ Giveaway created successfully.",

            ephemeral: true

        });

    }

};
