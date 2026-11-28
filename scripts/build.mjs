import {readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const pages=['index.html','liquidity.html','academy.html','privacy.html'];
const scripts=['terminal.js','liquidity-app.js','academy-app.js','privacy.js','chart-link.js','market-data.js'];
const assets=[...pages,...scripts,'_headers'];
const secretPatterns=[
 /sb_secret_[a-zA-Z0-9_-]{20,}/,
 /gh[pousr]_[a-zA-Z0-9]{30,}/,
 /github_pat_[a-zA-Z0-9_]{30,}/,
 /AIza[a-zA-Z0-9_-]{35}/,
 /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
 /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/
];
function fail(msg){throw Error(msg)}
for(const path of assets){const text=readFileSync(resolve(root,path),'utf8');if(secretPatterns.some(re=>re.test(text)))fail('Potential credential in '+path+' (value suppressed)');if(path.endsWith('.html')){if(!text.includes('Content-Security-Policy')||!text.includes("script-src 'self'"))fail('Missing strict script policy in '+path);if(/<script\b[^>]*>\s*[^<\s]/i.test(text)||/<[^>]*\son[a-z]+=["']/i.test(text))fail('Inline executable markup in '+path);for(const match of text.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)){const file=match[1].split('?')[0];if(!file.startsWith('./')||!scripts.includes(file.slice(2)))fail('Unexpected script source in '+path)}}if(path.endsWith('.js')){const check=spawnSync(process.execPath,['--check',resolve(root,path)],{encoding:'utf8'});if(check.status!==0)fail('Invalid script '+path+': '+check.stderr);if(/\beval\s*\(|\bnew\s+Function\s*\(/.test(text))fail('Dynamic evaluation in '+path)}}
if(!readFileSync(resolve(root,'_headers'),'utf8').includes("frame-ancestors 'none'"))fail('Missing frame protection');
const out=resolve(root,'dist');rmSync(out,{recursive:true,force:true});mkdirSync(out,{recursive:true});for(const file of assets)copyFileSync(resolve(root,file),resolve(out,file));
console.log('ZAFA: verified '+assets.length+' public assets. Deployment output: dist/. No server code, secrets or SQL copied.');
