require('dotenv').config();

const { REST, Routes } = require('discord.js');
const createCmd = require('./src/commands/giveaway-create.js');
const hugosmpCmd = require('./src/commands/giveaway-hugosmp.js');
const listCmd = require('./src/commands/giveaway-list.js');
const rerollCmd = require('./src/commands/giveaway-reroll.js');
const cancelCmd = require('./src/commands/giveaway-cancel.js');

// Alle Commands sammeln
const commands = [
    createCmd.data.toJSON(),
    hugosmpCmd.data.toJSON(),
    listCmd.data.toJSON(),
    rerollCmd.data.toJSON(),
    cancelCmd.data.toJSON()
];

const rest = new REST({ version: '10' })
  .setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`🔄 Starte Registrierung von ${commands.length} Commands...`);

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      {
        body: commands
      }
    );

    console.log('✅ Alle Guild Slash Commands erfolgreich registriert!');
  } catch (error) {
    console.error('❌ Fehler bei der Registrierung:', error);
    console.error('\nÜberprüfe deine .env Datei:\n' +
      '- DISCORD_TOKEN\n' +
      '- CLIENT_ID\n' +
      '- GUILD_ID');
  }
})();