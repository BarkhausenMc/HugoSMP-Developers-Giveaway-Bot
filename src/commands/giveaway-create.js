const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('create')
        .setDescription('Erstelle ein normales Giveaway'),
    
    async execute(interaction) {
        if (!interaction.member.permissions.has('ManageMessages')) {
            return interaction.reply({ 
                content: '❌ Du brauchst `Manage Messages` Permission!', 
                ephemeral: true 
            });
        }
        
        const modal = new ModalBuilder()
            .setCustomId('giveaway_create_modal')
            .setTitle('Neues Giveaway erstellen');
        
        const timeInput = new TextInputBuilder()
            .setCustomId('time_input')
            .setLabel('Dauer (z.B. 1h, 30m, 2d)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('1h')
            .setRequired(true);
        
        const winnerInput = new TextInputBuilder()
            .setCustomId('winner_input')
            .setLabel('Anzahl Gewinner (1-100)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('3')
            .setRequired(true);
        
        const prizeInput = new TextInputBuilder()
            .setCustomId('prize_input')
            .setLabel('Preisbeschreibung')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Gamepass, VIP-Rang')
            .setRequired(true);
        
        const titleInput = new TextInputBuilder()
            .setCustomId('title_input')
            .setLabel('Titel (optional)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('🎁 Super Giveaway')
            .setRequired(false);
        
        const descInput = new TextInputBuilder()
            .setCustomId('description_input')
            .setLabel('Beschreibung (optional)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Regeln...')
            .setRequired(false);
        
        modal.addComponents(
            new ActionRowBuilder().addComponents(timeInput),
            new ActionRowBuilder().addComponents(winnerInput),
            new ActionRowBuilder().addComponents(prizeInput),
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(descInput)
        );
        
        await interaction.showModal(modal);
    }
};