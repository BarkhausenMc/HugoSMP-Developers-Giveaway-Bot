require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
} = require('discord.js');

const giveawayCommand = require('./commands/giveaway');
const interactionCreate = require('./events/interactionCreate');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
    ],
});

client.once('ready', async () => {
    console.log(`✅ Eingeloggt als ${client.user.tag}`);

    try {
        await client.application.commands.set([
            giveawayCommand.data,
        ]);

        console.log('✅ Slash-Commands registriert');
    } catch (error) {
        console.error('❌ Fehler beim Registrieren der Commands:', error);
    }
});

client.on('interactionCreate', interactionCreate);
global.client = client;


client.login(process.env.DISCORD_TOKEN);