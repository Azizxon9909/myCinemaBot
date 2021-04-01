module.exports = {
    logStart(){
        console.log('Bot has been start...');
    },
    getItemUuid(source) {
        return source.substr(2, source.length)
    }
}