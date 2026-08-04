const db = require("../database/db");

module.exports = async (interaction) => {

    if (!interaction.isButton()) return;

    if (interaction.customId !== "enter_giveaway") return;

    const user = db.prepare(
        "SELECT * FROM users WHERE id = ?"
    ).get(interaction.user.id);

    const invites = user ? user.invites : 0;

    if (invites < 5) {

        return interaction.reply({
            ephemeral: true,
            embeds: [{
                color: 0xff0000,
                title: "❌ Requirements Not Met",
                description:
`You need **5 invites**.

You currently have **${invites}** invite(s).`
            }]
        });

    }

    await interaction.reply({
        ephemeral: true,
        embeds: [{
            color: 0x57F287,
            title: "✅ Success",
            description: "You entered the giveaway."
        }]
    });

};
