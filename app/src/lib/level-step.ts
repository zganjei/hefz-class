/** «سطح» and «گام» of a class. The vocabulary comes from the class workbooks («سطح اول جهاد و مقاومت», «تقویم آموزشی ۵ گام»: گام اول … گام پنجم); anything else is free text under «دیگر». */
export const LEVELS = ["سطح اول"];
export const STEPS = ["گام اول", "گام دوم", "گام سوم", "گام چهارم", "گام پنجم"];
export const lsLabel = (level?: string | null, step?: string | null) => [level, step].filter(Boolean).join(" · ");
