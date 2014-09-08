var fs = require('fs'),
	path = require('path');
	
require('../');

/* create command contexts */
Program.$(ls_cmd,"ls","List files");

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

	Program.info("dir is", dir);
}
