const {
    SlashCommandBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    PermissionFlagsBits
} = require("discord.js");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("giveaway")
        .setDescription("Erstellt ein Giveaway.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option
                .setName("preis")
                .setDescription("Preis")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("stunden")
                .setDescription("Dauer")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("gewinner")
                .setDescription("Anzahl Gewinner")
                .setRequired(true)
        ),

    async execute(interaction) {

        const preis = interaction.options.getString("preis");
        const stunden = interaction.options.getInteger("stunden");
        const gewinner = interaction.options.getInteger("gewinner");

        const embed = new EmbedBuilder()
            .setColor("#8b5cf6")
            .setTitle("🎉 GIVEAWAY")
            .setDescription(
`**Preis**
${preis}

🏆 Gewinner: **${gewinner}**

⏰ Dauer: **${stunden} Stunden**

📌 Voraussetzungen
✅ Mindestens **5 Invites**`
            );

        const row = new ActionRowBuilder().addComponents(

            new ButtonBuilder()
                .setCustomId("enter_giveaway")
                .setLabel("🎉 Enter Giveaway")
                .setStyle(ButtonStyle.Primary)

        );

        await interaction.channel.send({
            embeds: [embed],
            components: [row]
        });

        await interaction.reply({
            content: "✅ Giveaway erstellt.",
            ephemeral: true
        });

    }

};
