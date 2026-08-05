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

const config = require("./config");
const ready = require("./events/ready");
const guildMemberAdd = require("./events/guildMemberAdd");
const buttonInteraction = require("./events/interactionCreate");
const giveawayManager = require("./utils/giveawayManager");
const { startWalletVerificationServer } = require("./utils/walletVerification");

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.commands = new Collection();
const commands = [];
const commandsPath = path.join(__dirname, "commands");

for (const file of fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"))) {
    const command = require(path.join(commandsPath, file));
    if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
    }
}

client.once(Events.ClientReady, async () => {
    await ready(client);

    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(
            Routes.applicationGuildCommands(config.applicationId, config.guildId),
            { body: commands }
        );
        console.log("Slash commands registered.");
    } catch (error) {
        console.error("Unable to register slash commands.", error);
    }

    giveawayManager(client);
});

client.on(Events.GuildMemberAdd, guildMemberAdd);

client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isButton()) return buttonInteraction(interaction);
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        const response = {
            content: "An error occurred while executing this command.",
            ephemeral: true
        };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(response);
        } else {
            await interaction.reply(response);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
startWalletVerificationServer(client);
