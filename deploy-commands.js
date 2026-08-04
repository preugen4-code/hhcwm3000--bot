require("dotenv").config();

const { REST, Routes } = require("discord.js");

const commands = [
    {
        name: "ping",
        description: "Zeigt die Bot-Latenz an."
    }
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log("Registriere Slash-Commands...");

        await rest.put(
            Routes.applicationGuildCommands(
                "1534310295378329751",
                "1457819772455751863"
            ),
            { body: commands }
        );

        console.log("✅ Slash-Commands registriert!");
    } catch (error) {
        console.error(error);
    }
})();
