const { doWork } = require('./child');

process.on('message', function(message) {
    console.log('[Client -> Worker]', message.action);
    process.send(doWork(message));
});
