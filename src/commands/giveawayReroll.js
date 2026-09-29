const {
    SlashCommandBuilder
} = require("discord.js");

const command = new SlashCommandBuilder()
    .setName("reroll")
    .setDescription("Lost einen neuen Gewinner für ein Giveaway aus.")
    .addIntegerOption(option =>
        option
            .setName("id")
            .setDescription("Die ID des Giveaways.")
            .setRequired(true)
            .setMinValue(1)
    );

module.exports = {
    command
};
