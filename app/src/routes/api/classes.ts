import { createFileRoute } from "@tanstack/react-router";
import { bindings } from "../../lib/bindings.server";
import { currentUser, jsonError } from "../../lib/auth.server";
import { TEACHES_CLASS_SQL } from "../../lib/access.server";
import { hasRoleSql, isAdmin, isTeacher } from "../../lib/roles";
export const Route=createFileRoute("/api/classes")({server:{handlers:{
 GET:async({request})=>{
  const user=await currentUser(request); if(!user)return jsonError("ابتدا وارد شوید.",401);
  const {DB}=bindings(); if(!DB)return jsonError("پایگاه داده آماده نیست.",503);
  if(isAdmin(user)) { const rows=await DB.prepare("SELECT c.*,COALESCE((SELECT string_agg(ut.display_name, '، ' ORDER BY ut.display_name) FROM class_teachers ct JOIN users ut ON ut.id=ct.user_id WHERE ct.class_id=c.id AND " + hasRoleSql("ut", "teacher") + " AND ut.active=1),'') AS teacher_name,(SELECT COUNT(*) FROM class_members m WHERE m.class_id=c.id) AS member_count,EXISTS(SELECT 1 FROM class_members mine WHERE mine.class_id=c.id AND mine.user_id=?) AS is_member FROM classes c ORDER BY c.created_at DESC").bind(user.id).all(); return Response.json({classes:rows.results}); }
  // teacher (possibly also a learner): classes they teach plus classes they are a member of
  if(isTeacher(user)) { const rows=await DB.prepare(`SELECT c.*,(SELECT COUNT(*) FROM class_members m WHERE m.class_id=c.id) AS member_count,EXISTS(SELECT 1 FROM class_members mine WHERE mine.class_id=c.id AND mine.user_id=?) AS is_member FROM classes c WHERE ${TEACHES_CLASS_SQL} OR EXISTS(SELECT 1 FROM class_members mm WHERE mm.class_id=c.id AND mm.user_id=?) ORDER BY c.created_at DESC`).bind(user.id,user.id,user.id,user.id).all(); return Response.json({classes:rows.results}); }
  const rows=await DB.prepare("SELECT c.id,c.name,c.description,COALESCE((SELECT string_agg(ut.display_name, '، ' ORDER BY ut.display_name) FROM class_teachers ct JOIN users ut ON ut.id=ct.user_id WHERE ct.class_id=c.id AND " + hasRoleSql("ut", "teacher") + " AND ut.active=1),'') AS teacher_name FROM classes c JOIN class_members m ON m.class_id=c.id WHERE m.user_id=? ORDER BY c.name").bind(user.id).all(); return Response.json({classes:rows.results});
 },
 POST:async({request})=>{
  const user=await currentUser(request); if(!user)return jsonError("ابتدا وارد شوید.",401);
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  if(body?.action==="join") {
   if(!isAdmin(user))return jsonError("فقط مدیر اپلیکیشن می‌تواند با حساب خودش عضو کلاس شود.",403);
   const classId=typeof body.classId==="string"?body.classId:"";
   if(!classId)return jsonError("کلاس را انتخاب کنید.");
   const {DB}=bindings();if(!DB)return jsonError("پایگاه داده آماده نیست.",503);
   const cls=await DB.prepare("SELECT id FROM classes WHERE id=?").bind(classId).first();
   if(!cls)return jsonError("کلاس پیدا نشد.",404);
   await DB.prepare("INSERT INTO class_members(class_id,user_id) VALUES(?,?) ON CONFLICT DO NOTHING").bind(classId,user.id).run();
   return Response.json({joined:true});
  }
  if(!isTeacher(user))return jsonError("فقط استاد کلاس می‌تواند کلاس ایجاد کند.",403);
  const name=typeof body?.name==="string"?body.name.trim().slice(0,100):"";
  const teacherId=user.id;
  if(!name||!teacherId)return jsonError("نام کلاس و استاد را مشخص کنید.");
  const {DB}=bindings(); if(!DB)return jsonError("پایگاه داده آماده نیست.",503);
  const teacher=await DB.prepare("SELECT u.id FROM users u WHERE u.id=? AND " + hasRoleSql("u", "teacher") + " AND u.active=1").bind(teacherId).first(); if(!teacher)return jsonError("استاد معتبر نیست.");
  const id=crypto.randomUUID(); const term=typeof body?.term==="string"?body.term.trim().slice(0,80):"",positionNote=typeof body?.positionNote==="string"?body.positionNote.trim().slice(0,300):"";
  const classKind=body?.classKind==="online"||body?.classKind==="onsite"?body.classKind:null;
  await DB.prepare("INSERT INTO classes(id,name,description,teacher_id,term,position_note,class_kind) VALUES(?,?,?,?,?,?,?)").bind(id,name,typeof body?.description==="string"?body.description.slice(0,500):"",teacherId,term||null,positionNote||null,classKind).run();
  await DB.prepare("INSERT INTO class_teachers(class_id,user_id,added_by) VALUES(?,?,?) ON CONFLICT DO NOTHING").bind(id,teacherId,user.id).run();
  return Response.json({id,name},{status:201});
 }
}}});
