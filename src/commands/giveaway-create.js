const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const crypto = require('crypto');
const { stmts } = require('../database');
const { parseTime, scheduleGiveawayEnd } = require('../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('create')
        .setDescription('Erstelle ein normales Giveaway')
        .addStringOption(opt => opt
            .setName('time')
            .setRequired(true)
            .setDescription('Dauer (z.B. 1h, 30m, 2d, 45s)')
            .addChoices(
                { name: '30 Minuten', value: '30m' },
                { name: '1 Stunde', value: '1h' },
                { name: '6 Stunden', value: '6h' },
                { name: '12 Stunden', value: '12h' },
                { name: '24 Stunden', value: '24h' },
                { name: '2 Tage', value: '2d' },
                { name: '7 Tage', value: '7d' }
            ))
        .addIntegerOption(opt => opt
            .setName('winners')
            .setRequired(true)
            .setDescription('Anzahl Gewinner')
            .setMinValue(1)
            .setMaxValue(100))
        .addStringOption(opt => opt
            .setName('prize')
            .setRequired(true)
            .setDescription('Was wird verlost?')
            .setMaxLength(100))
        .addStringOption(opt => opt
            .setName('title')
            .setDescription('Titel (optional)')
            .setMaxLength(256))
        .addStringOption(opt => opt
            .setName('description')
            .setDescription('Zusätzliche Regeln/Beschreibung')
            .setMaxLength(1024)),
    
    async execute(interaction) {
        try {
            if (!interaction.member.permissions.has('ManageMessages')) {
                return interaction.reply({ 
                    content: '❌ Du brauchst `Manage Messages` Permission!', 
                    ephemeral: true 
                });
            }
            
            const timeStr = interaction.options.getString('time');
            const winnerCount = interaction.options.getInteger('winners');
            const prize = interaction.options.getString('prize');
            const title = interaction.options.getString('title') || '🎁 Giveaway';
            const description = interaction.options.getString('description') || '';
            
            const endTime = parseTime(timeStr);
            const giveawayId = crypto.randomUUID().slice(0, 8);
            
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor(0x6d4aff)
                .addFields(
                    { name: '⏱️ Ende', value: `<t:${Math.floor(endTime/1000)}:R>`, inline: true },
                    { name: '🏆 Gewinner', value: `${winnerCount}`, inline: true },
                    { name: '🎁 Preis', value: prize, inline: true },
                    { name: '🆔 ID', value: `\`${giveawayId}\``, inline: false }
                )
                .setFooter({ text: 'Reagiere mit 🎉 um teilzunehmen!' })
                .setTimestamp(new Date(endTime));
            
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`giveaway_join_${giveawayId}`)
                        .setLabel('Teilnehmen')
                        .setEmoji('🎉')
                        .setStyle(ButtonStyle.Primary)
                );
            
            const msg = await interaction.channel.send({ 
                embeds: [embed], 
                components: [row] 
            });
            
            stmts.insert.run(
                giveawayId,
                msg.id,
                interaction.channel.id,
                interaction.guild.id,
                prize,
                title,
                description,
                0,
                Date.now(),
                endTime,
                winnerCount,
                interaction.user.id,
                '[]',
                '[]'
            );
            
            scheduleGiveawayEnd(interaction.client, giveawayId, endTime);
            
            await interaction.reply({ 
                content: `✅ **Giveaway erstellt!**\n\n**ID:** \`${giveawayId}\`\n**Ende:** <t:${Math.floor(endTime/1000)}:R>`,
                ephemeral: true 
            });
            
        } catch (error) {
            console.error('Giveaway Create Error:', error);
            await interaction.reply({ 
                content: `❌ Fehler: ${error.message}`,
                ephemeral: true 
            });
        }
    }
};