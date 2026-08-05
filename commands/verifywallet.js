const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const { createVerificationSession } = require("../utils/walletVerification");

module.exports = {
    data: new SlashCommandBuilder().setName("verifywallet").setDescription("Verify ownership of a Solana wallet safely."),
    async execute(interaction) {
        const baseUrl = process.env.WALLET_VERIFICATION_URL?.replace(/\/$/, "");
        if (!baseUrl || !process.env.WALLET_VERIFIED_ROLE_ID) return interaction.reply({ content: "Wallet verification has not been configured by staff yet.", ephemeral: true });
        const token = createVerificationSession(interaction.user.id);
        return interaction.reply({ content: "Verify by signing a free message. Never enter a seed phrase or private key.", ephemeral: true, components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel("Verify Wallet").setStyle(ButtonStyle.Link).setURL(`${baseUrl}/wallet/${token}`))] });
    }
};
