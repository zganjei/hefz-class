import { createFileRoute } from "@tanstack/react-router";
import { bindings } from "../../lib/bindings.server";
export const Route = createFileRoute("/api/auth/logout")({ server: { handlers: { POST: async ({request}) => {
  const token=request.headers.get("Cookie")?.split(";").map(x=>x.trim()).find(x=>x.startsWith("hifz_session="))?.slice(13);
  const {DB}=bindings(); if(token&&DB) await DB.prepare("DELETE FROM sessions WHERE id=?").bind(token).run();
  return Response.json({ok:true},{headers:{"Set-Cookie":"hifz_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0"}});
}}}});
