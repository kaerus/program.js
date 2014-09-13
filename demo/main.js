var fs = require('fs'),
	path = require('path'),
	Program = require('../');
	
/* create command contexts */
Program.$("ls","List files",ls_cmd,
	{'dir':{'string':null},"":"./","?":"dir to ls"});

/*
context.$(
    module_upload,"add","Upload module",
    base.REMOTE_OPTION,
    {"path":{"string":""}},
    {"autoload":{"boolean":""},"":true},
    {"force":{"boolean":""},"":false}
);*/

function ls_cmd(params,args){
	var dir = path.resolve(params.dir),
		files = fs.readdirSync(dir);

	this.printf("dir: (%s)", dir);
}
