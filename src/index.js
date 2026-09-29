require("dotenv").config();

const {
    Client,
    GatewayIntentBits
} = require("discord.js");

const {
    handleInteraction
} = require("./events/interactionCreate");

const {
    checkGiveaways
} = require("./giveaways/giveawayManager");

// Datenbank initialisieren
require("./database/database");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

/*
 * ==============================
 * READY
 * ==============================
 */

client.once("ready", async () => {
    console.log(
        `Bot ist online als ${client.user.tag}`
    );

    console.log(
        `Bot-ID: ${client.user.id}`
    );

    // Einmal direkt prüfen
    await checkGiveaways(client);

    /*
     * Alle 5 Sekunden prüfen.
     *
     * Nach einem Neustart werden dadurch
     * auch Giveaways aus der Datenbank
     * wieder verarbeitet.
     */
    setInterval(
        async () => {
            try {
                await checkGiveaways(client);
            } catch (error) {
                console.error(
                    "Fehler beim Giveaway-Checker:",
                    error
                );
            }
        },
        5_000
    );
});

/*
 * ==============================
 * INTERACTIONS
 * ==============================
 */

client.on(
    "interactionCreate",
    async interaction => {
        await handleInteraction(
            interaction
        );
    }
);

/*
 * ==============================
 * FEHLER
 * ==============================
 */

process.on(
    "unhandledRejection",
    error => {
        console.error(
            "Unhandled Promise Rejection:",
            error
        );
    }
);

process.on(
    "uncaughtException",
    error => {
        console.error(
            "Uncaught Exception:",
            error
        );
    }
);

/*
 * ==============================
 * LOGIN
 * ==============================
 */

client.login(
    process.env.DISCORD_TOKEN
);
