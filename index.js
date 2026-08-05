require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
    Client,
    Collection,
    GatewayIntentBits,
    Events,
    REST,
    Routes
} = require("discord.js");

const ready = require("./events/ready");
const guildMemberAdd = require("./events/guildMemberAdd");
const buttonInteraction = require("./events/interactionCreate");
const giveawayManager = require("./utils/giveawayManager");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

client.commands = new Collection();

// ==========================
// Load Commands
// ==========================

const commands = [];
const commandsPath = path.join(__dirname, "commands");

if (fs.existsSync(commandsPath)) {

    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

    for (const file of commandFiles) {

        const command = require(path.join(commandsPath, file));

        if (command.data && command.execute) {
            client.commands.set(command.data.name, command);
            commands.push(command.data.toJSON());
        }

    }

}

// ==========================
// Ready
// ==========================

client.once(Events.ClientReady, async () => {

    await ready(client);

    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

    try {

        await rest.put(
            Routes.applicationGuildCommands(
                "1534310295378329751",
                "1457819772455751863"
            ),
            {
                body: commands
            }
        );

        console.log("✅ Slash Commands Registered");

    } catch (err) {

        console.log(err);

    }

    giveawayManager(client);

});

// ==========================
// Member Join
// ==========================

client.on(Events.GuildMemberAdd, async (member) => {

    await guildMemberAdd(member);

});

// ==========================
// Buttons
// ==========================

client.on(Events.InteractionCreate, async (interaction) => {

    if (interaction.isButton()) {
        return buttonInteraction(interaction);
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {

        await command.execute(interaction);

    } catch (err) {

        console.log(err);

        if (interaction.replied || interaction.deferred) {

            await interaction.followUp({
                content: "An error occurred while executing this command.",
                ephemeral: true
            });

        } else {

            await interaction.reply({
                content: "An error occurred while executing this command.",
                ephemeral: true
            });

        }

    }

});

client.login(process.env.DISCORD_TOKEN);
