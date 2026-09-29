const cron = require('cron');
const config = require('../config');

/**
 * Zeitstring parsen (1h, 30m, 2d, 45s)
 */
function parseTime(timeStr) {
    const regex = /^(\d+)([smhd])$/;
    const match = timeStr.toLowerCase().trim().match(regex);
    
    if (!match) {
        throw new Error('Ungültiges Format! Verwende: 1h, 30m, 2d, 45s');
    }
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    const multipliers = {
        s: 1,      // Sekunden
        m: 60,     // Minuten
        h: 3600,   // Stunden
        d: 86400   // Tage
    };
    
    return Date.now() + (value * multipliers[unit] * 1000);
}

/**
 * Zufällige Gewinner auswählen
 */
function selectRandomWinners(participants, count) {
    if (!Array.isArray(participants) || participants.length === 0) {
        return [];
    }
    
    // Klonen und mischen
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Discord Timestamp Format
 */
function getTimestampString(timestamp) {
    return `<t:${Math.floor(timestamp / 1000)}:R>`;
}

/**
 * Cron Job für Giveaway-Ende
 */
function scheduleGiveawayEnd(client, giveawayId, endTime) {
    const delay = endTime - Date.now();
    
    if (delay <= 0) {
        return null;
    }
    
    const job = new cron.CronJob(
        new Date(endTime),
        async () => {
            try {
                await endGiveaway(client, giveawayId);
                job.stop();
            } catch (error) {
                console.error(`Fehler beim Beenden Giveaway ${giveawayId}:`, error);
            }
        },
        null,
        false,
        'Europe/Berlin'
    );
    
    job.start();
    return job;
}

/**
 * Giveaway beenden - Hauptlogik
 */
async function endGiveaway(client, giveawayId) {
    const { stmts } = require('../database');
    const giveaway = stmts.getById.get(giveawayId);
    
    if (!giveaway || giveaway.status !== 'active') {
        return;
    }
    
    const participants = JSON.parse(giveaway.participants || '[]');
    
    // Keine Teilnehmer? Abbrechen
    if (participants.length === 0) {
        stmts.updateStatus.run('cancelled', giveawayId);
        
        const channel = client.channels.cache.get(giveaway.channel_id);
        if (channel) {
            try {
                const msg = await channel.messages.fetch(giveaway.message_id).catch(() => null);
                if (msg) {
                    await msg.delete().catch(() => {});
                }
            } catch (e) {
                // Ignorieren
            }
        }
        
        console.log(`⚠️ Giveaway ${giveawayId} abgebrochen - keine Teilnehmer`);
        return;
    }
    
    // Gewinner auswählen
    const winners = selectRandomWinners(participants, giveaway.winner_count);
    const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
    
    // Status & Gewinner in DB speichern
    stmts.updateWinners.run(
        JSON.stringify(winners),
        'completed',
        giveawayId
    );
    
    // Embed aktualisieren
    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    
    const embed = new EmbedBuilder()
        .setTitle(giveaway.title)
        .setDescription(giveaway.description || '')
        .setColor(0x00ff00)
        .addFields(
            { name: '🎉 Gewinner', value: winnerMentions || 'Keine', inline: true },
            { name: '🎁 Preis', value: `${giveaway.prize}${giveaway.hugosmp_amount > 0 ? ` (${giveaway.hugosmp_amount}$)` : ''}`, inline: true },
            { name: '👥 Teilnehmer', value: `${participants.length}`, inline: true }
        )
        .setFooter({ text: 'Giveaway beendet' })
        .setTimestamp();
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`giveaway_result_${giveawayId}`)
                .setLabel('Ergebnis')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success)
                .setDisabled(true)
        );
    
    // Channel Nachricht updaten
    const channel = client.channels.cache.get(giveaway.channel_id);
    if (channel) {
        try {
            const msg = await channel.messages.fetch(giveaway.message_id).catch(() => null);
            if (msg) {
                await msg.edit({ embeds: [embed], components: [row] }).catch(() => {});
            }
        } catch (e) {
            console.error(`Konnte Nachricht ${giveaway.message_id} nicht updaten:`, e.message);
        }
    }
    
    // DM an Gewinner senden
    for (const winnerId of winners) {
        try {
            const user = await client.users.fetch(winnerId);
            await user.send(`🎊 **Herzlichen Glückwunsch!**\n\n` +
                `Du hast gewonnen!\n` +
                `**Preis:** ${giveaway.prize}${giveaway.hugosmp_amount > 0 ? ` (${giveaway.hugosmp_amount}$)` : ''}\n` +
                `**ID:** \`${giveawayId}\`\n\n` +
                `Bitte kontaktiere einen Admin, um deinen Gewinn abzuholen.`
            );
        } catch (e) {
            // User erlaubt keine DMs
        }
    }
    
    // HugoSMP Money Rolle hinzufügen (falls zutreffend)
    if (giveaway.hugosmp_amount > 0 && config.giveawayRoleId) {
        const guild = client.guilds.cache.first(); // Oder spezifischen Guild suchen
        if (guild) {
            const role = guild.roles.cache.get(config.giveawayRoleId);
            if (role) {
                for (const winnerId of winners) {
                    try {
                        const member = await guild.members.fetch(winnerId).catch(() => null);
                        if (member && !member.roles.cache.has(role.id)) {
                            await member.roles.add(role).catch(() => {});
                        }
                    } catch (e) {
                        // Member nicht gefunden
                    }
                }
            }
        }
    }
    
    console.log(`✅ Giveaway ${giveawayId} abgeschlossen - Gewinner: ${winnerMentions}`);
}

/**
 * Neuen Gewinner aus abgeschlossenem Giveaway rollen
 */
async function rerollGiveaway(client, giveawayId) {
    const { stmts } = require('../database');
    const giveaway = stmts.getById.get(giveawayId);
    
    if (!giveaway) {
        throw new Error('Giveaway nicht gefunden!');
    }
    
    if (giveaway.status !== 'completed') {
        throw new Error('Nur abgeschlossene Giveaways können neu gerollt werden!');
    }
    
    const participants = JSON.parse(giveaway.participants || '[]');
    
    if (participants.length === 0) {
        throw new Error('Keine Teilnehmer zum Neuziehen!');
    }
    
    // Alte Gewinner entfernen aus Teilnehmern für faire Neuauswahl
    const oldWinners = JSON.parse(giveaway.winners || '[]');
    const eligible = participants.filter(id => !oldWinners.includes(id));
    
    if (eligible.length === 0) {
        throw new Error('Alle Teilnehmer waren bereits Gewinner!');
    }
    
    const newWinners = selectRandomWinners(eligible, giveaway.winner_count);
    
    // Gewinner aktualisieren
    stmts.updateWinners.run(
        JSON.stringify(newWinners),
        'completed',
        giveawayId
    );
    
    return newWinners;
}

module.exports = {
    parseTime,
    selectRandomWinners,
    getTimestampString,
    scheduleGiveawayEnd,
    endGiveaway,
    rerollGiveaway
};