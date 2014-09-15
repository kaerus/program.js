Program.run = function(input){

	process.argv.splice(0,2);

    if(process.argv[0] === '--debug') {
        Program.scope.debug = true;
        process.argv.splice(0,1);
    }

    if(process.argv[0] === '--daemonize') {
    	var port = process.argv[1] || Program.deafult.port;
    	Program.log.info("Daemonizing on port %s", port);
        require('./daemonize')(port);
    } else {
    	if(typeof input === 'string'){
    	
    		if(input[input.length-1]==='?') {
    			Program.printf(Program.banner());
            	Program.printf(Program.help(input));
        	} else {
    			Program(input);
    		}
    		Program.scope.printf("\n");
    	}
        else if(process.argv.length) {
        	var commands = process.argv.join(' ').split(';');
        	
        	commands.forEach(function(command){
        		Program.run(command);	
        	});
        } 
        else {
            Program.repl(Program.scope);  
        }
    } 
};