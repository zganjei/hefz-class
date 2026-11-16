import { createFileRoute } from "@tanstack/react-router";
import { bindings } from "../../lib/bindings.server";
import { jsonError } from "../../lib/auth.server";
const enc=new TextEncoder();
function constantEqual(a:Uint8Array,b:Uint8Array){if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a[i]^b[i];return d===0;}
export const Route=createFileRoute("/api/bootstrap")({server:{handlers:{GET:async()=>{const {DB,BOOTSTRAP_SECRET,GOOGLE_CLIENT_ID}=bindings() as ReturnType<typeof bindings>&{BOOTSTRAP_SECRET?:string;GOOGLE_CLIENT_ID?:string}; if(!DB)return Response.json({ready:false,configured:false,googleClientId:GOOGLE_CLIENT_ID||null}); const count=await DB.prepare("SELECT COUNT(*) AS n FROM users").first<{n:number}>(); return Response.json({ready:Number(count?.n??0)===0,configured:!!BOOTSTRAP_SECRET,googleClientId:GOOGLE_CLIENT_ID||null});},POST:async({request})=>{
 const {DB,BOOTSTRAP_SECRET}=bindings() as ReturnType<typeof bindings>&{BOOTSTRAP_SECRET?:string};
 if(!DB||!BOOTSTRAP_SECRET)return jsonError("راه‌اندازی اولیه هنوز پیکربندی نشده است.",503);
 const count=await DB.prepare("SELECT COUNT(*) AS n FROM users").first<{n:number}>();
 if(Number(count?.n??0)>0)return jsonError("مدیر اولیه قبلاً ساخته شده است.",409);
 const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
 if(!body||typeof body.secret!=="string"||typeof body.name!=="string"||typeof body.email!=="string"||typeof body.password!=="string")return jsonError("اطلاعات ناقص است.");
 const a=enc.encode(body.secret),b=enc.encode(BOOTSTRAP_SECRET);
 if(a.length!==b.length||!constantEqual(a,b))return jsonError("کد راه‌اندازی نادرست است.",403);
 const email=body.email.trim().toLowerCase(),name=body.name.trim(),password=body.password;
 if(!name||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<10||password.length>128)return jsonError("نام، ایمیل یا گذرواژه نامعتبر است.");
 const salt=crypto.getRandomValues(new Uint8Array(16)); const key=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);
 const hash=new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt,iterations:210000},key,256));
 const b64=(v:Uint8Array)=>btoa(String.fromCharCode(...v)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
 const id=crypto.randomUUID(); await DB.prepare("INSERT INTO users(id,email,display_name,password_hash,role) VALUES(?,?,?,?, 'admin')").bind(id,email,name,`pbkdf2:${b64(salt)}:${b64(hash)}`).run();
 const token=crypto.randomUUID(); await DB.prepare("INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,?)").bind(token,id,new Date(Date.now()+14*86400000).toISOString()).run();
 return Response.json({ok:true},{headers:{"Set-Cookie":`hifz_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=1209600`}});
}}}});
