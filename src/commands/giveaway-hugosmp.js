const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hugosmp')
        .setDescription('Erstelle HugoSMP Money Giveaway'),
    
    async execute(interaction) {
        try {
            if (!interaction.member.permissions.has('ManageMessages')) {
                return interaction.reply({ content: '❌ Manage Messages Permission nötig!', ephemeral: true });
            }
            
            const modal = new ModalBuilder()
                .setCustomId('hugosmp_create_modal')
                .setTitle('HugoSMP Money Giveaway');
            
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder()
                    .setCustomId('time_input')
                    .setLabel('Dauer (z.B. 1h, 30m, 2d)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder()
                    .setCustomId('winner_input')
                    .setLabel('Anzahl Gewinner')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder()
                    .setCustomId('amount_input')
                    .setLabel('Geldbetrag pro Gewinner ($)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder()
                    .setCustomId('title_input')
                    .setLabel('Titel (optional)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)),
                new ActionRowBuilder().addComponents(new TextInputBuilder()
                    .setCustomId('description_input')
                    .setLabel('Beschreibung (optional)')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false))
            );
            
            await interaction.showModal(modal);
        } catch (error) {
            console.error('HUGOSMP MODAL ERROR:', error);
            await interaction.reply({ content: `❌ Fehler: ${error.message}`, ephemeral: true });
        }
    }
};