const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const { DateTime } = require("luxon");

const TIMEZONE = process.env.TIMEZONE || "Europe/Berlin";

/**
 * Erstellt den Giveaway-Container.
 */
function buildGiveawayContainer(giveaway, participantCount, disabled = false) {
    const endDate = DateTime
        .fromMillis(giveaway.end_at)
        .setZone(TIMEZONE);

    const unixTimestamp = Math.floor(giveaway.end_at / 1000);

    const container = new ContainerBuilder()
        .setAccentColor(disabled ? 0x808080 : 0x5865F2)

        .addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(`## 🎉 Giveaway #${giveaway.id}`)
        )

        .addSeparatorComponents(
            new SeparatorBuilder()
                .setDivider(true)
        )

        .addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(
                    `### 🎁 Gewinn\n${giveaway.prize}`
                )
        )

        .addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(
                    [
                        `👥 **Teilnehmer:** ${participantCount}`,
                        `🏆 **Gewinner:** ${giveaway.winner_count}`,
                        `⏰ **Ende:** <t:${unixTimestamp}:F>`,
                        `⌛ **Countdown:** <t:${unixTimestamp}:R>`
                    ].join("\n")
                )
        )

        .addSeparatorComponents(
            new SeparatorBuilder()
                .setDivider(true)
        )

        .addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(
                    disabled
                        ? "🔒 Dieses Giveaway ist beendet."
                        : "Klicke auf den Button, um am Giveaway teilzunehmen."
                )
        )

        .addActionRowComponents(
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`giveaway_join:${giveaway.id}`)
                        .setLabel(
                            disabled
                                ? "Giveaway beendet"
                                : "🎉 Teilnehmen"
                        )
                        .setStyle(
                            disabled
                                ? ButtonStyle.Secondary
                                : ButtonStyle.Primary
                        )
                        .setDisabled(disabled)
                )
        );

    return container;
}

module.exports = {
    buildGiveawayContainer
};
