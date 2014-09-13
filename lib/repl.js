var Commander = require('./commander'),
	keypress = require('keypress'),
	tty = require('tty');

Program.repl = function(scope){
    var command = new Commander(scope),
    	done = false;
    
    keypress(command.input);

    command.input.on('keypress', function (chunk, key) {
        if(scope.debug && scope.trace.keypress) 
        	scope.log.debug("keypress: chunk(%s) key(%s)", chunk, JSON.stringify(key));

        if (key && key.ctrl) {
            switch(key.name) {
            	case 'c':
            		command.interrupt();
            		break;
                case 'd':
                	command.stop();
                  	break; 
            }
        } else if(key) {
            switch(key.name){
                case 'tab': 
                    command.autocomplete();
                    break;
                case 'backspace':
                	command.backspace();
                    break;
                case 'return':
                    command.enter();
                    break;
                case 'up':
                    command.previous();
                    break;
                case 'down':
                    command.next();
                    break;
                default:
                    command.add(key.sequence);
            }
        } else {
            switch(chunk){
                case '?':
                    command.help();
                    break;
                default:
                	command.add(chunk);
            }
        }
    });

	if(tty.isatty(command.input)) command.input.setRawMode(true);
    
    command.input.resume();

    command.printf(Program.banner());

	command.show();

}
