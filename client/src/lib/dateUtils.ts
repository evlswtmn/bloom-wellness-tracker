import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths } from "date-fns";

export const today = () => format(new Date(), "yyyy-MM-dd");
export const formatDate = (d: string | Date) => format(typeof d === "string" ? new Date(d + "T00:00:00") : d, "MMM d, yyyy");
export const formatShort = (d: string | Date) => format(typeof d === "string" ? new Date(d + "T00:00:00") : d, "MMM d");

export const thisWeekRange = () => ({
  start: format(startOfWeek(new Date(), { weekStartsOn: 0 }), "yyyy-MM-dd"),
  end: format(endOfWeek(new Date(), { weekStartsOn: 0 }), "yyyy-MM-dd"),
});

export const thisMonthRange = () => ({
  start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
  end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
});

export const last30Days = () => ({
  start: format(subDays(new Date(), 29), "yyyy-MM-dd"),
  end: today(),
});

export const last3Months = () => ({
  start: format(subMonths(new Date(), 3), "yyyy-MM-dd"),
  end: today(),
});

// Convert steps to miles (avg stride ~2.5 ft, 5280 ft/mi)
export const stepsToMiles = (steps: number) => Math.round((steps / 2000) * 100) / 100;

// MET-based calorie burn estimates per minute
const MET_VALUES: Record<string, number> = {
  steps: 3.5,
  walking: 3.5,
  japanese_walking: 4.0,
  yoga: 2.5,
  tai_chi: 3.0,
  cycling: 7.0,
  treadmill: 5.5,
  hiking: 6.0,
  other: 4.0,
};

// Calories burned = MET * weight(kg) * time(hours) — use 68kg (~150 lbs) as default
export const estimateCaloriesBurned = (type: string, durationMinutes: number, weightLbs = 150) => {
  const met = MET_VALUES[type] ?? 4.0;
  const weightKg = weightLbs * 0.453592;
  return Math.round(met * weightKg * (durationMinutes / 60));
};
