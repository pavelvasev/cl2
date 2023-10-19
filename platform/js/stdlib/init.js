import * as path from 'node:path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
//let STDLIBS = path.resolve( path.join( __dirname,"..","..","..","lib" ))

export function init( state ) 
{
  // регистрируем каталог как глобально-доступную библиотеку под именем stdlib
  state.default_import_map["std"] = __dirname
}