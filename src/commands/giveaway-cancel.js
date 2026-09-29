const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cancel')
        .setDescription('Ein aktives Giveaway abbrechen')
        .addStringOption(opt => opt
            .setName('id')
            .setRequired(true)
            .setDescription('Giveaway ID')),
    
    async execute(interaction) {
        try {
            if (!interaction.member.permissions.has('ManageMessages') && interaction.user.id !== config.ownerId) {
                return interaction.reply({ 
                    content: '❌ Nur Moderatoren oder Owner dürfen Giveaways abbrechen!', 
                    ephemeral: true 
                });
            }
            
            const giveawayId = interaction.options.getString('id');
            const giveaway = stmts.getById.get(giveawayId);
            
            if (!giveaway) {
                return interaction.reply({ 
                    content: '❌ Giveaway nicht gefunden!',
                    ephemeral: true 
                });
            }
            
            if (giveaway.status !== 'active') {
                return interaction.reply({ 
                    content: '❌ Nur aktive Giveaways können abgebrochen werden!',
                    ephemeral: true 
                });
            }
            
            // Status ändern
            stmts.updateStatus.run('cancelled', giveawayId);
            
            // Embed updaten
            const embed = new EmbedBuilder()
                .setTitle(giveaway.title)
                .setDescription(giveaway.description || '')
                .setColor(0xff0000)
                .addFields(
                    { name: '⛔ Status', value: '**ABGEBROCHEN**', inline: false },
                    { name: '🎁 Ursprünglicher Preis', value: `${giveaway.prize}${giveaway.hugosmp_amount > 0 ? ` (${giveaway.hugosmp_amount}$)` : ''}`, inline: false }
                )
                .setFooter({ text: 'Abgebrochen von ' + interaction.user.username })
                .setTimestamp();
            
            const channel = interaction.client.channels.cache.get(giveaway.channel_id);
            if (channel) {
                try {
                    const msg = await channel.messages.fetch(giveaway.message_id).catch(() => null);
                    if (msg) {
                        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
                        const row = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('giveaway_cancelled')
                                    .setLabel('Abgebrochen')
                                    .setEmoji('🚫')
                                    .setStyle(ButtonStyle.Danger)
                                    .setDisabled(true)
                            );
                        
                        await msg.edit({ embeds: [embed], components: [row] }).catch(() => {});
                    }
                } catch (e) {
                    // Nachricht nicht verfügbar
                }
            }
            
            await interaction.reply({ 
                content: `✅ Giveaway \`${giveawayId}\` wurde abgebrochen.`,
                ephemeral: true 
            });
            
        } catch (error) {
            console.error('Cancel Error:', error);
            await interaction.reply({ 
                content: `❌ Fehler: ${error.message}`,
                ephemeral: true 
            });
        }
    }
};