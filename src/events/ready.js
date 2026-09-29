module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`✅ Bot ist bereit! ID: ${client.user.id}`);
    }
};