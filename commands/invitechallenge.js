const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { startInviteChallenge } = require("../utils/inviteChallenge");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("invitechallenge")
        .setDescription("Start the 100-invite race for 25 SOL.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await startInviteChallenge(interaction);
        await interaction.reply({
            content: "Invite Race posted: first to 100 valid invites wins 25 SOL.",
            ephemeral: true
        });
    }
};
