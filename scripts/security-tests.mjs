import assert from 'node:assert/strict';
import {createAccountHandler} from '../supabase/functions/account-rights/handler.mjs';
const approved='https://zafa-test.example.invalid';
const env={ZAFA_ALLOWED_ORIGINS:approved,ZAFA_ACCOUNTS_ENABLED:'true',SUPABASE_URL:'https://test.example.invalid',SUPABASE_PUBLISHABLE_KEYS:JSON.stringify({default:'public-test-placeholder'}),SUPABASE_SECRET_KEYS:JSON.stringify({default:'admin-test-placeholder'})};
let userOk=true,active=true,fresh=true,deleted=[],adminCreated=0,selectedId=null,clientCreated=0;
function createClient(url,key,opts){assert.equal(url,env.SUPABASE_URL);if(key==='admin-test-placeholder'){adminCreated++;return {auth:{admin:{deleteUser:async(id,soft)=>{deleted.push({id,soft});return {error:null}}}}}}assert.equal(key,'public-test-placeholder');assert.equal(opts.auth.persistSession,false);clientCreated++;return {auth:{getUser:async()=>userOk?{data:{user:{id:'verified-user',email:'test@example.invalid',identities:[{provider:'google'}]}},error:null}:{data:null,error:{message:'denied'}}},rpc:async(_,args)=>({data:active&&(args.max_age_seconds===0||fresh),error:null}),from:()=>({select:()=>({eq:(_,id)=>{selectedId=id;return {order:()=>({limit:async()=>({data:[{scope:'academy',payload:{done:1}}],error:null})})}}})})}}
const handle=createAccountHandler({createClient,readEnv:k=>env[k]});
const post=(body={action:'export'},over={})=>new Request(approved+'/account-rights',{method:'POST',headers:{Origin:approved,Authorization:'Bearer a.b.c','Content-Type':'application/json',...over},body:JSON.stringify(body)});
const cases=[];
async function check(name,request,status){const result=await handle(request);assert.equal(result.status,status,name);assert.equal(result.headers.get('Cache-Control'),'no-store',name);cases.push(name);return result}
await check('unknown origin',post({action:'export'},{Origin:'https://evil.example.invalid'}),403);
await check('unsupported method',new Request(approved,{headers:{Origin:approved}}),405);
await check('missing token',post({action:'export'},{Authorization:''}),401);
await check('supplied user ID rejected',post({action:'delete',confirm:'DELETE_MY_ACCOUNT',user_id:'victim'}),400);
await check('oversize JSON',post({action:'export',confirm:'x'.repeat(2048)}),400);
await check('delete confirmation required',post({action:'delete'}),400);
assert.equal(clientCreated,0);assert.equal(adminCreated,0);
env.ZAFA_ACCOUNTS_ENABLED='false';await check('disabled feature',post(),503);env.ZAFA_ACCOUNTS_ENABLED='true';
userOk=false;await check('forged or invalid JWT',post(),401);userOk=true;
active=false;await check('revoked session',post(),401);active=true;
fresh=false;await check('stale deletion session',post({action:'delete',confirm:'DELETE_MY_ACCOUNT'}),401);fresh=true;
assert.equal(adminCreated,0);
const exp=await check('own export',post(),200);const payload=await exp.json();assert.equal(payload.account.id,'verified-user');assert.equal(selectedId,'verified-user');assert.equal(payload.state[0].scope,'academy');assert.equal(adminCreated,0);
await check('own permanent deletion',post({action:'delete',confirm:'DELETE_MY_ACCOUNT'}),200);
assert.deepEqual(deleted,[{id:'verified-user',soft:false}]);assert.equal(adminCreated,1);
console.log('ZAFA mock account rights checks passed: '+cases.length+' cases. No live Supabase project used.');
