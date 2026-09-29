const { 
    SlashCommandBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('create')
        .setDescription('Erstelle ein normales Giveaway über ein Modal'),
    
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
        
        // Time Input
        const timeInput = new TextInputBuilder()
            .setCustomId('time_input')
            .setLabel('Dauer (z.B. 1h, 30m, 2d, 90s)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('1h')
            .setRequired(true);
        
        // Winner Count Input
        const winnerInput = new TextInputBuilder()
            .setCustomId('winner_input')
            .setLabel('Anzahl Gewinner')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('3')
            .setRequired(true);
        
        // Prize Input
        const prizeInput = new TextInputBuilder()
            .setCustomId('prize_input')
            .setLabel('Preisbeschreibung')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Gamepass, VIP-Rang, etc.')
            .setRequired(true);
        
        // Title Input (optional)
        const titleInput = new TextInputBuilder()
            .setCustomId('title_input')
            .setLabel('Titel (optional)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('🎁 Super Giveaway')
            .setRequired(false);
        
        // Description Input (optional)
        const descInput = new TextInputBuilder()
            .setCustomId('description_input')
            .setLabel('Beschreibung/Regeln (optional)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Zusätzliche Teilnahmebedingungen...')
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