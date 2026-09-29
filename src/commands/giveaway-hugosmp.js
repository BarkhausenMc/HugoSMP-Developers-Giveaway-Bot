const { 
    SlashCommandBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hugosmp')
        .setDescription('Erstelle ein HugoSMP Money Giveaway über ein Modal'),
    
    async execute(interaction) {
        if (!interaction.member.permissions.has('ManageMessages')) {
            return interaction.reply({ 
                content: '❌ Du brauchst `Manage Messages` Permission!', 
                ephemeral: true 
            });
        }
        
        const modal = new ModalBuilder()
            .setCustomId('hugosmp_create_modal')
            .setTitle('HugoSMP Money Giveaway erstellen');
        
        const timeInput = new TextInputBuilder()
            .setCustomId('time_input')
            .setLabel('Dauer (z.B. 1h, 30m, 2d)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('1h')
            .setRequired(true);
        
        const winnerInput = new TextInputBuilder()
            .setCustomId('winner_input')
            .setLabel('Anzahl Gewinner')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('5')
            .setRequired(true);
        
        const amountInput = new TextInputBuilder()
            .setCustomId('amount_input')
            .setLabel('Geldbetrag pro Gewinner ($)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('1000')
            .setRequired(true);
        
        const titleInput = new TextInputBuilder()
            .setCustomId('title_input')
            .setLabel('Titel (optional)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('💰 Money Giveaway')
            .setRequired(false);
        
        const descInput = new TextInputBuilder()
            .setCustomId('description_input')
            .setLabel('Beschreibung/Regeln (optional)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Zusätzliche Bedingungen...')
            .setRequired(false);
        
        modal.addComponents(
            new ActionRowBuilder().addComponents(timeInput),
            new ActionRowBuilder().addComponents(winnerInput),
            new ActionRowBuilder().addComponents(amountInput),
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(descInput)
        );
        
        await interaction.showModal(modal);
    }
};