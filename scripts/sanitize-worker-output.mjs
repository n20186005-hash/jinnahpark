import {readdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const output=fileURLToPath(new URL('../dist/',import.meta.url));
const root=fileURLToPath(new URL('../',import.meta.url)).replace(/\/$/,'');
async function scan(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=join(dir,entry.name);if(entry.isDirectory()){await scan(file);continue;}if(!/\.(?:js|mjs|json|html|css|xml|txt)$/.test(entry.name)||entry.name==='wrangler.json')continue;let text=await readFile(file,'utf8');text=text.replaceAll(root,'/site');await writeFile(file,text);}}
await scan(output);
