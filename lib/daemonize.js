var net = require('net'),
    telnet = require('./telnet'),
    clients = [], id = 0;

/* Redirects io and binds the CLI to a tcp port.*/
/* Use with '&' in the shell to run the process */
/* in the background........................... */
Program.daemonize = function(port) {
    daemonize(port);
}

function session(remote) {

    remote.on('SIGINT',function(){
        remote.write("PRESS CTRL-D to exit.\n");
        remote.write(Program.prompt);
    });

    remote.on('close',function(){
        remote.write("Bye bye!\n");
        remote.end();
    });

    clients[clients.length] = {telnet:remote,id:id++}

    Program.repl(remote,null,false);
}

function daemonize(port) {

    port = port ? port : 4230;

    var child = require('child_process');

    var node = child.spawn('node',undefined,{ 
        detached: true, 
        stdio: [ 'ignore', process.stdout, process.stderr ] 
    });

    process.on('uncaughtException', function(err) {
        Program.error(err.stack);
    });

    net.createServer(function (socket) {
        session(new telnet(socket));
    }).listen(port); 
}  