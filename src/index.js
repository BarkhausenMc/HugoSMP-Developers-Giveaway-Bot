require('dotenv').config();
const { Client, GatewayIntentBits, Events, Partials, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { endGiveaway } = require('./utils/helpers');
const { db } = require('./database');
const config = require('./config');

// Client Initialisierung
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// Laufzeit-Giveaways laden (falls Bot neu gestartet wird)
function loadScheduledGiveaways() {
    const { stmts } = require('./database');
    const active = stmts.getAllActive.all();
    
    const now = Date.now();
    active.forEach(giveaway => {
        if (giveaway.end_time > now) {
            const { scheduleGiveawayEnd } = require('./utils/helpers');
            scheduleGiveawayEnd(client, giveaway.id, giveaway.end_time);
            console.log(`⏰ Geplanter Giveaway ${giveaway.id} geladen (endet: ${new Date(giveaway.end_time).toLocaleString()})`);
        } else {
            // Verpasstes Ende? Manuelles Trigger
            setTimeout(() => endGiveaway(client, giveaway.id), 1000);
        }
    });
    
    console.log(`✅ ${active.length} aktive Giveaways geladen`);
}

// Commands laden
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(f => f.endsWith('.js'));
const commands = [];

console.log('\n📦 Lade Kommandos...\n');
commandFiles.forEach(file => {
    const command = require(path.join(__dirname, 'commands', file));
    if (command.data && command.execute) {
        commands.push(command.data.toJSON());
        console.log(`✓ ${command.data.name} geladen`);
    }
});

// Events laden
const eventFiles = fs.readdirSync(path.join(__dirname, 'events')).filter(f => f.endsWith('.js'));
eventFiles.forEach(file => {
    const event = require(path.join(__dirname, 'events', file));
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
});

// Ready Event
client.once(Events.ClientReady, async () => {
    console.log('\n========================================');
    console.log(`🤖 ${client.user.tag} ist online!`);
    console.log(`📡 ID: ${client.user.id}`);
    console.log(`💜 Server: ${client.guilds.cache.size}`);
    console.log(`========================================\n`);
    
    // Bot Status setzen
    client.user.setPresence({
        activities: [{ name: '/giveaway help', type: ActivityType.Playing }],
        status: 'online'
    });
    
    // Slash Commands registrieren
    if (commands.length > 0) {
        try {
            console.log(`🔄 Registriere ${commands.length} Slash Commands...`);
            
            // Globale Registrierung
            await client.application.commands.set(commands);
            console.log('✅ Globale Commands registriert');
            
            // Optional: Auch in jeder Guild registrieren (für schnelleres Testing)
            client.guilds.cache.forEach(guild => {
                guild.commands.set(commands).catch(() => {});
            });
            
        } catch (error) {
            console.error('❌ Fehler beim Registrieren:', error);
        }
    }
    
    // Ausstehende Giveaways laden
    loadScheduledGiveaways();
});

// Button Interaction Handler
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton()) return;
    
    if (interaction.customId.startsWith('giveaway_join_')) {
        const giveawayId = interaction.customId.replace('giveaway_join_', '');
        
        if (!interaction.inCachedGuild()) {
            return interaction.reply({ content: '❌ Dies funktioniert nur in einer Guild!', ephemeral: true });
        }
        
        const { stmts } = require('./database');
        const giveaway = stmts.getById.get(giveawayId);
        
        if (!giveaway || giveaway.status !== 'active') {
            return interaction.reply({ content: '❌ Dieses Giveaway existiert nicht oder ist beendet!', ephemeral: true });
        }
        
        let participants = JSON.parse(giveaway.participants || '[]');
        
        if (participants.includes(interaction.user.id)) {
            return interaction.reply({ content: 'ℹ️ Du hast bereits teilgenommen!', ephemeral: true });
        }
        
        participants.push(interaction.user.id);
        
        stmts.updateParticipants.run(JSON.stringify(participants), giveawayId);
        
        await interaction.deferUpdate();
        await interaction.followUp({ 
            content: `✅ **Teilnahme erfolgreich!**\nID: \`${giveawayId}\``, 
            ephemeral: true 
        });
    }
    
    // Ergebnis Button (für abgelaufene Giveaways)
    if (interaction.customId.startsWith('giveaway_result_')) {
        const giveawayId = interaction.customId.replace('giveaway_result_', '');
        const { stmts } = require('./database');
        const giveaway = stmts.getById.get(giveawayId);
        
        if (!giveaway) {
            return interaction.reply({ content: '❌ Nicht gefunden!', ephemeral: true });
        }
        
        const winners = JSON.parse(giveaway.winners || '[]');
        const winnerMentions = winners.map(id => `<@${id}>`).join(', ') || 'Keine';
        
        return interaction.reply({
            content: `🏆 **Gewinner:** ${winnerMentions}`,
            ephemeral: true
        });
    }
});

// Fehlerbehandlung
process.on('unhandledRejection', error => {
    console.error('⚠️ Unhandled Promise Rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('⚠️ Uncaught Exception:', error);
    process.exit(1);
});

// Login
if (!config.token) {
    console.error('❌ DISCORD_TOKEN fehlt in .env!');
    process.exit(1);
}

client.login(config.token);