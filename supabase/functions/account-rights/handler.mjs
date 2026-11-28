export function createAccountHandler({createClient,readEnv}) {
const settings=(name)=>readEnv(name)||"";
function getKey(mapName,legacyName){
  try{const parsed=JSON.parse(settings(mapName)||"{}");if(typeof parsed.default==="string"&&parsed.default)return parsed.default}catch{}
  return settings(legacyName);
}
function allowedOrigins(){
  const result=new Set();
  for(const item of settings("ZAFA_ALLOWED_ORIGINS").split(",").map(x=>x.trim()).filter(Boolean)){
    try{const u=new URL(item);if(u.protocol==="https:"&&u.origin===item&&!u.username&&!u.password)result.add(u.origin)}catch{}
  }
  return result;
}
const headersFor=(origin)=>({"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Max-Age":"300","Vary":"Origin","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Content-Type":"application/json; charset=utf-8"});
function response(origin,status,data){return new Response(JSON.stringify(data),{status,headers:origin?headersFor(origin):{"Cache-Control":"no-store","Content-Type":"application/json; charset=utf-8","X-Content-Type-Options":"nosniff"}})}
async function boundedJSON(request){
  const limit=1024,stated=request.headers.get("content-length");if(stated!==null&&(!/^\d+$/.test(stated)||Number(stated)>limit))throw Error("invalid size");
  if(!request.body)throw Error("missing body");const reader=request.body.getReader(),chunks=[];let total=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>limit){await reader.cancel();throw Error("invalid size")}chunks.push(value)}}finally{reader.releaseLock()}
  const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
  return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
}
async function handle(request){
  const origin=request.headers.get("origin")||"";
  if(!allowedOrigins().has(origin))return response(null,403,{error:"Origin not allowed"});
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:headersFor(origin)});
  if(request.method!=="POST")return response(origin,405,{error:"POST required"});
  if(settings("ZAFA_ACCOUNTS_ENABLED")!=="true")return response(origin,503,{error:"Accounts not enabled"});
  const authorization=request.headers.get("authorization")||"",match=authorization.match(/^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/);
  if(!match||match[1].length>12000)return response(origin,401,{error:"Authentication required"});
  if(!(request.headers.get("content-type")||"").toLowerCase().startsWith("application/json"))return response(origin,415,{error:"JSON required"});
  let body;try{body=await boundedJSON(request)}catch{return response(origin,400,{error:"Invalid request"})}
  if(!body||typeof body!=="object"||Array.isArray(body)||!["export","delete"].includes(body.action)||Object.keys(body).some(k=>!["action","confirm"].includes(k)))return response(origin,400,{error:"Invalid action"});
  if(body.action==="delete"&&body.confirm!=="DELETE_MY_ACCOUNT")return response(origin,400,{error:"Explicit confirmation required"});
  const url=settings("SUPABASE_URL"),key=getKey("SUPABASE_PUBLISHABLE_KEYS","SUPABASE_ANON_KEY");
  if(!url||!key)return response(origin,503,{error:"Auth not configured"});
  try{
    const token=match[1];
    // This client uses the user's JWT and public key, not administrator access.
    const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{headers:{Authorization:"Bearer "+token}}});
    const {data:userData,error:userError}=await client.auth.getUser(token),user=userData?.user;
    if(userError||!user?.id||user.is_anonymous)return response(origin,401,{error:"Invalid session"});
    const {data:sessionOK,error:sessionError}=await client.rpc("zafa_session_ok",{max_age_seconds:body.action==="delete"?300:0});
    if(sessionError)return response(origin,503,{error:"Session validation unavailable"});
    if(sessionOK!==true)return response(origin,401,{error:body.action==="delete"?"Sign in again before deleting your account":"Session expired or revoked"});
    if(body.action==="export"){
      const {data:state,error}=await client.from("zafa_user_state").select("scope,payload,updated_at").eq("user_id",user.id).order("scope").limit(6);
      if(error)return response(origin,503,{error:"Export unavailable"});
      return response(origin,200,{format:"ZAFA_ACCOUNT_EXPORT_1",exportedAt:new Date().toISOString(),account:{id:user.id,email:user.email??null,createdAt:user.created_at??null,lastSignInAt:user.last_sign_in_at??null,providers:(user.identities||[]).map(x=>x.provider)},state:state||[]});
    }
    // Admin key is read only after the user and fresh session are verified.
    // Never use a user-supplied ID, URL, key, or service role in the user client.
    const secret=getKey("SUPABASE_SECRET_KEYS","SUPABASE_SERVICE_ROLE_KEY");
    if(!secret)return response(origin,503,{error:"Account deletion not configured"});
    const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const {error}=await admin.auth.admin.deleteUser(user.id,false);
    if(error)return response(origin,503,{error:"Deletion could not be completed"});
    return response(origin,200,{deleted:true,localData:"Clear browser data separately. Backups and lawful retention follow the operator policy."});
  }catch{return response(origin,503,{error:"Account service unavailable"})}
}
return handle;
}
