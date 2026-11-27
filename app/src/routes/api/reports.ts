import { createFileRoute } from "@tanstack/react-router";
import { bindings } from "../../lib/bindings.server";
import { currentUser, jsonError } from "../../lib/auth.server";
import { TEACHES_CLASS_SQL } from "../../lib/access.server";
import { isAdmin, isMemorizer, isTeacher } from "../../lib/roles";
export const Route=createFileRoute("/api/reports")({server:{handlers:{
 GET:async({request})=>{
  const user=await currentUser(request); if(!user)return jsonError("ابتدا وارد شوید.",401);
  const {DB}=bindings(); if(!DB)return jsonError("پایگاه داده آماده نیست.",503);
  let rows;
  // teacher powers (also when combined with admin) = reports of the classes they teach plus their own; admin-only keeps own reports
  if(isTeacher(user)) rows=await DB.prepare(`SELECT r.*,u.display_name,c.name AS class_name FROM reports r JOIN users u ON u.id=r.user_id JOIN classes c ON c.id=r.class_id WHERE (${TEACHES_CLASS_SQL} OR r.user_id=?) ORDER BY r.submitted_at DESC LIMIT 100`).bind(user.id,user.id,user.id).all();
  else if(isAdmin(user)) rows=await DB.prepare("SELECT r.*,u.display_name,c.name AS class_name FROM reports r JOIN users u ON u.id=r.user_id JOIN classes c ON c.id=r.class_id WHERE r.user_id=? ORDER BY r.submitted_at DESC LIMIT 100").bind(user.id).all();
  else rows=await DB.prepare("SELECT r.*,c.name AS class_name FROM reports r JOIN classes c ON c.id=r.class_id WHERE r.user_id=? ORDER BY r.submitted_at DESC LIMIT 100").bind(user.id).all();
  return Response.json({reports:rows.results});
 },
 POST:async({request})=>{
  const user=await currentUser(request); if(!user||!(isAdmin(user)||isMemorizer(user)))return jsonError("فقط حافظ می‌تواند گزارش ثبت کند.",403);
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  const classId=typeof body?.classId==="string"?body.classId:"",surah=typeof body?.surah==="string"?body.surah.trim().slice(0,80):"";
  const from=Number(body?.fromAyah),to=Number(body?.toAyah),note=typeof body?.note==="string"?body.note.slice(0,1000):"";
  if(!classId||!surah||!Number.isInteger(from)||!Number.isInteger(to)||from<1||to<from||to>286)return jsonError("اطلاعات گزارش نامعتبر است.");
  const {DB}=bindings(); if(!DB)return jsonError("پایگاه داده آماده نیست.",503);
  const member=await DB.prepare("SELECT 1 FROM class_members WHERE class_id=? AND user_id=?").bind(classId,user.id).first(); if(!member)return jsonError("شما عضو این کلاس نیستید.",403);
  const id=crypto.randomUUID(); await DB.prepare("INSERT INTO reports(id,user_id,class_id,surah,from_ayah,to_ayah,note) VALUES(?,?,?,?,?,?,?)").bind(id,user.id,classId,surah,from,to,note).run();
  return Response.json({id,status:"pending"},{status:201});
 }
}}});
