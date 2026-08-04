require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
    Client,
    Collection,
    GatewayIntentBits,
    Events
} = require("discord.js");

const ready = require("./events/ready");
const guildMemberAdd = require("./events/guildMemberAdd");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

client.commands = new Collection();

// ==========================
// Commands laden
// ==========================

const commandsPath = path.join(__dirname, "commands");

if (fs.existsSync(commandsPath)) {

    const commandFiles = fs
        .readdirSync(commandsPath)
        .filter(file => file.endsWith(".js"));

    for (const file of commandFiles) {

        const command = require(path.join(commandsPath, file));

        if (command.data && command.execute) {
            client.commands.set(command.data.name, command);
        }

    }

}

// ==========================
// Bot Ready
// ==========================

client.once(Events.ClientReady, async () => {
    await ready(client);
});

// ==========================
// Neue Mitglieder
// ==========================

client.on(Events.GuildMemberAdd, async (member) => {
    await guildMemberAdd(member);
});

// ==========================
// Slash Commands + Buttons
// ==========================

client.on(Events.InteractionCreate, async (interaction) => {

    if (interaction.isButton()) {

        if (interaction.customId === "enter_giveaway") {

            const db = require("./database/db");

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

Current invites: **${invites}/5**`
                    }]
                });

            }

            return interaction.reply({
                ephemeral: true,
                embeds: [{
                    color: 0x57F287,
                    title: "✅ Success",
                    description: "You successfully entered the giveaway!"
                }]
            });

        }

        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {

        await command.execute(interaction);

    } catch (error) {

        console.error(error);

        if (interaction.replied || interaction.deferred) {

            await interaction.followUp({
                content: "❌ Beim Ausführen des Commands ist ein Fehler aufgetreten.",
                ephemeral: true
            });

        } else {

            await interaction.reply({
                content: "❌ Beim Ausführen des Commands ist ein Fehler aufgetreten.",
                ephemeral: true
            });

        }

    }

});

// ==========================
// Login
// ==========================

client.login(process.env.DISCORD_TOKEN);
