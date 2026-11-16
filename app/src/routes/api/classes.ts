import { createFileRoute } from "@tanstack/react-router";
import { bindings } from "../../lib/bindings.server";
import { currentUser, jsonError } from "../../lib/auth.server";
export const Route=createFileRoute("/api/classes")({server:{handlers:{
 GET:async({request})=>{
  const user=await currentUser(request); if(!user)return jsonError("ابتدا وارد شوید.",401);
  const {DB}=bindings(); if(!DB)return jsonError("پایگاه داده آماده نیست.",503);
  if(user.role==="admin") { const rows=await DB.prepare("SELECT c.*,u.display_name AS teacher_name,(SELECT COUNT(*) FROM class_members m WHERE m.class_id=c.id) AS member_count FROM classes c JOIN users u ON u.id=c.teacher_id ORDER BY c.created_at DESC").all(); return Response.json({classes:rows.results}); }
  if(user.role==="teacher") { const rows=await DB.prepare("SELECT c.*,(SELECT COUNT(*) FROM class_members m WHERE m.class_id=c.id) AS member_count FROM classes c WHERE c.teacher_id=? ORDER BY c.created_at DESC").bind(user.id).all(); return Response.json({classes:rows.results}); }
  const rows=await DB.prepare("SELECT c.id,c.name,c.description,u.display_name AS teacher_name FROM classes c JOIN class_members m ON m.class_id=c.id JOIN users u ON u.id=c.teacher_id WHERE m.user_id=? ORDER BY c.name").bind(user.id).all(); return Response.json({classes:rows.results});
 },
 POST:async({request})=>{
  const user=await currentUser(request); if(!user||!["admin","teacher"].includes(user.role))return jsonError("دسترسی مجاز نیست.",403);
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  const name=typeof body?.name==="string"?body.name.trim().slice(0,100):"";
  let teacherId=user.role==="teacher"?user.id:typeof body?.teacherId==="string"?body.teacherId:"";
  if(user.role==="admin"&&!teacherId){const first=await bindings().DB?.prepare("SELECT id FROM users WHERE role='teacher' AND active=1 ORDER BY created_at LIMIT 1").first<{id:string}>();teacherId=first?.id??"";}
  if(!name||!teacherId)return jsonError("نام کلاس و معلم را مشخص کنید.");
  const {DB}=bindings(); if(!DB)return jsonError("پایگاه داده آماده نیست.",503);
  const teacher=await DB.prepare("SELECT id FROM users WHERE id=? AND role='teacher' AND active=1").bind(teacherId).first(); if(!teacher)return jsonError("معلم انتخاب‌شده معتبر نیست.");
  const id=crypto.randomUUID(); await DB.prepare("INSERT INTO classes(id,name,description,teacher_id) VALUES(?,?,?,?)").bind(id,name,typeof body?.description==="string"?body.description.slice(0,500):"",teacherId).run();
  return Response.json({id,name},{status:201});
 }
}}});
