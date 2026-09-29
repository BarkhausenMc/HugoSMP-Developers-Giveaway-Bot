const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { stmts } = require('../database');
const { parseTime, scheduleGiveawayEnd } = require('../utils/helpers');
const crypto = require('crypto');
const config = require('../config');

module.exports = {
    name: 'interactionCreate',
    once: false,
    
    async execute(interaction, client) {
        if (!interaction.isModalSubmit()) return;
        
        // Normal Giveaway Modal
        if (interaction.customId === 'giveaway_create_modal') {
            await handleNormalGiveaway(interaction, client);
        }
        
        // HugoSMP Money Modal
        if (interaction.customId === 'hugosmp_create_modal') {
            await handleHugosmpGiveaway(interaction, client);
        }
    }
};

async function handleNormalGiveaway(interaction, client) {
    try {
        const timeStr = interaction.fields.getTextInputValue('time_input');
        const winnerCount = parseInt(interaction.fields.getTextInputValue('winner_input'));
        const prize = interaction.fields.getTextInputValue('prize_input');
        const title = interaction.fields.getTextInputValue('title_input') || '🎁 Giveaway';
        const description = interaction.fields.getTextInputValue('description_input') || '';
        
        // Validierung
        if (isNaN(winnerCount) || winnerCount < 1 || winnerCount > 100) {
            throw new Error('Gewinneranzahl muss zwischen 1-100 liegen!');
        }
        
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
            .setFooter({ text: 'Klicke auf "Teilnehmen" um mitzumachen!' })
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
        
        scheduleGiveawayEnd(client, giveawayId, endTime);
        
        await interaction.reply({ 
            content: `✅ **Giveaway erstellt!**\n\n**ID:** \`${giveawayId}\`\n**Ende:** <t:${Math.floor(endTime/1000)}:R>`,
            ephemeral: true 
        });
        
    } catch (error) {
        console.error('Modal Giveaway Error:', error);
        await interaction.reply({ 
            content: `❌ Fehler: ${error.message}`,
            ephemeral: true 
        });
    }
}

async function handleHugosmpGiveaway(interaction, client) {
    try {
        const timeStr = interaction.fields.getTextInputValue('time_input');
        const winnerCount = parseInt(interaction.fields.getTextInputValue('winner_input'));
        const amount = parseInt(interaction.fields.getTextInputValue('amount_input'));
        const title = interaction.fields.getTextInputValue('title_input') || '💰 HugoSMP Money Giveaway';
        const description = interaction.fields.getTextInputValue('description_input') || '';
        
        if (isNaN(winnerCount) || winnerCount < 1 || winnerCount > 100) {
            throw new Error('Gewinneranzahl muss zwischen 1-100 liegen!');
        }
        
        if (isNaN(amount) || amount < 1) {
            throw new Error('Bitte gültigen Betrag eingeben!');
        }
        
        const endTime = parseTime(timeStr);
        const giveawayId = crypto.randomUUID().slice(0, 8);
        const totalAmount = amount * winnerCount;
        
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
        
        scheduleGiveawayEnd(client, giveawayId, endTime);
        
        await interaction.reply({ 
            content: `✅ **HugoSMP Money Giveaway erstellt!**\n\n**ID:** \`${giveawayId}\`\n**Gesamt:** ${totalAmount}$ auf ${winnerCount} Gewinner`,
            ephemeral: true 
        });
        
    } catch (error) {
        console.error('Hugosmp Modal Error:', error);
        await interaction.reply({ 
            content: `❌ Fehler: ${error.message}`,
            ephemeral: true 
        });
    }
}