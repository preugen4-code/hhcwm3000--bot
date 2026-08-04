require("dotenv").config();

const fs = require("fs");
const path = require("path");

const { REST, Routes } = require("discord.js");

const commands = [];

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));

    if (command.data) {
        commands.push(command.data.toJSON());
    }
}

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {

        console.log(`Registriere ${commands.length} Slash Commands...`);

        await rest.put(
            Routes.applicationGuildCommands(
                "1534310295378329751",
                "1457819772455751863"
            ),
            { body: commands }
        );

        console.log("✅ Slash Commands registriert.");

    } catch (error) {
        console.error(error);
    }
})();
