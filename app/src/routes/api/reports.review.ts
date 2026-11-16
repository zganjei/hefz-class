import { createFileRoute } from "@tanstack/react-router";
import { bindings } from "../../lib/bindings.server";
import { currentUser, jsonError } from "../../lib/auth.server";
export const Route=createFileRoute("/api/reports/review")({server:{handlers:{POST:async({request})=>{
 const user=await currentUser(request); if(!user||!["admin","teacher"].includes(user.role))return jsonError("دسترسی مجاز نیست.",403);
 const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
 const id=typeof body?.id==="string"?body.id:"",status=body?.status,feedback=typeof body?.feedback==="string"?body.feedback.slice(0,1000):"";
 if(!id||!["approved","needs_revision"].includes(String(status)))return jsonError("وضعیت بررسی نامعتبر است.");
 const {DB}=bindings(); if(!DB)return jsonError("پایگاه داده آماده نیست.",503);
 const report=await DB.prepare("SELECT r.id,c.teacher_id FROM reports r JOIN classes c ON c.id=r.class_id WHERE r.id=?").bind(id).first<{id:string;teacher_id:string}>();
 if(!report||(user.role==="teacher"&&report.teacher_id!==user.id))return jsonError("گزارش پیدا نشد یا دسترسی ندارید.",404);
 await DB.prepare("UPDATE reports SET status=?,feedback=?,reviewed_by=?,reviewed_at=? WHERE id=?").bind(status,feedback,user.id,new Date().toISOString(),id).run();
 return Response.json({ok:true});
}}}});
