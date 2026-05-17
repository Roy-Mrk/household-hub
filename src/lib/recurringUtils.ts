/** 繰り返しエントリの次回適用日を計算する（今日より未来になるまで進める） */
export function calcNextApplyDate(
  currentDateStr: string,
  frequency: 'monthly' | 'yearly',
  dayOfMonth: number
): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [y, m, d] = currentDateStr.split('-').map(Number);
  let current = new Date(y, m - 1, d);

  while (current <= today) {
    if (frequency === 'monthly') {
      let nextMonth = current.getMonth() + 1;
      let nextYear = current.getFullYear();
      if (nextMonth > 11) { nextMonth = 0; nextYear += 1; }
      const lastDay = new Date(nextYear, nextMonth + 1, 0).getDate();
      current = new Date(nextYear, nextMonth, Math.min(dayOfMonth, lastDay));
    } else {
      const nextYear = current.getFullYear() + 1;
      const month = current.getMonth();
      const lastDay = new Date(nextYear, month + 1, 0).getDate();
      current = new Date(nextYear, month, Math.min(dayOfMonth, lastDay));
    }
  }

  return toDateStr(current);
}

/** 新規作成時の初回適用日を計算する */
export function calcInitialNextApplyDate(
  frequency: 'monthly' | 'yearly',
  dayOfMonth: number,
  monthOfYear: number | null | undefined
): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();
  const month = today.getMonth();
  const todayDay = today.getDate();

  if (frequency === 'monthly') {
    let targetYear = year;
    let targetMonth = month;
    if (todayDay >= dayOfMonth) {
      targetMonth += 1;
      if (targetMonth > 11) { targetMonth = 0; targetYear += 1; }
    }
    const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
    return toDateStr(new Date(targetYear, targetMonth, Math.min(dayOfMonth, lastDay)));
  } else {
    const targetMonthIndex = (monthOfYear ?? 1) - 1;
    const lastDayThisYear = new Date(year, targetMonthIndex + 1, 0).getDate();
    const dayThisYear = Math.min(dayOfMonth, lastDayThisYear);
    const thisYearDate = new Date(year, targetMonthIndex, dayThisYear);

    if (thisYearDate > today) {
      return toDateStr(thisYearDate);
    }
    const lastDayNextYear = new Date(year + 1, targetMonthIndex + 1, 0).getDate();
    return toDateStr(new Date(year + 1, targetMonthIndex, Math.min(dayOfMonth, lastDayNextYear)));
  }
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
