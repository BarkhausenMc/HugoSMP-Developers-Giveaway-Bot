const db = require('../database');

module.exports = {
    name: 'interactionCreate',
    once: false,
    
    async execute(interaction, client) {
        if (!interaction.isButton()) return;
        
        if (interaction.customId.startsWith('giveaway_join_')) {
            const giveawayId = interaction.customId.split('_')[2];
            const stmt = db.prepare('SELECT * FROM giveaways WHERE id = ? AND status = "active"');
            const giveaway = stmt.get(giveawayId);
            
            if (!giveaway) {
                return interaction.reply({ 
                    content: '❌ Dieses Giveaway existiert nicht oder ist beendet.',
                    ephemeral: true 
                });
            }
            
            let participants = JSON.parse(giveaway.participants);
            
            if (participants.includes(interaction.user.id)) {
                return interaction.reply({ 
                    content: 'Du hast bereits teilgenommen!',
                    ephemeral: true 
                });
            }
            
            participants.push(interaction.user.id);
            
            db.prepare(`UPDATE giveaways SET participants = ? WHERE id = ?`).run(
                JSON.stringify(participants),
                giveawayId
            );
            
            await interaction.deferUpdate();
            await interaction.followUp({ 
                content: '✅ Du nimmst teil!', 
                ephemeral: true 
            });
        }
        
        // reroll/cancel Buttons hier hinzufügen
    }
};