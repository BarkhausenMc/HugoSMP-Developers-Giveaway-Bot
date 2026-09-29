require('dotenv').config();

module.exports = {
    token: process.env.DISCORD_TOKEN,
    giveawayRoleId: process.env.GIVEAWAY_ROLE_ID,
    ownerId: process.env.OWNER_ID,
    prefix: process.env.PREFIX || '!'
};