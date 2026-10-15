import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)));
export const renderTemp=path.join(path.resolve(process.env.PIXEL_RENDER_ROOT||path.join(root,'.cache/render')),'临时');
fs.mkdirSync(renderTemp,{recursive:true});
for(const name of ['TEMP','TMP','TMPDIR'])process.env[name]=renderTemp;
if(path.resolve(os.tmpdir())!==renderTemp)throw Error('Process TEMP was not applied.');
