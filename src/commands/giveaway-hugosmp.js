const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const crypto = require('crypto');
const { stmts } = require('../database');
const { parseTime, scheduleGiveawayEnd } = require('../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hugosmp')
        .setDescription('Erstelle ein HugoSMP Money Giveaway 💰')
        .addStringOption(opt => opt
            .setName('time')
            .setRequired(true)
            .setDescription('Dauer (z.B. 1h, 30m, 2d)'))
        .addIntegerOption(opt => opt
            .setName('winners')
            .setRequired(true)
            .setDescription('Anzahl Gewinner')
            .setMinValue(1)
            .setMaxValue(100))
        .addIntegerOption(opt => opt
            .setName('amount')
            .setRequired(true)
            .setDescription('HugoSMP Geldbetrag pro Gewinner')
            .setMinValue(1)
            .setMaxValue(1000000))
        .addStringOption(opt => opt
            .setName('title')
            .setDescription('Titel (optional)')
            .setMaxLength(256))
        .addStringOption(opt => opt
            .setName('description')
            .setDescription('Zusätzliche Regeln')
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
            const amount = interaction.options.getInteger('amount');
            const title = interaction.options.getString('title') || '💰 HugoSMP Money Giveaway';
            const description = interaction.options.getString('description') || '';
            const totalAmount = amount * winnerCount;
            
            const endTime = parseTime(timeStr);
            const giveawayId = crypto.randomUUID().slice(0, 8);
            
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor(0xffa500)
                .addFields(
                    { name: '⏱️ Ende', value: `<t:${Math.floor(endTime/1000)}:R>`, inline: true },
                    { name: '🏆 Gewinner', value: `${winnerCount}`, inline: true },
                    { name: '💸 Je Gewinner', value: `**${amount}$**`, inline: true },
                    { name: '💰 Gesamtbetrag', value: `**${totalAmount}$**`, inline: false },
                    { name: '🆔 ID', value: `\`${giveawayId}\``, inline: false }
                )
                .setFooter({ text: 'Klicke auf "Teilnehmen" um mitzumachen!' })
                .setTimestamp(new Date(endTime));
            
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`giveaway_join_${giveawayId}`)
                        .setLabel('Teilnehmen')
                        .setEmoji('💰')
                        .setStyle(ButtonStyle.Success)
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
                '💰 HugoSMP Money',
                title,
                description,
                amount,
                Date.now(),
                endTime,
                winnerCount,
                interaction.user.id,
                '[]',
                '[]'
            );
            
            scheduleGiveawayEnd(interaction.client, giveawayId, endTime);
            
            await interaction.reply({ 
                content: `✅ **HugoSMP Money Giveaway erstellt!**\n\n**ID:** \`${giveawayId}\`\n**Gesamt:** ${totalAmount}$ auf ${winnerCount} Gewinner`,
                ephemeral: true 
            });
            
        } catch (error) {
            console.error('HugoSMP Error:', error);
            await interaction.reply({ 
                content: `❌ Fehler: ${error.message}`,
                ephemeral: true 
            });
        }
    }
};