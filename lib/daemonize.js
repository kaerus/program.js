var net = require('net'),
    Scope = require('./scope'),
    Logger = require('./log'),
    Telnet = require('./telnet');

function session(telnet) {
    Program.repl(telnet.scope);
}

function daemonize(port) {
    process.on('uncaughtException', function(err) {
        Program.error(err);
    });

    net.createServer(function (socket) {
        session(new Telnet(socket,Program.scope));
    }).listen(port); 
}  

module.exports = daemonize;