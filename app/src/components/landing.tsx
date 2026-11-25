import { useState } from "react";

type Sub = "" | "why1" | "why2" | "map" | "online" | "offline" | "rules";

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
  const toggle = (s: Sub) => setSub(sub === s ? "" : s);

  return (
    <main className="lp" dir="rtl">
      <div className="lp-main">
        {page === "" && (
          <section className="lp-home lp-card">
            <h1 className="lp-poem">رقصی چنین میانه‌ی میدانم آرزوست</h1>
            <div className="lp-orn" aria-hidden="true"><span /><i>❖</i><span /></div>
            <img className="lp-logo" src="/razmi-logo.png" alt="رزمی چنین" />
            <p className="lp-intro">
              طرح قرآنی «رزمی چنین» دوره‌ای است با محوریت قرآن کریم که می‌کوشد با تمسک به کلام الهی، قدمی در راه نورانی کردن جامعه بردارد. این دوره دعوتی است به شرکت در رزمی که سلاح آن، انس با قرآن است.
            </p>
            <p className="lp-intro">
              دوره‌ی «رزمی چنین» بر آن است که هر دو بالِ تدبر و حفظ را برای قرآن‌آموزان ارتقا بخشد.
            </p>
            <div className="lp-cta">
              <button type="button" className="landing-btn primary" onClick={onRegister}>ثبت‌نام</button>
              <button type="button" className="landing-btn" onClick={onLogin}>ورود</button>
            </div>
          </section>
        )}

        {page === "hefz" && (
          <section className="lp-sec">
            <button type="button" className="lp-back" onClick={() => { setPage(""); setSub(""); }}>← بازگشت</button>
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
            </div>

            <h3>بیشتر بدانید</h3>
            <div className="lp-subs">
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
              <button type="button" className={"landing-btn" + (sub === "online" ? " on" : "")} onClick={() => toggle("online")}>دوره آنلاین</button>
              {sub === "online" && (
                <div className="landing-info">
                  <p>هفته‌ای یک جلسه‌ی یک تا یک‌ونیم ساعته در کلاس آنلاین شرکت می‌کنید و روزانه دست‌کم نیم ساعت برای حفظ قرآن وقت می‌گذارید. مطابق برنامه‌ی مجموعه، هفته‌ای یک صفحه قرآن را همراه با ترجمه و تدبر حفظ کرده و تحویل می‌دهید.</p>
                </div>
              )}
              <button type="button" className={"landing-btn" + (sub === "offline" ? " on" : "")} onClick={() => toggle("offline")}>دوره آفلاین</button>
              {sub === "offline" && (
                <div className="landing-info">
                  <p>طبق برنامه‌ی مجموعه، روزی یک آیه (پنج روز در هفته) حفظ می‌کنید و هفته‌ای بیست دقیقه تا نیم ساعت با پشتیبان خود برای تحویل حفظ و تدبر ارتباط دارید. صوت‌های آموزشی را هفتگی گوش می‌دهید؛ بنابراین روزانه دست‌کم نیم ساعت زمان لازم است.</p>
                </div>
              )}
              <button type="button" className={"landing-btn" + (sub === "rules" ? " on" : "")} onClick={() => toggle("rules")}>قوانین</button>
              {sub === "rules" && (
                <div className="landing-info">
                  <p>عضویت در کانال «رزمی چنین» در پیام‌رسان بله الزامی است. برای مواردی مانند بارداری، زایمان و آزمون‌های تحصیلی، تدابیری برای مرخصی در نظر گرفته شده است.</p>
                </div>
              )}
              <button type="button" className="landing-btn primary" onClick={onRegister}>ثبت‌نام</button>
            </div>
          </section>
        )}

        {(page === "sireh" || page === "life" || page === "free") && (
          <section className="lp-sec">
            <button type="button" className="lp-back" onClick={() => setPage("")}>← بازگشت</button>
            <h2>{MENU.find((m) => m.key === page)?.label}</h2>
            <p>به‌زودی.</p>
          </section>
        )}

      </div>

      <nav className="lp-menu" aria-label="دوره‌ها">
        <button type="button" className={"lp-item home" + (page === "" ? " on" : "")} onClick={() => { setPage(""); setSub(""); }}>صفحه‌ی اول</button>
        {MENU.map((m) =>
          m.label ? (
            <button key={m.key} type="button" className={"lp-item" + (page === m.key ? " on" : "")} onClick={() => { setPage(m.key); setSub(""); }}>{m.label}</button>
          ) : (
            <div key={m.key} className="lp-item empty" aria-hidden="true">؟</div>
          ),
        )}
      </nav>
    </main>
  );
}
