const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { stmts } = require('../database');
const { rerollGiveaway } = require('../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reroll')
        .setDescription('Neue Gewinner aus einem abgeschlossenen Giveaway ziehen')
        .addStringOption(opt => opt
            .setName('id')
            .setRequired(true)
            .setDescription('Giveaway ID (z.B. a1b2c3d4)')),
    
    async execute(interaction) {
        try {
            if (!interaction.member.permissions.has('ManageMessages') && interaction.user.id !== config.ownerId) {
                return interaction.reply({ 
                    content: '❌ Nur Moderatoren oder Owner dürfen rerollen!', 
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
            
            if (giveaway.status !== 'completed') {
                return interaction.reply({ 
                    content: '❌ Nur abgeschlossene Giveaways können neu gerollt werden!',
                    ephemeral: true 
                });
            }
            
            const { client } = interaction;
            const newWinners = await rerollGiveaway(client, giveawayId);
            const winnerMentions = newWinners.map(id => `<@${id}>`).join(', ');
            
            // Embed updaten
            const embed = new EmbedBuilder()
                .setTitle(`${giveaway.title} - NEU GEROLLED`)
                .setDescription(giveaway.description || '')
                .setColor(0xffaa00)
                .addFields(
                    { name: '🎉 Neue Gewinner', value: winnerMentions || 'Keine', inline: true },
                    { name: '🎁 Preis', value: `${giveaway.prize}${giveaway.hugosmp_amount > 0 ? ` (${giveaway.hugosmp_amount}$)` : ''}`, inline: true }
                )
                .setFooter({ text: 'Reroll durchgeführt von ' + interaction.user.username })
                .setTimestamp();
            
            const channel = interaction.client.channels.cache.get(giveaway.channel_id);
            if (channel) {
                try {
                    const msg = await channel.messages.fetch(giveaway.message_id).catch(() => null);
                    if (msg) {
                        const row = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`giveaway_rerolled_${giveawayId}`)
                                    .setLabel('Neu Gerollt')
                                    .setEmoji('🔄')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setDisabled(true)
                            );
                        
                        await msg.edit({ embeds: [embed], components: [row] }).catch(() => {});
                    }
                } catch (e) {
                    // Nachricht nicht verfügbar
                }
            }
            
            // DM an neue Gewinner
            for (const winnerId of newWinners) {
                try {
                    const user = await interaction.client.users.fetch(winnerId);
                    await user.send(`🎊 **Reroll Gewinner!**\n\n` +
                        `Giveaway ID: \`${giveawayId}\`\n` +
                        `Preis: ${giveaway.prize}${giveaway.hugosmp_amount > 0 ? ` (${giveaway.hugosmp_amount}$)` : ''}\n\n` +
                        `Bitte kontaktiere einen Admin.`
                    );
                } catch (e) {
                    // DM nicht möglich
                }
            }
            
            await interaction.reply({ 
                content: `✅ **Reroll erfolgreich!**\n**Neue Gewinner:** ${winnerMentions}`,
                ephemeral: true 
            });
            
        } catch (error) {
            console.error('Reroll Error:', error);
            await interaction.reply({ 
                content: `❌ Fehler: ${error.message}`,
                ephemeral: true 
            });
        }
    }
};