// упрощенная заглушка для nodejs чтобы fetch мог работать с локальными файлами (текст загружать)
// тк фетч активно используется во врунгеле

// https://nodejs.org/api/fs.html#fsreadfilepath-options-callback
import { readFile } from 'node:fs';

let origfetch = globalThis.fetch;
globalThis.fetch = newfetch;

// https://github.com/lucacasonato/deno_local_file_fetch/blob/main/mod.ts
function newfetch( file, opts )
{

  if (!(typeof(file) === 'string' && file.startsWith("file://")))
    return origfetch( file, opts );

  return new Promise( (resolve,reject) => {

     let path = file.slice(7);
     readFile(path, 'utf8', (err, data) => {
       if (err) reject(err);
       let r = {
         text: () => Promise.resolve(data), // todo добавить еще обработку arraybuffer
         ok: true
       }
       // console.log("loaded data",data);
       resolve( r );
     });

  });
}