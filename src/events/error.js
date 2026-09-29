module.exports = {
    name: 'error',
    once: false,
    execute(error) {
        console.error('💀 Bot Error:', error);
    }
};