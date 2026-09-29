require("dotenv").config();

const {
    REST,
    Routes
} = require("discord.js");

const {
    command: createGiveawayCommand
} = require("./commands/createGiveaway");

const {
    command: giveawayRerollCommand
} = require("./commands/giveawayReroll");


const rest = new REST({
    version: "10"
}).setToken(
    process.env.DISCORD_TOKEN
);

async function deployCommands() {
    try {
        console.log(
            "Registriere Slash Commands..."
        );

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            {
                body: [
                    createGiveawayCommand.toJSON(),
                    giveawayRerollCommand.toJSON()
                ]

            }
        );

        console.log(
            "Slash Commands erfolgreich registriert."
        );
    } catch (error) {
        console.error(error);
    }
}

deployCommands();
