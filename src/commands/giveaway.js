const {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Erstellt ein neues Giveaway.'),

    async execute(interaction) {
        // Prüfen, ob der User die benötigte Rolle besitzt
        const roleId = process.env.GIVEAWAY_ROLE_ID;

        if (!roleId) {
            return interaction.reply({
                content: '❌ Die Giveaway-Rolle wurde noch nicht konfiguriert.',
                ephemeral: true,
            });
        }

        if (!interaction.member.roles.cache.has(roleId)) {
            return interaction.reply({
                content: '❌ Du hast keine Berechtigung, Giveaways zu erstellen.',
                ephemeral: true,
            });
        }

        const modal = new ModalBuilder()
            .setCustomId('giveaway_create_modal')
            .setTitle('Giveaway erstellen');

        const prizeInput = new TextInputBuilder()
            .setCustomId('giveaway_prize')
            .setLabel('Was gibt es zu gewinnen?')
            .setPlaceholder('z. B. Discord Nitro')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100);

        const durationInput = new TextInputBuilder()
            .setCustomId('giveaway_duration')
            .setLabel('Wie lange soll das Giveaway laufen?')
            .setPlaceholder('z. B. 1h, 30m, 2d')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(10);

        const winnersInput = new TextInputBuilder()
            .setCustomId('giveaway_winners')
            .setLabel('Anzahl der Gewinner')
            .setPlaceholder('z. B. 1')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(3);

        modal.addComponents(
            new ActionRowBuilder().addComponents(prizeInput),
            new ActionRowBuilder().addComponents(durationInput),
            new ActionRowBuilder().addComponents(winnersInput),
        );

        await interaction.showModal(modal);
    },
};
