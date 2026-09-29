const {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require("discord.js");

const command = new SlashCommandBuilder()
    .setName("create-giveaway")
    .setDescription("Erstellt ein neues Giveaway.");

function buildCreateGiveawayModal() {
    const modal = new ModalBuilder()
        .setCustomId("create-giveaway-modal")
        .setTitle("Giveaway erstellen");

    const prizeInput = new TextInputBuilder()
        .setCustomId("prize")
        .setLabel("Was kann man gewinnen?")
        .setPlaceholder("z. B. Discord Nitro")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(100);

    const winnersInput = new TextInputBuilder()
        .setCustomId("winner_count")
        .setLabel("Wie viele Gewinner?")
        .setPlaceholder("z. B. 3")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(2);

    const endInput = new TextInputBuilder()
        .setCustomId("end_at")
        .setLabel("Wann wird ausgelost?")
        .setPlaceholder("01.10.2026 18:30")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(16)
        .setMaxLength(16);

    modal.addComponents(
        new ActionRowBuilder().addComponents(prizeInput),
        new ActionRowBuilder().addComponents(winnersInput),
        new ActionRowBuilder().addComponents(endInput)
    );

    return modal;
}

module.exports = {
    command,
    buildCreateGiveawayModal
};
