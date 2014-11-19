var net = require('net'),
    Repl = require('./repl'),
    Telnet = require('./telnet');

function daemonize(port,address) {
    var program = this;
    
    function session(socket) {
	var debug = !!program.scope.debug && !!program.scope.trace.telnet;
	var client = socket.remoteAddress + ':' + socket.remotePort;

	/* create scope for this session */
	var scope = program.scope.create({
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

	/* pipe log output to client */
	telnet.on('ready',function(){
	    scope.log.pipe(telnet.output);
	});
    }

    process.on('uncaughtException', function(err) {
        program.error(err);
    });

    net.createServer(session).listen(port,address); 
}  

module.exports = daemonize;
