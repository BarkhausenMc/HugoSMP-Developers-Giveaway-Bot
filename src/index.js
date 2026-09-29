require('dotenv').config();
const { Client, GatewayIntentBits, Events, Partials, ActivityType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { endGiveaway, scheduleGiveawayEnd } = require('./utils/helpers');
const { stmts } = require('./database');
const config = require('./config');
const crypto = require('crypto');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel]
});

function loadScheduledGiveaways() {
    const active = stmts.getAllActive.all();
    active.forEach(giveaway => {
        if (giveaway.end_time > Date.now()) {
            scheduleGiveawayEnd(client, giveaway.id, giveaway.end_time);
        } else {
            setTimeout(() => endGiveaway(client, giveaway.id), 1000);
        }
    });
    console.log(`✅ ${active.length} aktive Giveaways geladen`);
}

// Commands laden
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(f => f.endsWith('.js'));
const commands = [];

commandFiles.forEach(file => {
    const command = require(path.join(__dirname, 'commands', file));
    if (command.data && command.execute) {
        commands.push(command.data.toJSON());
        console.log(`✓ ${command.data.name} geladen`);
    }
});

// Event Loading
const eventPath = path.join(__dirname, 'events');
if (fs.existsSync(eventPath)) {
    fs.readdir(eventPath, (err, files) => {
        files?.forEach(file => {
            if (file === 'ready.js' || file === 'error.js') {
                const event = require(path.join(eventPath, file));
                if (event.once) {
                    client.once(event.name, (...args) => event.execute(...args, client));
                } else {
                    client.on(event.name, (...args) => event.execute(...args, client));
                }
            }
        });
    });
}

client.once(Events.ClientReady, async () => {
    console.log('\n========================================');
    console.log(`🤖 ${client.user.tag} ist online!`);
    console.log(`📡 ID: ${client.user.id}`);
    console.log(`💜 Server: ${client.guilds.cache.size}`);
    console.log('========================================\n');
    
    client.user.setPresence({
        activities: [{ name: '/giveaway help', type: ActivityType.Playing }],
        status: 'online'
    });
    
    // Nur in TEST-Guild registrieren (nicht global!)
    if (process.env.GUILD_ID) {
        try {
            await client.application.commands.set(commands);
            console.log(`✅ ${commands.length} Commands in Guild ${process.env.GUILD_ID} registriert`);
        } catch (error) {
            console.error('❌ Command Register Fehler:', error);
        }
    }
    
    loadScheduledGiveaways();
});

// ⭐ ALLE INTERACTION HANDLER HIER IN EINER DATEI!
client.on(Events.InteractionCreate, async interaction => {
    
    // --- MODAL SUBMISSIONS ---
    if (interaction.isModalSubmit()) {
        
        // Normal Giveaway
        if (interaction.customId === 'giveaway_create_modal') {
            try {
                const timeStr = interaction.fields.getTextInputValue('time_input');
                const winnerCount = parseInt(interaction.fields.getTextInputValue('winner_input'));
                const prize = interaction.fields.getTextInputValue('prize_input');
                const title = interaction.fields.getTextInputValue('title_input') || '🎁 Giveaway';
                const description = interaction.fields.getTextInputValue('description_input') || '';
                
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
                    .setFooter({ text: 'Klicke auf "Teilnehmen"' })
                    .setTimestamp(new Date(endTime));
                
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`giveaway_join_${giveawayId}`)
                            .setLabel('Teilnehmen')
                            .setEmoji('🎉')
                            .setStyle(ButtonStyle.Primary)
                    );
                
                const msg = await interaction.channel.send({ embeds: [embed], components: [row] });
                
                stmts.insert.run(
                    giveawayId, msg.id, interaction.channel.id, interaction.guild.id,
                    prize, title, description, 0, Date.now(), endTime, winnerCount,
                    interaction.user.id, '[]', '[]'
                );
                
                scheduleGiveawayEnd(client, giveawayId, endTime);
                
                await interaction.reply({ 
                    content: `✅ **Giveaway erstellt!** ID: \`${giveawayId}\`\nEnde: <t:${Math.floor(endTime/1000)}:R>`,
                    ephemeral: true 
                });
            } catch (error) {
                await interaction.reply({ content: `❌ Fehler: ${error.message}`, ephemeral: true });
            }
        }
        
        // HugoSMP Modal
        if (interaction.customId === 'hugosmp_create_modal') {
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
                        { name: '💰 Gesamt', value: `**${totalAmount}$**`, inline: false },
                        { name: '🆔 ID', value: `\`${giveawayId}\``, inline: false }
                    )
                    .setFooter({ text: 'Klicke auf "Teilnehmen"' })
                    .setTimestamp(new Date(endTime));
                
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`giveaway_join_${giveawayId}`)
                            .setLabel('Teilnehmen')
                            .setEmoji('💰')
                            .setStyle(ButtonStyle.Success)
                    );
                
                const msg = await interaction.channel.send({ embeds: [embed], components: [row] });
                
                stmts.insert.run(
                    giveawayId, msg.id, interaction.channel.id, interaction.guild.id,
                    '💰 HugoSMP Money', title, description, amount, Date.now(), 
                    endTime, winnerCount, interaction.user.id, '[]', '[]'
                );
                
                scheduleGiveawayEnd(client, giveawayId, endTime);
                
                await interaction.reply({ 
                    content: `✅ **Money Giveaway erstellt!** ID: \`${giveawayId}\`\nGesamt: ${totalAmount}$`,
                    ephemeral: true 
                });
            } catch (error) {
                await interaction.reply({ content: `❌ Fehler: ${error.message}`, ephemeral: true });
            }
        }
        
        return; // Weiterverarbeitung stoppen
    }
    
    // --- BUTTON CLICKS ---
    if (interaction.isButton()) {
        if (interaction.customId.startsWith('giveaway_join_')) {
            const giveawayId = interaction.customId.replace('giveaway_join_', '');
            const giveaway = stmts.getById.get(giveawayId);
            
            if (!giveaway || giveaway.status !== 'active') {
                return interaction.reply({ content: '❌ Giveaway nicht aktiv!', ephemeral: true });
            }
            
            let participants = JSON.parse(giveaway.participants || '[]');
            if (participants.includes(interaction.user.id)) {
                return interaction.reply({ content: 'ℹ️ Bereits teilgenommen!', ephemeral: true });
            }
            
            participants.push(interaction.user.id);
            stmts.updateParticipants.run(JSON.stringify(participants), giveawayId);
            
            await interaction.deferUpdate();
            await interaction.followUp({ content: '✅ Teilnahme erfolgreich!', ephemeral: true });
            return;
        }
        
        if (interaction.customId.startsWith('giveaway_result_')) {
            const giveawayId = interaction.customId.replace('giveaway_result_', '');
            const giveaway = stmts.getById.get(giveawayId);
            if (!giveaway) {
                return interaction.reply({ content: '❌ Nicht gefunden!', ephemeral: true });
            }
            const winners = JSON.parse(giveaway.winners || '[]');
            const mentions = winners.map(id => `<@${id}>`).join(', ') || 'Keine';
            return interaction.reply({ content: `🏆 **Gewinner:** ${mentions}`, ephemeral: true });
        }
    }
    
    // --- COMMANDS LIST/REROLL/CANCEL ---
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'list') {
            return handleListCommand(interaction);
        }
        if (interaction.commandName === 'reroll') {
            const id = interaction.options.getString('id');
            return handleRerollCommand(interaction, id);
        }
        if (interaction.commandName === 'cancel') {
            const id = interaction.options.getString('id');
            return handleCancelCommand(interaction, id);
        }
    }
});

// Hilfsfunktion: Zeit parsen (in index.js weil hier gebraucht)
function parseTime(timeStr) {
    const regex = /^(\d+)([smhd])$/i;
    const match = timeStr.trim().toLowerCase().match(regex);
    if (!match) throw new Error('Format: 1h, 30m, 2d, 45s');
    const value = parseInt(match[1]);
    const unit = match[2];
    const mult = { s: 1, m: 60, h: 3600, d: 86400 };
    return Date.now() + (value * mult[unit] * 1000);
}

// List Command Handler
async function handleListCommand(interaction) {
    const giveaways = stmts.getActiveByGuild.all(interaction.guild.id);
    if (giveaways.length === 0) {
        return interaction.reply({ content: 'ℹ️ Keine aktiven Giveaways.', ephemeral: true });
    }
    
    const embed = new EmbedBuilder()
        .setTitle('📋 Aktive Giveaways')
        .setColor(0x6d4aff);
    
    giveaways.forEach((g, i) => {
        const isMoney = g.hugosmp_amount > 0;
        embed.addFields({
            name: `${i+1}. \`${g.id}\` - ${g.title}`,
            value: `🎁 ${isMoney ? `💰 ${g.hugosmp_amount}$/G` : g.prize}\n` +
                   `⏱️ <t:${Math.floor(g.end_time/1000)}:R> | 👥 ${g.winner_count} Gewinner`,
            inline: false
        });
    });
    
    interaction.reply({ embeds: [embed] });
}

// Reroll Command Handler
async function handleRerollCommand(interaction, id) {
    const { rerollGiveaway } = require('./utils/helpers');
    try {
        const newWinners = await rerollGiveaway(client, id);
        const mentions = newWinners.map(w => `<@${w}>`).join(', ');
        await interaction.reply({ content: `✅ **Reroll!** Gewinner: ${mentions}`, ephemeral: true });
    } catch (error) {
        await interaction.reply({ content: `❌ ${error.message}`, ephemeral: true });
    }
}

// Cancel Command Handler
async function handleCancelCommand(interaction, id) {
    stmts.updateStatus.run('cancelled', id);
    const giveaway = stmts.getById.get(id);
    if (giveaway) {
        const embed = new EmbedBuilder()
            .setTitle(giveaway.title)
            .setColor(0xff0000)
            .setDescription('⛔ **ABGEBROCHEN**')
            .setTimestamp();
        const msg = await interaction.channel.messages.fetch(giveaway.message_id).catch(() => null);
        if (msg) await msg.edit({ embeds: [embed] }).catch(() => {});
    }
    await interaction.reply({ content: `✅ Giveaway \`${id}\` abgebrochen.`, ephemeral: true });
}

if (!config.token) {
    console.error('❌ DISCORD_TOKEN fehlt!');
    process.exit(1);
}

client.login(config.token);