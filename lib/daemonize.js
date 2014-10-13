var net = require('net'),
    Scope = require('./scope'),
    Repl = require('./repl'),
    Telnet = require('./telnet');

function session(socket) {
    var debug = !!Program.scope.debug && !!Program.scope.trace.telnet;
    var client = socket.remoteAddress + ':' + socket.remotePort;

    /* create scope for this session */
    var scope = Program.scope.create({
        name: 'telnet(' + client + ')' 
    });

    scope.log.info("Connected");

    var telnet = new Telnet({debug: debug});
    var repl = new Repl(scope);

    socket.on('close',function(){
	scope.log.info("Disconnected");
    });
    
    /* pipe some data */
    socket.pipe(telnet).pipe(repl).pipe(telnet.output).pipe(socket);
}

function daemonize(port) {
    process.on('uncaughtException', function(err) {
        Program.error(err);
    });

    net.createServer(session).listen(port); 
}  

module.exports = daemonize;
