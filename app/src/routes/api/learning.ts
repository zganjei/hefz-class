import { createFileRoute } from "@tanstack/react-router";
import { bindings } from "../../lib/bindings.server";
import { currentUser, jsonError } from "../../lib/auth.server";

export const Route = createFileRoute("/api/learning")({ server: { handlers: {
 GET: async ({ request }) => {
  const user = await currentUser(request);
  if (!user) return jsonError("ابتدا وارد شوید.", 401);
  const { DB } = bindings();
  if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
  const enrollments = await DB.prepare("SELECT e.id,e.course_id,e.class_id,e.due_weekday,c.title AS course_title,c.description FROM course_enrollments e JOIN courses c ON c.id=e.course_id WHERE e.user_id=? AND e.active=1 ORDER BY e.enrolled_at DESC").bind(user.id).all<any>();
  const courses = [];
  for (const e of enrollments.results || []) {
   const weeks = await DB.prepare("SELECT id,week_number,title,due_weekday FROM course_weeks WHERE course_id=? ORDER BY week_number").bind(e.course_id).all<any>();
   const weekData = [];
   for (const w of weeks.results || []) {
    const lessons = await DB.prepare("SELECT id,lesson_order,title,surah,from_ayah,to_ayah,video_url FROM course_lessons WHERE week_id=? ORDER BY lesson_order").bind(w.id).all<any>();
    const lessonData = [];
    for (const l of lessons.results || []) {
     const previous = await DB.prepare("SELECT id FROM course_lessons WHERE week_id=? AND lesson_order<? ORDER BY lesson_order DESC LIMIT 1").bind(w.id,l.lesson_order).first<any>();
     let unlocked = l.lesson_order === 1;
     if (previous) {
      const pp = await DB.prepare("SELECT final_exam_passed FROM lesson_progress WHERE user_id=? AND lesson_id=?").bind(user.id,previous.id).first<any>();
      unlocked = !!pp?.final_exam_passed;
     }
     if (w.week_number > 1) {
      const pw = await DB.prepare("SELECT id FROM course_weeks WHERE course_id=? AND week_number=?").bind(e.course_id,w.week_number-1).first<any>();
      const ps = pw ? await DB.prepare("SELECT status FROM weekly_submissions WHERE enrollment_id=? AND week_id=?").bind(e.id,pw.id).first<any>() : null;
      unlocked = unlocked && ps?.status === "approved";
     }
     const progress = await DB.prepare("SELECT video_completed,practice_completed,final_exam_passed FROM lesson_progress WHERE user_id=? AND lesson_id=?").bind(user.id,l.id).first<any>();
     const qs = await DB.prepare("SELECT question_type,MAX(passed) AS passed FROM quiz_attempts WHERE user_id=? AND lesson_id=? GROUP BY question_type").bind(user.id,l.id).all<any>();
     const quizStatus: Record<string,boolean> = {};
     for (const q of qs.results || []) quizStatus[q.question_type] = !!q.passed;
     const questions=await DB.prepare("SELECT id,question_type,prompt,choices,points FROM lesson_questions WHERE lesson_id=? ORDER BY question_type,id").bind(l.id).all<any>();\n     lessonData.push({...l, video_url: unlocked ? l.video_url : null, unlocked, progress: progress || {video_completed:0,practice_completed:0,final_exam_passed:0}, quizStatus, questions: unlocked ? (questions.results||[]) : []});
    }
    const submission = await DB.prepare("SELECT status,feedback,submitted_at FROM weekly_submissions WHERE enrollment_id=? AND week_id=?").bind(e.id,w.id).first<any>();
    weekData.push({...w, lessons:lessonData, submission:submission || null});
   }
   courses.push({...e,weeks:weekData});
  }
  return Response.json({courses});
 },
 POST: async ({ request }) => {
  const user = await currentUser(request);
  if (!user || !["admin","teacher","memorizer"].includes(user.role)) return jsonError("دسترسی ندارید.",403);
  const body = await request.json().catch(()=>null) as Record<string,any> | null;
  const action = body?.action;
  const { DB } = bindings();
  if (!DB) return jsonError("پایگاه داده آماده نیست.",503);
  if (action === "review_week") {
   if (!["admin","teacher"].includes(user.role)) return jsonError("دسترسی ندارید.",403);
   const sid = String(body?.submissionId || ""), status = body?.status;
   if (!sid || !["approved","needs_revision"].includes(status)) return jsonError("درخواست نامعتبر است.");
   const row = await DB.prepare("SELECT s.id,c.teacher_id FROM weekly_submissions s JOIN course_enrollments e ON e.id=s.enrollment_id JOIN classes c ON c.id=e.class_id WHERE s.id=?").bind(sid).first<any>();
   if (!row || (user.role==="teacher" && row.teacher_id!==user.id)) return jsonError("تحویل پیدا نشد یا دسترسی ندارید.",403);
   await DB.prepare("UPDATE weekly_submissions SET status=?,feedback=?,reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=?").bind(status,String(body?.feedback||"").slice(0,1000),user.id,sid).run();
   return Response.json({reviewed:true});
  }
  if (action === "submit_week") {
   const eid=String(body?.enrollmentId||""), wid=String(body?.weekId||"");
   const e=await DB.prepare("SELECT id,course_id FROM course_enrollments WHERE id=? AND user_id=? AND active=1").bind(eid,user.id).first<any>();
   if(!e)return jsonError("دوره پیدا نشد.",403);
   const week=await DB.prepare("SELECT id FROM course_weeks WHERE id=? AND course_id=?").bind(wid,e.course_id).first<any>();
   if(!week)return jsonError("هفته نامعتبر است.");
   const incomplete=await DB.prepare("SELECT COUNT(*) AS n FROM course_lessons l LEFT JOIN lesson_progress p ON p.lesson_id=l.id AND p.user_id=? WHERE l.week_id=? AND COALESCE(p.final_exam_passed,0)=0").bind(user.id,wid).first<any>();
   if(Number(incomplete?.n||0)>0)return jsonError("ابتدا آزمون نهایی همه درس‌های این هفته را بگذرانید.");
   const id=crypto.randomUUID();
   await DB.prepare("INSERT INTO weekly_submissions(id,enrollment_id,week_id,note) VALUES(?,?,?,?) ON CONFLICT(enrollment_id,week_id) DO UPDATE SET status='pending',note=excluded.note,submitted_at=CURRENT_TIMESTAMP,feedback='',reviewed_by=NULL,reviewed_at=NULL").bind(id,eid,wid,String(body?.note||"").slice(0,1000)).run();
   return Response.json({submitted:true});
  }
  if(action==="create_course"||action==="create_week"||action==="create_lesson"||action==="create_question"||action==="enroll"){
   if(!["admin","teacher"].includes(user.role))return jsonError("فقط معلم یا مدیر می‌تواند محتوا مدیریت کند.",403);
   if(action==="create_course"){
    const classId=String(body?.classId||""),title=String(body?.title||"").trim().slice(0,120);
    if(!classId||!title)return jsonError("کلاس و عنوان دوره را مشخص کنید.");
    const cls=await DB.prepare("SELECT id,teacher_id FROM classes WHERE id=?").bind(classId).first<any>();
    if(!cls||(user.role==="teacher"&&cls.teacher_id!==user.id))return jsonError("کلاس پیدا نشد یا دسترسی ندارید.",403);
    const id=crypto.randomUUID();await DB.prepare("INSERT INTO courses(id,title,description,created_by,class_id) VALUES(?,?,?,?,?)").bind(id,title,String(body?.description||"").slice(0,500),user.id,classId).run();return Response.json({id},{status:201});
   }
   if(action==="create_week"){
    const courseId=String(body?.courseId||""),num=Number(body?.weekNumber),title=String(body?.title||"").trim(),weekday=Number(body?.dueWeekday??5);
    const c=await DB.prepare("SELECT id,class_id,created_by FROM courses WHERE id=?").bind(courseId).first<any>();
    if(!c||(user.role==="teacher"&&c.created_by!==user.id))return jsonError("دوره پیدا نشد یا دسترسی ندارید.",403);
    if(!Number.isInteger(num)||num<1||!title||!Number.isInteger(weekday)||weekday<0||weekday>6)return jsonError("اطلاعات هفته نامعتبر است.");
    const id=crypto.randomUUID();await DB.prepare("INSERT INTO course_weeks(id,course_id,week_number,title,due_weekday) VALUES(?,?,?,?,?)").bind(id,courseId,num,title,weekday).run();return Response.json({id},{status:201});
   }
   if(action==="create_lesson"){
    const weekId=String(body?.weekId||""),order=Number(body?.lessonOrder),title=String(body?.title||"").trim(),surah=String(body?.surah||"").trim(),from=Number(body?.fromAyah),to=Number(body?.toAyah),video=String(body?.videoUrl||"").trim();
    const w=await DB.prepare("SELECT w.id,c.created_by FROM course_weeks w JOIN courses c ON c.id=w.course_id WHERE w.id=?").bind(weekId).first<any>();
    if(!w||(user.role==="teacher"&&w.created_by!==user.id))return jsonError("هفته پیدا نشد یا دسترسی ندارید.",403);
    if(!title||!surah||!Number.isInteger(order)||order<1||!Number.isInteger(from)||!Number.isInteger(to)||from<1||to<from||!/^https:\/\//.test(video))return jsonError("عنوان، سوره، آیات و لینک HTTPS ویدئو را کامل کنید.");
    const id=crypto.randomUUID();await DB.prepare("INSERT INTO course_lessons(id,week_id,lesson_order,title,surah,from_ayah,to_ayah,video_url) VALUES(?,?,?,?,?,?,?,?)").bind(id,weekId,order,title,surah,from,to,video).run();return Response.json({id},{status:201});
   }
   if(action==="create_question"){
    const lessonId=String(body?.lessonId||""),type=String(body?.questionType||""),prompt=String(body?.prompt||"").trim(),answer=String(body?.answerKey||"").trim();
    const l=await DB.prepare("SELECT l.id,c.created_by FROM course_lessons l JOIN course_weeks w ON w.id=l.week_id JOIN courses c ON c.id=w.course_id WHERE l.id=?").bind(lessonId).first<any>();
    if(!l||(user.role==="teacher"&&l.created_by!==user.id))return jsonError("درس پیدا نشد یا دسترسی ندارید.",403);
    if(!["hifz","tadabbur","vocabulary","final"].includes(type)||!prompt||!answer)return jsonError("نوع، متن سوال و پاسخ صحیح را وارد کنید.");
    const id=crypto.randomUUID();await DB.prepare("INSERT INTO lesson_questions(id,lesson_id,question_type,prompt,choices,answer_key,explanation,points) VALUES(?,?,?, ?,?::jsonb,?,?,?)").bind(id,lessonId,type,prompt,JSON.stringify(Array.isArray(body?.choices)?body.choices:[]),answer,String(body?.explanation||"").slice(0,500),Math.max(1,Number(body?.points||1))).run();return Response.json({id},{status:201});
   }
   if(action==="enroll"){
    const courseId=String(body?.courseId||""),studentId=String(body?.userId||""),weekday=Number(body?.dueWeekday??5);
    const c=await DB.prepare("SELECT id,class_id,created_by FROM courses WHERE id=? AND active=1").bind(courseId).first<any>();
    if(!c||(user.role==="teacher"&&c.created_by!==user.id))return jsonError("دوره پیدا نشد یا دسترسی ندارید.",403);
    const member=await DB.prepare("SELECT 1 FROM class_members WHERE class_id=? AND user_id=?").bind(c.class_id,studentId).first<any>();
    if(!member)return jsonError("حافظ باید ابتدا عضو کلاس دوره باشد.");
    if(!Number.isInteger(weekday)||weekday<0||weekday>6)return jsonError("روز تحویل نامعتبر است.");
    const id=crypto.randomUUID();await DB.prepare("INSERT INTO course_enrollments(id,course_id,class_id,user_id,due_weekday) VALUES(?,?,?,?,?) ON CONFLICT(course_id,user_id) DO UPDATE SET due_weekday=excluded.due_weekday,active=1").bind(id,courseId,c.class_id,studentId,weekday).run();return Response.json({enrolled:true},{status:201});
   }
  }
  const lessonId=typeof body?.lessonId==="string"?body.lessonId:"";
  if(!lessonId)return jsonError("درس را مشخص کنید.");
  const lesson=await DB.prepare("SELECT l.id,l.week_id,l.lesson_order,w.course_id FROM course_lessons l JOIN course_weeks w ON w.id=l.week_id JOIN course_enrollments e ON e.course_id=w.course_id WHERE l.id=? AND e.user_id=? AND e.active=1").bind(lessonId,user.id).first<any>();
  if(!lesson)return jsonError("درس پیدا نشد یا به شما اختصاص ندارد.",403);
  const prev=await DB.prepare("SELECT id FROM course_lessons WHERE week_id=? AND lesson_order<? ORDER BY lesson_order DESC LIMIT 1").bind(lesson.week_id,lesson.lesson_order).first<any>();
  if(prev){const p=await DB.prepare("SELECT final_exam_passed FROM lesson_progress WHERE user_id=? AND lesson_id=?").bind(user.id,prev.id).first<any>();if(!p?.final_exam_passed)return jsonError("ابتدا درس قبلی را کامل کنید.",403);}
  if(action==="video_complete"){
   await DB.prepare("INSERT INTO lesson_progress(user_id,lesson_id,video_completed) VALUES(?,?,1) ON CONFLICT(user_id,lesson_id) DO UPDATE SET video_completed=1").bind(user.id,lessonId).run();
   return Response.json({videoCompleted:true});
  }
  const p=await DB.prepare("SELECT video_completed,practice_completed FROM lesson_progress WHERE user_id=? AND lesson_id=?").bind(user.id,lessonId).first<any>();
  if(!p?.video_completed)return jsonError("ابتدا ویدئوی درس را تماشا کنید.",403);
  if(action==="practice_complete"){
   const count=await DB.prepare("SELECT COUNT(DISTINCT question_type) AS n FROM quiz_attempts WHERE user_id=? AND lesson_id=? AND passed=1 AND question_type IN ('hifz','tadabbur','vocabulary')").bind(user.id,lessonId).first<any>();
   const total=await DB.prepare("SELECT COUNT(DISTINCT question_type) AS n FROM lesson_questions WHERE lesson_id=? AND question_type IN ('hifz','tadabbur','vocabulary')").bind(lessonId).first<any>();
   if(Number(total?.n||0)>0&&Number(count?.n||0)<3)return jsonError("ابتدا آزمون‌های حسن حفظ، تدبر و لغت را بگذرانید.");
   await DB.prepare("INSERT INTO lesson_progress(user_id,lesson_id,practice_completed) VALUES(?,?,1) ON CONFLICT(user_id,lesson_id) DO UPDATE SET practice_completed=1").bind(user.id,lessonId).run();
   return Response.json({practiceCompleted:true});
  }
  if(action==="quiz"){
   const type=String(body?.questionType||"");
   if(!["hifz","tadabbur","vocabulary","final"].includes(type))return jsonError("نوع آزمون نامعتبر است.");
   if(type==="final"&&!p?.practice_completed)return jsonError("ابتدا تمرین حفظ را تکمیل کنید.");
   const questions=await DB.prepare("SELECT id,answer_key,points FROM lesson_questions WHERE lesson_id=? AND question_type=?").bind(lessonId,type).all<any>();
   if(!questions.results?.length)return jsonError("برای این بخش هنوز سوالی ثبت نشده است.");
   const answers=body?.answers&&typeof body.answers==="object"?body.answers:{};
   let score=0,max=0;for(const q of questions.results){const points=Number(q.points||1);max+=points;if(String(answers[q.id]??"").trim()===String(q.answer_key).trim())score+=points;}
   const passed=score>=Math.ceil(max*0.8);
   await DB.prepare("INSERT INTO quiz_attempts(id,user_id,lesson_id,question_type,score,max_score,passed,answers) VALUES(?,?,?,?,?,?,?,?::jsonb)").bind(crypto.randomUUID(),user.id,lessonId,type,score,max,passed,JSON.stringify(answers)).run();
   if(type==="final"&&passed)await DB.prepare("INSERT INTO lesson_progress(user_id,lesson_id,final_exam_passed,completed_at) VALUES(?,?,1,CURRENT_TIMESTAMP) ON CONFLICT(user_id,lesson_id) DO UPDATE SET final_exam_passed=1,completed_at=CURRENT_TIMESTAMP").bind(user.id,lessonId).run();
   return Response.json({score,maxScore:max,passed,threshold:80});
  }
  return jsonError("عملیات نامعتبر است.");
 }
}}});
