var net = require('net'),
    telnet = require('./telnet');

function session(remote) {
    var scope = Object.create(Program.scope);

    scope.stdin = scope.stdout = scope.stderr = remote;
    scope.printf = Program.printf;

    Program.repl(scope);
}

function daemonize(port) {

    port = port ? port : 4230;

    process.on('uncaughtException', function(err) {
        Program.error(err);
    });

    net.createServer(function (socket) {
        session(new telnet(socket,Program.debug));
    }).listen(port); 
}  

module.exports = daemonize;