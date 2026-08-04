const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Zeigt die Bot-Latenz an."),

    async execute(interaction) {
        await interaction.reply("🏓 Pong!");
    }
};
