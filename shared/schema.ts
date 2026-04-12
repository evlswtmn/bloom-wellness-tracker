import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Activity / Steps ─────────────────────────────────────────────────────────
export const activityLogs = sqliteTable("activity_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // YYYY-MM-DD
  type: text("type").notNull(), // "steps" | "yoga" | "cycling" | "treadmill" | "hiking" | "tai_chi" | "walking" | "japanese_walking" | "other"
  steps: integer("steps"), // for steps
  durationMinutes: integer("duration_minutes"), // for other exercises
  distanceMiles: real("distance_miles"), // computed or entered
  caloriesBurned: integer("calories_burned"),
  notes: text("notes"),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true });
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

// ─── Food / Calories ──────────────────────────────────────────────────────────
export const foodItems = sqliteTable("food_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  calories: integer("calories").notNull(),
  isPreset: integer("is_preset", { mode: "boolean" }).notNull().default(false),
  servingSize: text("serving_size"), // e.g. "1 medium", "2 cookies"
});

export const insertFoodItemSchema = createInsertSchema(foodItems).omit({ id: true });
export type InsertFoodItem = z.infer<typeof insertFoodItemSchema>;
export type FoodItem = typeof foodItems.$inferSelect;

export const calorieEntries = sqliteTable("calorie_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // YYYY-MM-DD
  foodItemId: integer("food_item_id").notNull(),
  foodName: text("food_name").notNull(),
  calories: integer("calories").notNull(),
  servings: real("servings").notNull().default(1),
  mealType: text("meal_type"), // breakfast | lunch | dinner | snack
});

export const insertCalorieEntrySchema = createInsertSchema(calorieEntries).omit({ id: true });
export type InsertCalorieEntry = z.infer<typeof insertCalorieEntrySchema>;
export type CalorieEntry = typeof calorieEntries.$inferSelect;

// ─── Daily Goals / Settings ───────────────────────────────────────────────────
export const userSettings = sqliteTable("user_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dailyCalorieGoal: integer("daily_calorie_goal").notNull().default(2000),
  dailyStepGoal: integer("daily_step_goal").notNull().default(10000),
  activityLevel: text("activity_level").notNull().default("moderate"), // sedentary | light | moderate | active | very_active
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({ id: true });
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettings.$inferSelect;

// ─── Weight Tracking ──────────────────────────────────────────────────────────
export const weightLogs = sqliteTable("weight_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // YYYY-MM-DD
  weightLbs: real("weight_lbs").notNull(),
  notes: text("notes"),
});

export const insertWeightLogSchema = createInsertSchema(weightLogs).omit({ id: true });
export type InsertWeightLog = z.infer<typeof insertWeightLogSchema>;
export type WeightLog = typeof weightLogs.$inferSelect;

// ─── Sleep Tracking ───────────────────────────────────────────────────────────
export const sleepLogs = sqliteTable("sleep_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // YYYY-MM-DD (the morning you woke up)
  bedtime: text("bedtime"), // HH:MM
  wakeTime: text("wake_time"), // HH:MM
  hoursSlept: real("hours_slept"),
  quality: integer("quality"), // 1-5 rating
  notes: text("notes"),
});

export const insertSleepLogSchema = createInsertSchema(sleepLogs).omit({ id: true });
export type InsertSleepLog = z.infer<typeof insertSleepLogSchema>;
export type SleepLog = typeof sleepLogs.$inferSelect;

// ─── Medications ──────────────────────────────────────────────────────────────
export const medications = sqliteTable("medications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  dosage: text("dosage"),
  scheduleTime: text("schedule_time"), // HH:MM, comma-separated for multiple
  scheduleDays: text("schedule_days").notNull().default("daily"), // "daily" | "mon,wed,fri" etc.
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  notes: text("notes"),
});

export const insertMedicationSchema = createInsertSchema(medications).omit({ id: true });
export type InsertMedication = z.infer<typeof insertMedicationSchema>;
export type Medication = typeof medications.$inferSelect;

export const medicationLogs = sqliteTable("medication_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  medicationId: integer("medication_id").notNull(),
  medicationName: text("medication_name").notNull(),
  scheduledTime: text("scheduled_time"), // the time it was supposed to be taken
  takenAt: text("taken_at"), // ISO timestamp when marked as taken
  date: text("date").notNull(), // YYYY-MM-DD
  taken: integer("taken", { mode: "boolean" }).notNull().default(false),
  skipped: integer("skipped", { mode: "boolean" }).notNull().default(false),
});

export const insertMedicationLogSchema = createInsertSchema(medicationLogs).omit({ id: true });
export type InsertMedicationLog = z.infer<typeof insertMedicationLogSchema>;
export type MedicationLog = typeof medicationLogs.$inferSelect;
