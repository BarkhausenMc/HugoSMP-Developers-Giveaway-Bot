const {
    ContainerBuilder,
    TextDisplayBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
} = require('discord.js');

// Temporärer Speicher für Giveaways
// Später ersetzen wir das durch eine Datenbank.
const giveaways = new Map();

module.exports = async (interaction) => {
    try {
        /*
         * ==========================================
         * SLASH COMMAND
         * ==========================================
         */

        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === 'giveaway') {
                const giveawayCommand = require('../commands/giveaway');

                await giveawayCommand.execute(interaction);
            }

            return;
        }

        /*
         * ==========================================
         * MODAL
         * ==========================================
         */

        if (interaction.isModalSubmit()) {
            if (interaction.customId !== 'giveaway_create_modal') {
                return;
            }

            // Sicherheitshalber auch hier nochmal die Rolle prüfen
            const roleId = process.env.GIVEAWAY_ROLE_ID;

            if (!interaction.member.roles.cache.has(roleId)) {
                return interaction.reply({
                    content: '❌ Du hast keine Berechtigung, Giveaways zu erstellen.',
                    ephemeral: true,
                });
            }

            const prize = interaction.fields.getTextInputValue(
                'giveaway_prize'
            );

            const durationText = interaction.fields.getTextInputValue(
                'giveaway_duration'
            );

            const winnersText = interaction.fields.getTextInputValue(
                'giveaway_winners'
            );

            /*
             * ==========================================
             * DAUER PARSEN
             * ==========================================
             */

            const duration = parseDuration(durationText);

            if (!duration) {
                return interaction.reply({
                    content:
                        '❌ Ungültige Dauer.\n\n' +
                        'Beispiele: `30m`, `1h`, `2d`',
                    ephemeral: true,
                });
            }

            /*
             * ==========================================
             * GEWINNER ANZAHL
             * ==========================================
             */

            const winnerCount = Number(winnersText);

            if (
                !Number.isInteger(winnerCount) ||
                winnerCount < 1 ||
                winnerCount > 100
            ) {
                return interaction.reply({
                    content:
                        '❌ Die Anzahl der Gewinner muss eine Zahl zwischen 1 und 100 sein.',
                    ephemeral: true,
                });
            }

            /*
             * ==========================================
             * ZEIT BERECHNEN
             * ==========================================
             */

            const endsAt = Date.now() + duration;

            /*
             * ==========================================
             * GIVEAWAY ID
             * ==========================================
             */

            const giveawayId = crypto.randomUUID();

            /*
             * ==========================================
             * GIVEAWAY SPEICHERN
             * ==========================================
             */

            giveaways.set(giveawayId, {
                id: giveawayId,

                guildId: interaction.guildId,
                channelId: interaction.channelId,

                hostId: interaction.user.id,

                prize,
                winnerCount,

                endsAt,

                participants: [],
            });

            /*
             * ==========================================
             * COMPONENTS V2
             * ==========================================
             */

            const container = createGiveawayContainer({
                giveawayId,
                prize,
                winnerCount,
                endsAt,
                hostId: interaction.user.id,
            });

            const message = await interaction.channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
            });

            /*
             * Message ID speichern
             */

            const giveaway = giveaways.get(giveawayId);

            giveaway.messageId = message.id;

            /*
             * Bestätigung an Ersteller
             */

            await interaction.reply({
                content: '✅ Giveaway wurde erfolgreich erstellt!',
                ephemeral: true,
            });

            /*
             * ==========================================
             * TIMER
             * ==========================================
             */

            setTimeout(async () => {
                await endGiveaway(giveawayId);
            }, duration);

            return;
        }

        /*
         * ==========================================
         * BUTTON
         * ==========================================
         */

        if (interaction.isButton()) {
            if (!interaction.customId.startsWith('giveaway_join:')) {
                return;
            }

            const giveawayId = interaction.customId.split(':')[1];

            const giveaway = giveaways.get(giveawayId);

            if (!giveaway) {
                return interaction.reply({
                    content: '❌ Dieses Giveaway existiert nicht mehr.',
                    ephemeral: true,
                });
            }

            /*
             * Prüfen, ob Giveaway beendet ist
             */

            if (Date.now() >= giveaway.endsAt) {
                return interaction.reply({
                    content: '❌ Dieses Giveaway ist bereits beendet.',
                    ephemeral: true,
                });
            }

            /*
             * Prüfen, ob User bereits teilnimmt
             */

            if (giveaway.participants.includes(interaction.user.id)) {
                return interaction.reply({
                    content: '❌ Du nimmst bereits an diesem Giveaway teil.',
                    ephemeral: true,
                });
            }

            /*
             * User hinzufügen
             */

            giveaway.participants.push(interaction.user.id);

            await interaction.reply({
                content: '🎉 Du nimmst jetzt am Giveaway teil!',
                ephemeral: true,
            });

            return;
        }
    } catch (error) {
        console.error('❌ Interaction Error:', error);

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: '❌ Es ist ein Fehler aufgetreten.',
                ephemeral: true,
            }).catch(() => {});
        } else {
            await interaction.reply({
                content: '❌ Es ist ein Fehler aufgetreten.',
                ephemeral: true,
            }).catch(() => {});
        }
    }
};


/*
 * ==========================================
 * DAUER PARSER
 * ==========================================
 *
 * Unterstützt:
 *
 * 30s
 * 10m
 * 1h
 * 2d
 *
 */

function parseDuration(input) {
    const match = input
        .trim()
        .toLowerCase()
        .match(/^(\d+)(s|m|h|d)$/);

    if (!match) {
        return null;
    }

    const amount = Number(match[1]);
    const unit = match[2];

    if (amount <= 0) {
        return null;
    }

    const multipliers = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
    };

    const duration = amount * multipliers[unit];

    /*
     * Optionales Maximum:
     * 30 Tage
     */

    const maxDuration = 30 * 24 * 60 * 60 * 1000;

    if (duration > maxDuration) {
        return null;
    }

    return duration;
}


/*
 * ==========================================
 * GIVEAWAY COMPONENT
 * ==========================================
 */

function createGiveawayContainer({
    giveawayId,
    prize,
    winnerCount,
    endsAt,
    hostId,
}) {
    const container = new ContainerBuilder();

    const endTimestamp = Math.floor(endsAt / 1000);

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `# 🎉 Giveaway\n\n` +
            `## 🎁 ${prize}\n\n` +
            `👑 **Veranstalter:** <@${hostId}>\n\n` +
            `🏆 **Gewinner:** ${winnerCount}\n\n` +
            `⏰ **Endet:** <t:${endTimestamp}:R>\n\n` +
            `Klicke auf **Teilnehmen**, um am Giveaway teilzunehmen!`
        )
    );

    container.addActionRowComponents(
        row =>
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`giveaway_join:${giveawayId}`)
                    .setLabel('🎉 Teilnehmen')
                    .setStyle(ButtonStyle.Primary)
            )
    );

    return container;
}


/*
 * ==========================================
 * GIVEAWAY BEENDEN
 * ==========================================
 */

async function endGiveaway(giveawayId) {
    const giveaway = giveaways.get(giveawayId);

    if (!giveaway) {
        return;
    }

    try {
        const guild = await global.client.guilds.fetch(giveaway.guildId);

        const channel = await guild.channels.fetch(
            giveaway.channelId
        );

        if (!channel) {
            giveaways.delete(giveawayId);
            return;
        }

        /*
         * Keine Teilnehmer
         */

        if (giveaway.participants.length === 0) {
            await channel.send({
                content:
                    `🎉 Das Giveaway **${giveaway.prize}** ist beendet!\n\n` +
                    `😕 Es gab keine Teilnehmer.`,
            });

            giveaways.delete(giveawayId);

            return;
        }

        /*
         * Teilnehmer kopieren
         */

        const participants = [...giveaway.participants];

        /*
         * Teilnehmer mischen
         */

        shuffleArray(participants);

        /*
         * Gewinner auswählen
         */

        const winners = participants.slice(
            0,
            Math.min(
                giveaway.winnerCount,
                participants.length
            )
        );

        const winnerMentions = winners
            .map(userId => `<@${userId}>`)
            .join(', ');

        /*
         * Ergebnis senden
         */

        await channel.send({
            content:
                `# 🎉 Giveaway beendet!\n\n` +
                `🎁 **Preis:** ${giveaway.prize}\n\n` +
                `🏆 **Gewinner:** ${winnerMentions}\n\n` +
                `Herzlichen Glückwunsch! 🎉`,
        });

        /*
         * Giveaway löschen
         */

        giveaways.delete(giveawayId);

    } catch (error) {
        console.error(
            `Fehler beim Beenden des Giveaways ${giveawayId}:`,
            error
        );

        giveaways.delete(giveawayId);
    }
}


/*
 * ==========================================
 * ARRAY SHUFFLE
 * ==========================================
 */

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [array[i], array[j]] = [array[j], array[i]];
    }
}
