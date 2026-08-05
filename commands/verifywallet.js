const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const { createVerificationSession } = require("../utils/walletVerification");

module.exports = {
    data: new SlashCommandBuilder().setName("verifywallet").setDescription("Verify ownership of a Solana wallet safely."),
    async execute(interaction) {
        const configuredUrl = process.env.WALLET_VERIFICATION_URL;
        if (!configuredUrl || !process.env.WALLET_VERIFIED_ROLE_ID) return interaction.reply({ content: "Wallet verification has not been configured by staff yet.", ephemeral: true });

        let baseUrl;
        try {
            const url = new URL(configuredUrl);
            if (url.protocol !== "https:") throw new Error("HTTPS is required.");
            baseUrl = url.toString().replace(/\/$/, "");
        } catch {
            return interaction.reply({
                content: "Wallet verification URL is invalid. Staff must set WALLET_VERIFICATION_URL to the complete Railway domain starting with https://",
                ephemeral: true
            });
        }

        const token = createVerificationSession(interaction.user.id);
        return interaction.reply({ content: "Verify by signing a free message. Never enter a seed phrase or private key.", ephemeral: true, components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel("Verify Wallet").setStyle(ButtonStyle.Link).setURL(`${baseUrl}/wallet/${token}`))] });
    }
};
