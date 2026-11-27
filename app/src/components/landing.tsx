import { useState } from "react";
import { ThemeToggle } from "./theme-toggle";

type Sub = "" | "why1" | "why2" | "map" | "types" | "rules";

const MENU: { key: string; label: string }[] = [
  { key: "hefz", label: "حفظ تدبری" },
  { key: "sireh", label: "سیره‌پژوهی" },
  { key: "life", label: "زندگی با آیه‌ها" },
  { key: "free", label: "برگزاری دوره‌های آفلاین آزاد" },
  { key: "e1", label: "" },
  { key: "e2", label: "" },
];

const STEPS = [
  ["گام اول", "سوره‌های فتح، محمد، حجرات"],
  ["گام دوم", "سوره‌های جمعه، صف، حشر"],
  ["گام سوم", "سوره‌های منافقون، ممتحنه، انفال"],
  ["گام چهارم", "سوره‌های احزاب، آل‌عمران"],
  ["گام پنجم", "سوره‌ی مبارکه‌ی توبه"],
];

export function Landing({ onRegister, onLogin }: { onRegister: () => void; onLogin: () => void }) {
  const [page, setPage] = useState("");
  const [sub, setSub] = useState<Sub>("");
  const go = (k: string) => { setPage(k); setSub(""); window.scrollTo({ top: 0 }); };
  const toggle = (s: Sub) => setSub(sub === s ? "" : s);

  return (
    <div className="lp2" dir="rtl">
      <header className="lp2-nav">
        <div className="lp2-nav-in">
          <button type="button" className="lp2-brand" aria-label="صفحه اصلی" onClick={() => go("")}>
            <img src="/razmi-logo.png" alt="رزمی چنین" />
            <span>رزمی چنین</span>
          </button>
          <nav className="lp2-links" aria-label="بخش‌ها">
            {MENU.filter((m) => m.label).map((m) => (
              <button key={m.key} type="button" className={page === m.key ? "on" : ""} onClick={() => go(m.key)}>{m.label}</button>
            ))}
          </nav>
          <div className="lp2-actions">
            <ThemeToggle />
            <button type="button" className="lp2-btn ghost" onClick={onLogin}>ورود</button>
            <button type="button" className="lp2-btn gold" onClick={onRegister}>ثبت‌نام</button>
          </div>
        </div>
      </header>

      {page === "" && (
        <>
          <section className="lp2-hero">
            <div className="lp2-hero-in">
              <h1 className="lp2-poem">رزمی چنین میانه‌ی میدانم آرزوست</h1>
              <div className="lp2-orn" aria-hidden="true"><span /><i /><span /></div>
              <p className="lp2-lead">
                طرح قرآنی «رزمی چنین» دوره‌ای است با محوریت قرآن کریم که می‌کوشد با تمسک به کلام الهی، قدمی در راه نورانی کردن جامعه بردارد. این دوره دعوتی است به شرکت در رزمی که سلاح آن، انس با قرآن است.
              </p>
              <div className="lp2-cta">
                <button type="button" className="lp2-btn gold lg" onClick={onRegister}>ثبت‌نام در دوره</button>
                <button type="button" className="lp2-btn outline lg" onClick={() => go("hefz")}>آشنایی با دوره</button>
              </div>
            </div>
          </section>
          <section className="lp2-cards">
            <h2>مسیرهای آموزشی</h2>
            <div className="lp2-grid">
              {MENU.filter((m) => m.label).map((m) => (
                <button key={m.key} type="button" className={"lp2-card" + (m.key === "hefz" ? " main" : "")} onClick={() => go(m.key)}>
                  <b>{m.label}</b>
                  <small>{m.key === "hefz" ? "نقشه راه، دوره آنلاین، دوره آفلاین و قوانین" : "به‌زودی"}</small>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      <div className="lp2-wrap">
        {page === "hefz" && (
          <section className="lp-sec">
            <button type="button" className="lp-back" onClick={() => go("")}>← بازگشت</button>
            <h2>حفظ تدبری</h2>
            <h3>هدف از دوره</h3>
            <p>
              با توجه به فراگیری کلاس‌های حفظ و تمرکز آن‌ها بر الفاظ قرآن و گاه دور ماندن از ترجمه و نگاه تدبری به آیات، در این دوره برآنیم که هر دو بالِ تدبر و حفظ را برای قرآن‌آموزان قوی کنیم.
            </p>
            <div className="lp-subs lp-why">
              <button type="button" className={"landing-btn" + (sub === "why1" ? " on" : "")} onClick={() => toggle("why1")}>چرا حفظ؟</button>
              {sub === "why1" && (
                <div className="landing-info">
              <p>حفظ قرآن و تکرار آن برای فردی که می‌خواهد آیات را حفظ کند، نوع خاصی از انس می‌آورد که با قرائت ساده حاصل نمی‌شود.</p>
              <p className="lp-quote">
                <b>امام شهید:</b> «اول باید خوب بخوانید؛ تلاوت را زیبا و جامع و صحیح بخوانید؛ دوم معانی و مفاهیم قرآنی را بفهمید و سوم قرآن را حفظ کنید. حفظ قرآن خیلی مهم است … تدبر در قرآن با همین‌طور خواندن و رد شدن به دست نمی‌آید؛ با تکرار و انس با آیه‌ای از قرآن و امکان تدبر در آن به دست می‌آید.»
              </p>
            </div>
              )}
              <button type="button" className={"landing-btn" + (sub === "why2" ? " on" : "")} onClick={() => toggle("why2")}>چرا تدبر؟</button>
              {sub === "why2" && (
                <div className="landing-info">
              <p>
                بنا داریم با تدبر در معانی و الفاظ، آن‌ها را چون بذر ایمان در جان و دلمان بنشانیم؛ آیات را به باور قلبی تبدیل کنیم تا در برابر فتنه‌های آخرالزمان به سپری معنوی مجهز شویم. در این دوره قصد نداریم تنها حافظ الفاظ باشیم؛ می‌خواهیم با قرآن انس پیدا کنیم، با قرآن زندگی کنیم و مفاهیم پرمغز آن، از جمله جهاد، مقاومت و پیروزی را در دل و جانمان بنشانیم.
              </p>
            </div>
              )}
              <button type="button" className={"landing-btn" + (sub === "map" ? " on" : "")} onClick={() => toggle("map")}>نقشه راه</button>
              {sub === "map" && (
                <div className="landing-info">
                  <p>دغدغه‌ی اصلی ما مجهز شدن به سلاح بصیرت و معارف قرآن در دوران پرچالش پیش از ظهور است. از این رو چینش سوره‌ها و محتوای آموزشی بر اساس یک نقشه‌ی هدفمند طراحی شده است.</p>
                  <p>در سطح اول به سراغ سوره‌هایی رفته‌ایم که روح ایمان، مقاومت، جهاد فی‌سبیل‌الله و پایداری در برابر ابتلائات را در جان انسان زنده می‌کنند. برای دلنشین بودن حفظ، مسیر در چند سطح منظم چیده شده است: آغاز با سوره‌های کوتاه‌تر و خوش‌خوان‌تر، و به‌مرور حفظ سوره‌های بلندتر و عمیق‌تر. سوره‌ها در دسته‌های مفهومیِ مرتبط قرار می‌گیرند تا پیوند معنایی میان آن‌ها هم درک شود.</p>
                  <b>سطح اول: مجموعه مقاومت و جهاد</b>
                  <ol className="lp-steps">
                    {STEPS.map(([a, b]) => (
                      <li key={a}><b>{a}:</b> {b}</li>
                    ))}
                  </ol>
                </div>
              )}
              <button type="button" className={"landing-btn" + (sub === "types" ? " on" : "")} onClick={() => toggle("types")}>انواع دوره‌ها</button>
              {sub === "types" && (
                <div className="landing-info">
                  <b>دوره آنلاین</b>
                  <p>در این روش، قرآن‌آموزان هر هفته در جلسه‌ای یک‌ساعت‌ونیمه، به‌صورت مجازی و در بستر اسکای‌روم گردهم می‌آیند. استاد در این کلاس، نکات کلیدی حفظ و تدبر صفحه را تشریح می‌کند.</p>
                  <p>شرکت‌کنندگان موظفند با پیروی از برنامه‌ی هفتگی، تمرین‌های حفظ را انجام داده و گزارش روزانه‌ی خود را بارگذاری کنند؛ همچنین برای تسلط بیشتر بر مباحث، می‌توانند نکات تدبری را از طریق کانال «درسنامه رزمی چنین» مرور کنند.</p>
                  <b className="lp-gap">دوره آفلاین</b>
                  <p>در این روش، قرآن‌آموزان موظف‌اند با توجه به برنامه‌ی ارائه‌شده از سوی مجموعه، روزانه یک آیه (پنج روز در هفته) حفظ کنند.</p>
                  <p>محتوای تدبری این دوره به‌صورت فایل‌های صوتی و ویدئوهای کوتاه در نظر گرفته شده است که قرآن‌آموز باید ضمن مطالعه و گوش دادن دقیق به آن‌ها، گزارش روزانه‌ی خود را بارگذاری کند و هفته‌ای بیست دقیقه تا نیم ساعت نیز برای تحویل حفظ و تدبر با پشتیبان خود در ارتباط باشد.</p>
                </div>
              )}
              <button type="button" className={"landing-btn" + (sub === "rules" ? " on" : "")} onClick={() => toggle("rules")}>قوانین</button>
              {sub === "rules" && (
                <div className="landing-info">
                  <p>عضویت در کانال «رزمی چنین» در پیام‌رسان بله الزامی است. برای مواردی مانند بارداری، زایمان و آزمون‌های تحصیلی، تدابیری برای مرخصی در نظر گرفته شده است.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {(page === "sireh" || page === "life" || page === "free") && (
          <section className="lp-sec">
            <button type="button" className="lp-back" onClick={() => go("")}>← بازگشت</button>
            <h2>{MENU.find((m) => m.key === page)?.label}</h2>
            <p>به‌زودی.</p>
          </section>
        )}

      </div>
      <footer className="lp2-foot">رزمی چنین</footer>
    </div>
  );
}
