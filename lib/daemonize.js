var net = require('net'),
    Scope = require('./scope'),
    Logger = require('./log'),
    Repl = require('./repl'),
    Telnet = require('./telnet');

function session(socket) {
    var debug = !!Program.scope.debug && !!Program.scope.trace.telnet;

    /* create scope for this session */
    var scope = Program.scope.extend({
        name: 'telnet(' + socket.remoteAddress + ')' 
    });

    /* setup logger */
    scope.log = new Logger(scope.name);
    scope.log.info("connected %s",socket.remoteAddress);

    var telnet = new Telnet({debug: debug});
    var repl = new Repl(scope);

    /* pipe some data */
    socket.pipe(telnet).pipe(repl).pipe(telnet.output).pipe(socket);
}

function daemonize(port) {
    process.on('uncaughtException', function(err) {
        Program.error(err);
    });

    net.createServer(function (socket) {
        session(socket);
    }).listen(port); 
}  

module.exports = daemonize;
