Program.run = function(input){
    if(typeof input === 'string') {
        /* multiline programs */
        input = input.split(/\r?\n/);
        input.forEach(Program);
    } else if(Array.isArray(input)) {
        input.forEach(Program); 
    } else throw new Error("Can not process input type:", typeof input); 
};