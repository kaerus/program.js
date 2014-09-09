var fs = require('fs'),
	path = require('path'),
	Program = require('../');
	
/* create command contexts */
Program.$("ls","List files",ls_cmd);

/*
context.$(
    module_upload,"add","Upload module",
    base.REMOTE_OPTION,
    {"path":{"string":""}},
    {"autoload":{"boolean":""},"":true},
    {"force":{"boolean":""},"":false}
);*/

function ls_cmd(params,args){
	var dir = path.resolve(args[0] || './'),
		files = fs.readdirSync(dir);

	process.stdout.write("dir: " + dir + "\n");
}
