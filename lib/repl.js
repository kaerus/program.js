var Commander = require('./commander'),
	keypress = require('readline').emitKeypressEvents,
	tty = require('tty');

Program.repl = function(scope){
    var command = new Commander(scope),
    	done = false;
    
    keypress(scope.input);

    scope.input.on('SIGINT', command.interrupt);

    scope.input.on('keypress', function (chunk, key) {

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

	if(tty.isatty(scope.input)) scope.input.setRawMode(true);
    
    scope.input.resume();

    scope.printf(Program.banner());

	command.show();

}

