import { createFileRoute } from "@tanstack/react-router";
import { bindings } from "../../lib/bindings.server";
import { currentUser, jsonError } from "../../lib/auth.server";
export const Route=createFileRoute("/api/classes/join")({server:{handlers:{
 POST:async({request})=>{
  const user=await currentUser(request);
  if(!user||user.role!=="admin")return jsonError("فقط مدیر اپلیکیشن می‌تواند با حساب خودش عضو کلاس شود.",403);
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  const classId=typeof body?.classId==="string"?body.classId:"";
  if(!classId)return jsonError("کلاس را انتخاب کنید.");
  const {DB}=bindings();if(!DB)return jsonError("پایگاه داده آماده نیست.",503);
  const cls=await DB.prepare("SELECT id FROM classes WHERE id=?").bind(classId).first();
  if(!cls)return jsonError("کلاس پیدا نشد.",404);
  await DB.prepare("INSERT INTO class_members(class_id,user_id) VALUES(?,?) ON CONFLICT DO NOTHING").bind(classId,user.id).run();
  return Response.json({joined:true});
 }
}}});