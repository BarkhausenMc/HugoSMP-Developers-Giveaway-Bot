module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`✅ Ready event triggered for ${client.user.tag}`);
    }
};