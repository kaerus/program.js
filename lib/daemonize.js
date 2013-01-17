var net = require('net'),
    repl = require('repl'),
    telnet = require('./telnet'),
    clients = [], id = 0;

function session(program,remote) {
    remote.write(program.prompt);

    remote.on('SIGINT',function(){
        remote.write("PRESS CTRL-D to exit.\n");
        remote.write(program.prompt);
    });

    remote.on('close',function(){
        remote.write("Bye bye!\n");
        remote.end();
    });

    clients[clients.length] = {telnet:remote,id:id++}

    program.run(remote);
}

function daemonize(program, port) {


    process.on('uncaughtException', function(err) {
        console.error(err.stack);
    });

    /* Note: This is just an uggly hack.        */
    /* Todo: direct input/output for individual */
    /* sessions, not shared as it is now....... */
    function stdoutToClients(string){
        clients.forEach(function(client,x){
            try{
                client.telnet.write(string);
            } catch(err){    
                clients.splice(x,1);
            }
        });
    }

    process.stdout.write = (function(write) {
        return function(string, encoding, fd) {
            stdoutToClients(string);
        }
    })(process.stdout.write);

    net.createServer(function (socket) {
        session(program, new telnet(socket));
    }).listen(port); 

}  

module.exports = daemonize;