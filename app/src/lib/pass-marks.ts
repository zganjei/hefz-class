/** The grade-book columns of the class workbooks («دفتر نمرات»): shared by the API and the UI. «exam» is the overall pass of an exam block. */
export const CRITERIA: { key: string; label: string }[] = [
  { key: "exam", label: "قبولی آزمون" },
  { key: "hifz", label: "حسن حفظ" },
  { key: "tadabbur", label: "حسن تدبر" },
  { key: "tarjome", label: "حسن ترجمه" },
  { key: "reports", label: "ارسال گزارشات" },
  { key: "final", label: "نمره نهایی" },
];
export const CRITERION_KEYS = CRITERIA.map(c => c.key);
/** Groups the workbooks use for step one («گام اول»); offered as one-tap suggestions, any other title can be typed. */
export const GROUP_SUGGESTIONS = ["سوره فتح", "سوره محمد", "سوره حجرات", "آزمون گام اول"];
