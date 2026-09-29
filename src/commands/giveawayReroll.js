const {
    SlashCommandBuilder
} = require("discord.js");

const command = new SlashCommandBuilder()
    .setName("giveaway-reroll")
    .setDescription("Ersetzt einen Gewinner eines Giveaways.")
    .addIntegerOption(option =>
        option
            .setName("giveaway")
            .setDescription("Die ID des Giveaways.")
            .setRequired(true)
            .setMinValue(1)
    )
    .addUserOption(option =>
        option
            .setName("winner")
            .setDescription("Der Gewinner, der ersetzt werden soll.")
            .setRequired(true)
    );

module.exports = {
    command
};
