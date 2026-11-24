import { createFileRoute } from "@tanstack/react-router";
import { bindings } from "../../lib/bindings.server";
import { currentUser, jsonError } from "../../lib/auth.server";
import { canManageClass, TEACHES_CLASS_SQL } from "../../lib/access.server";
export const Route=createFileRoute("/api/assignments")({server:{handlers:{
 GET:async({request})=>{
  const user=await currentUser(request);if(!user)return jsonError("ابتدا وارد شوید.",401);
  const {DB}=bindings();if(!DB)return jsonError("پایگاه داده آماده نیست.",503);
  let result;
  if(user.role==="admin")result=await DB.prepare("SELECT a.*,c.name AS class_name FROM assignments a JOIN classes c ON c.id=a.class_id ORDER BY a.created_at DESC LIMIT 100").all();
  else if(user.role==="teacher")result=await DB.prepare(`SELECT a.*,c.name AS class_name FROM assignments a JOIN classes c ON c.id=a.class_id WHERE ${TEACHES_CLASS_SQL} ORDER BY a.created_at DESC LIMIT 100`).bind(user.id,user.id).all();
  else result=await DB.prepare("SELECT a.*,c.name AS class_name FROM assignments a JOIN classes c ON c.id=a.class_id JOIN class_members m ON m.class_id=c.id WHERE m.user_id=? ORDER BY a.created_at DESC LIMIT 100").bind(user.id).all();
  return Response.json({assignments:result.results});
 },
 POST:async({request})=>{
  const user=await currentUser(request);if(!user||!["admin","teacher"].includes(user.role))return jsonError("فقط معلم یا مدیر می‌تواند برنامه تعیین کند.",403);
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  const classId=typeof body?.classId==="string"?body.classId:"",title=typeof body?.title==="string"?body.title.trim().slice(0,120):"",surah=typeof body?.surah==="string"?body.surah.trim().slice(0,80):"";
  const from=Number(body?.fromAyah),to=Number(body?.toAyah),due=typeof body?.dueDate==="string"?body.dueDate:null,notes=typeof body?.instructions==="string"?body.instructions.slice(0,1000):"";
  if(!classId||!title||!surah||!Number.isInteger(from)||!Number.isInteger(to)||from<1||to<from||to>286)return jsonError("اطلاعات برنامه نامعتبر است.");
  const {DB}=bindings();if(!DB)return jsonError("پایگاه داده آماده نیست.",503);
  if(!(await canManageClass(DB,user,classId)))return jsonError("کلاس پیدا نشد یا دسترسی ندارید.",403);
  const id=crypto.randomUUID();await DB.prepare("INSERT INTO assignments(id,class_id,title,surah,from_ayah,to_ayah,due_date,instructions,created_by) VALUES(?,?,?,?,?,?,?,?,?)").bind(id,classId,title,surah,from,to,due,notes,user.id).run();
  return Response.json({id},{status:201});
 }
}}});
