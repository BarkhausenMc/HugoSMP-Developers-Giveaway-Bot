const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('list')
        .setDescription('Zeige alle aktiven Giveaways'),
    
    async execute(interaction) {
        try {
            const giveaways = stmts.getAllActive.all();
            
            if (giveaways.length === 0) {
                return interaction.reply({ 
                    content: 'ℹ️ Aktuell keine aktiven Giveaways.',
                    ephemeral: true 
                });
            }
            
            // Nach Guild filtern oder alle zeigen
            const guildGiveaways = giveaways.filter(g => g.guild_id === interaction.guild.id);
            
            if (guildGiveaways.length === 0) {
                return interaction.reply({ 
                    content: 'ℹ️ Keine aktiven Giveaways in diesem Server.',
                    ephemeral: true 
                });
            }
            
            const embed = new EmbedBuilder()
                .setTitle('📋 Aktive Giveaways')
                .setColor(0x6d4aff)
                .setFooter({ text: `${guildGiveaways.length} laufend | Gesamt: ${giveaways.length}` });
            
            guildGiveaways.forEach((g, index) => {
                const isHugosmp = g.hugosmp_amount > 0;
                
                embed.addFields({
                    name: `${index + 1}. \`${g.id}\` - ${g.title}`,
                    value: `🎁 ${isHugosmp ? '💰 HugoSMP Money' : g.prize}${isHugosmp ? ` (${g.hugosmp_amount}$/G)` : ''}\n` +
                           `⏱️ <t:${Math.floor(g.end_time/1000)}:R> | 👥 ${g.winner_count} Gewinner\n` +
                           `👤 Erstellt von <@${g.created_by}>`,
                    inline: false
                });
            });
            
            await interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('List Error:', error);
            await interaction.reply({ 
                content: '❌ Fehler beim Laden der Liste.',
                ephemeral: true 
            });
        }
    }
};