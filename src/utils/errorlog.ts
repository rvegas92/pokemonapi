import fs from 'fs'

export namespace ErrorLog {
  const filename = "error.log"

  export function save(file: string, metodo: string, error: string){
    fs.appendFile(filename,`[${file+' : '+currentLogDate()}] - [${metodo}'] => '${ error }\n`,function() {});
  }

  export function info(file: string, mensaje: string){
    fs.appendFile(filename,`[${file+' : '+currentLogDate()}] - [${mensaje}]\n`,function() {});
  }
  
  function currentLogDate(){
    return new Date().toLocaleString();
  }
}