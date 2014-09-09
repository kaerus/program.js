Program.run = function(){

	process.argv.splice(0,2);

    if(process.argv[0] === '--debug') {
        Program.debug = true;
        process.argv.splice(0,1);
    }

    if(process.argv[0] === '--daemonize') {
        Program.daemonize(process.argv[1]);
    } else {
        if(process.argv.length) {
            Program(process.argv.join(' ').split(';'));
        } else {
            Program.repl();  
        }
    } 
};