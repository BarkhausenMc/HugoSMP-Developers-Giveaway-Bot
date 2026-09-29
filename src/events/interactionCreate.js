const {
    MessageFlags
} = require("discord.js");

const {
    buildCreateGiveawayModal
} = require("../commands/createGiveaway");

const {
    createGiveawayFromModal,
    joinGiveaway,
    rerollWinner
} = require("../giveaways/giveawayManager");


const REQUIRED_ROLE_ID =
    process.env.GIVEAWAY_ROLE_ID;

async function handleInteraction(interaction) {
    try {
        /*
         * ==============================
         * SLASH COMMAND
         * ==============================
         */

        if (
            interaction.isChatInputCommand() &&
            interaction.commandName === "create-giveaway"
        ) {
            if (!interaction.inGuild()) {
                return interaction.reply({
                    content:
                        "❌ Dieser Command kann nur auf einem Server verwendet werden.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const hasRole =
                interaction.member.roles.cache.has(
                    REQUIRED_ROLE_ID
                );

            if (!hasRole) {
                return interaction.reply({
                    content:
                        "❌ Du hast keine Berechtigung, Giveaways zu erstellen.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const modal =
                buildCreateGiveawayModal();

            return interaction.showModal(modal);
        }

        /*
         * ==============================
         * MODAL
         * ==============================
         */

        if (
            interaction.isModalSubmit() &&
            interaction.customId === "create-giveaway-modal"
        ) {
            if (!interaction.inGuild()) {
                return interaction.reply({
                    content:
                        "❌ Dieser Vorgang kann nur auf einem Server verwendet werden.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const hasRole =
                interaction.member.roles.cache.has(
                    REQUIRED_ROLE_ID
                );

            if (!hasRole) {
                return interaction.reply({
                    content:
                        "❌ Du hast keine Berechtigung, Giveaways zu erstellen.",
                    flags: MessageFlags.Ephemeral
                });
            }

            await interaction.deferReply({
                flags: MessageFlags.Ephemeral
            });

            try {
                const giveaway =
                    await createGiveawayFromModal(
                        interaction
                    );

                return interaction.editReply({
                    content:
                        `✅ Giveaway **#${giveaway.id}** wurde erstellt!`
                });
            } catch (error) {
                console.error(error);

                return interaction.editReply({
                    content:
                        `❌ ${error.message}`
                });
            }
        }

        /*
         * ==============================
         * GIVEAWAY BUTTON
         * ==============================
         */

        if (
            interaction.isButton() &&
            interaction.customId.startsWith("giveaway_join:")
        ) {
            const giveawayId =
                Number(
                    interaction.customId.split(":")[1]
                );

            if (
                !Number.isInteger(giveawayId) ||
                giveawayId < 1
            ) {
                return interaction.reply({
                    content:
                        "❌ Ungültiges Giveaway.",
                    flags: MessageFlags.Ephemeral
                });
            }

            return joinGiveaway(
                interaction,
                giveawayId
            );
        }

        if (
    interaction.isChatInputCommand() &&
    interaction.commandName === "reroll"
) {
    if (!interaction.inGuild()) {
        return interaction.reply({
            content:
                "❌ Dieser Command kann nur auf einem Server verwendet werden.",
            flags: MessageFlags.Ephemeral
        });
    }

    /*
     * Rolle überprüfen
     */
    const hasRole =
        interaction.member.roles.cache.has(
            REQUIRED_ROLE_ID
        );

    if (!hasRole) {
        return interaction.reply({
            content:
                "❌ Du hast keine Berechtigung, Giveaways zu rerollen.",
            flags: MessageFlags.Ephemeral
        });
    }

    /*
     * Giveaway-ID auslesen
     */
    const giveawayId =
        interaction.options.getInteger("id");

    await interaction.deferReply({
        flags: MessageFlags.Ephemeral
    });

    try {
        const result =
            await rerollWinner(
                giveawayId
            );

        /*
         * Alte Gewinner
         */
        const oldWinners =
            result.oldWinners
                .map(
                    userId => `<@${userId}>`
                )
                .join(", ");

        /*
         * Neue Gewinner
         */
        const newWinners =
            result.newWinners
                .map(
                    userId => `<@${userId}>`
                )
                .join(", ");

        /*
         * Private Antwort
         */
        await interaction.editReply({
            content:
                `✅ Giveaway **#${giveawayId}** wurde gererolled.\n\n` +
                `❌ Alter Gewinner: ${oldWinners}\n` +
                `🎉 Neuer Gewinner: ${newWinners}`
        });

        /*
         * Öffentliche Nachricht
         */
        await interaction.channel.send({
            content:
                `🔄 **Giveaway #${giveawayId} wurde gererolled!**\n\n` +
                `❌ Alter Gewinner: ${oldWinners}\n` +
                `🎉 Neuer Gewinner: ${newWinners}\n\n` +
                `🎁 Gewinn: **${result.giveaway.prize}**`
        });

    } catch (error) {
        console.error(
            `Fehler beim Reroll von Giveaway #${giveawayId}:`,
            error
        );

        await interaction.editReply({
            content:
                `❌ ${error.message}`
        });
    }

    return;
}



    } catch (error) {
        console.error(
            "Fehler bei einer Interaction:",
            error
        );

        if (interaction.replied || interaction.deferred) {
            try {
                await interaction.editReply({
                    content:
                        "❌ Es ist ein unerwarteter Fehler aufgetreten."
                });
            } catch {
                // Ignorieren
            }
        } else {
            try {
                await interaction.reply({
                    content:
                        "❌ Es ist ein unerwarteter Fehler aufgetreten.",
                    flags: MessageFlags.Ephemeral
                });
            } catch {
                // Ignorieren
            }
        }
    }
}

module.exports = {
    handleInteraction
};
