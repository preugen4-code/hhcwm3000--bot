const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { createGiveaway } = require("../utils/createGiveaway");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("testgiveaway")
        .setDescription("Create a giveaway without an invite requirement.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option => option.setName("prize").setDescription("Test prize").setRequired(true))
        .addStringOption(option => option.setName("duration").setDescription("Example: 10s, 10m, 10h, or 10d").setRequired(true))
        .addIntegerOption(option => option.setName("winners").setDescription("Number of winners").setMinValue(1).setRequired(true)),
    execute(interaction) {
        return createGiveaway(interaction, true);
    }
};
