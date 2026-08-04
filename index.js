require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
    Client,
    Collection,
    GatewayIntentBits,
    Events
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

client.commands = new Collection();

// =======================
// Commands laden
// =======================

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

// =======================
// Ready Event
// =======================

const ready = require("./events/ready");

client.once(Events.ClientReady, async () => {
    await ready(client);
});

// =======================
// Guild Join Event
// =======================

const guildMemberAdd = require("./events/guildMemberAdd");

client.on(Events.GuildMemberAdd, async (member) => {
    await guildMemberAdd(member);
});

// =======================
// Slash Commands
// =======================

client.on(Events.InteractionCreate, async (interaction) => {

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

// =======================
// Login
// =======================

client.login(process.env.DISCORD_TOKEN);
