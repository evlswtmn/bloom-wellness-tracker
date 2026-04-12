import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, gte, lte, and, like } from "drizzle-orm";
import {
  activityLogs, foodItems, calorieEntries, userSettings,
  weightLogs, sleepLogs, medications, medicationLogs,
  type ActivityLog, type InsertActivityLog,
  type FoodItem, type InsertFoodItem,
  type CalorieEntry, type InsertCalorieEntry,
  type UserSettings, type InsertUserSettings,
  type WeightLog, type InsertWeightLog,
  type SleepLog, type InsertSleepLog,
  type Medication, type InsertMedication,
  type MedicationLog, type InsertMedicationLog,
} from "@shared/schema";

const sqlite = new Database("wellness.db");
const db = drizzle(sqlite);

// ─── Migrate / seed ───────────────────────────────────────────────────────────
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    steps INTEGER,
    duration_minutes INTEGER,
    distance_miles REAL,
    calories_burned INTEGER,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS food_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    calories INTEGER NOT NULL,
    is_preset INTEGER NOT NULL DEFAULT 0,
    serving_size TEXT
  );

  CREATE TABLE IF NOT EXISTS calorie_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    food_item_id INTEGER NOT NULL,
    food_name TEXT NOT NULL,
    calories INTEGER NOT NULL,
    servings REAL NOT NULL DEFAULT 1,
    meal_type TEXT
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    daily_calorie_goal INTEGER NOT NULL DEFAULT 2000,
    daily_step_goal INTEGER NOT NULL DEFAULT 10000,
    activity_level TEXT NOT NULL DEFAULT 'moderate'
  );

  CREATE TABLE IF NOT EXISTS weight_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    weight_lbs REAL NOT NULL,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS sleep_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    bedtime TEXT,
    wake_time TEXT,
    hours_slept REAL,
    quality INTEGER,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS medications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    dosage TEXT,
    schedule_time TEXT,
    schedule_days TEXT NOT NULL DEFAULT 'daily',
    active INTEGER NOT NULL DEFAULT 1,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS medication_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medication_id INTEGER NOT NULL,
    medication_name TEXT NOT NULL,
    scheduled_time TEXT,
    taken_at TEXT,
    date TEXT NOT NULL,
    taken INTEGER NOT NULL DEFAULT 0,
    skipped INTEGER NOT NULL DEFAULT 0
  );
`);

// Seed preset food items
const existingPresets = db.select().from(foodItems).where(eq(foodItems.isPreset, true)).all();
if (existingPresets.length === 0) {
  const presets = [
    { name: "Apple", calories: 95, isPreset: true, servingSize: "1 medium" },
    { name: "Orange", calories: 62, isPreset: true, servingSize: "1 medium" },
    { name: "Banana", calories: 105, isPreset: true, servingSize: "1 medium" },
    { name: "Grilled Cheese", calories: 390, isPreset: true, servingSize: "1 sandwich" },
    { name: "PB&J", calories: 380, isPreset: true, servingSize: "1 sandwich" },
  ];
  for (const p of presets) {
    db.insert(foodItems).values(p).run();
  }
}

// Ensure at least 1 settings row
const settingsRows = db.select().from(userSettings).all();
if (settingsRows.length === 0) {
  db.insert(userSettings).values({ dailyCalorieGoal: 2000, dailyStepGoal: 10000, activityLevel: "moderate" }).run();
}

// ─── Storage interface ────────────────────────────────────────────────────────
export interface IStorage {
  // Settings
  getSettings(): UserSettings;
  updateSettings(data: Partial<InsertUserSettings>): UserSettings;

  // Activity
  getActivityLogs(date?: string): ActivityLog[];
  getActivityLogsByRange(start: string, end: string): ActivityLog[];
  addActivityLog(data: InsertActivityLog): ActivityLog;
  deleteActivityLog(id: number): void;

  // Food items
  getFoodItems(search?: string): FoodItem[];
  getFoodItemByName(name: string): FoodItem | undefined;
  addFoodItem(data: InsertFoodItem): FoodItem;
  updateFoodItem(id: number, data: Partial<InsertFoodItem>): FoodItem;
  deleteFoodItem(id: number): void;

  // Calorie entries
  getCalorieEntries(date: string): CalorieEntry[];
  getCalorieEntriesByRange(start: string, end: string): CalorieEntry[];
  addCalorieEntry(data: InsertCalorieEntry): CalorieEntry;
  deleteCalorieEntry(id: number): void;

  // Weight
  getWeightLogs(): WeightLog[];
  getWeightLogsByRange(start: string, end: string): WeightLog[];
  addWeightLog(data: InsertWeightLog): WeightLog;
  deleteWeightLog(id: number): void;

  // Sleep
  getSleepLogs(): SleepLog[];
  getSleepLogsByRange(start: string, end: string): SleepLog[];
  getSleepLog(date: string): SleepLog | undefined;
  upsertSleepLog(data: InsertSleepLog): SleepLog;
  deleteSleepLog(id: number): void;

  // Medications
  getMedications(): Medication[];
  addMedication(data: InsertMedication): Medication;
  updateMedication(id: number, data: Partial<InsertMedication>): Medication;
  deleteMedication(id: number): void;

  // Medication logs
  getMedicationLogs(date: string): MedicationLog[];
  getMedicationLogsByRange(start: string, end: string): MedicationLog[];
  upsertMedicationLog(data: InsertMedicationLog): MedicationLog;
  updateMedicationLog(id: number, data: Partial<InsertMedicationLog>): MedicationLog;
}

class SQLiteStorage implements IStorage {
  getSettings(): UserSettings {
    return db.select().from(userSettings).get()!;
  }

  updateSettings(data: Partial<InsertUserSettings>): UserSettings {
    const current = this.getSettings();
    db.update(userSettings).set(data).where(eq(userSettings.id, current.id)).run();
    return this.getSettings();
  }

  getActivityLogs(date?: string): ActivityLog[] {
    if (date) {
      return db.select().from(activityLogs).where(eq(activityLogs.date, date)).all();
    }
    return db.select().from(activityLogs).orderBy(desc(activityLogs.date)).all();
  }

  getActivityLogsByRange(start: string, end: string): ActivityLog[] {
    return db.select().from(activityLogs)
      .where(and(gte(activityLogs.date, start), lte(activityLogs.date, end)))
      .orderBy(activityLogs.date).all();
  }

  addActivityLog(data: InsertActivityLog): ActivityLog {
    return db.insert(activityLogs).values(data).returning().get();
  }

  deleteActivityLog(id: number): void {
    db.delete(activityLogs).where(eq(activityLogs.id, id)).run();
  }

  getFoodItems(search?: string): FoodItem[] {
    if (search) {
      return db.select().from(foodItems)
        .where(like(foodItems.name, `%${search}%`))
        .orderBy(foodItems.name).all();
    }
    return db.select().from(foodItems).orderBy(foodItems.name).all();
  }

  getFoodItemByName(name: string): FoodItem | undefined {
    return db.select().from(foodItems).where(eq(foodItems.name, name)).get();
  }

  addFoodItem(data: InsertFoodItem): FoodItem {
    return db.insert(foodItems).values(data).returning().get();
  }

  updateFoodItem(id: number, data: Partial<InsertFoodItem>): FoodItem {
    db.update(foodItems).set(data).where(eq(foodItems.id, id)).run();
    return db.select().from(foodItems).where(eq(foodItems.id, id)).get()!;
  }

  deleteFoodItem(id: number): void {
    db.delete(foodItems).where(eq(foodItems.id, id)).run();
  }

  getCalorieEntries(date: string): CalorieEntry[] {
    return db.select().from(calorieEntries).where(eq(calorieEntries.date, date)).all();
  }

  getCalorieEntriesByRange(start: string, end: string): CalorieEntry[] {
    return db.select().from(calorieEntries)
      .where(and(gte(calorieEntries.date, start), lte(calorieEntries.date, end)))
      .orderBy(calorieEntries.date).all();
  }

  addCalorieEntry(data: InsertCalorieEntry): CalorieEntry {
    return db.insert(calorieEntries).values(data).returning().get();
  }

  deleteCalorieEntry(id: number): void {
    db.delete(calorieEntries).where(eq(calorieEntries.id, id)).run();
  }

  getWeightLogs(): WeightLog[] {
    return db.select().from(weightLogs).orderBy(desc(weightLogs.date)).all();
  }

  getWeightLogsByRange(start: string, end: string): WeightLog[] {
    return db.select().from(weightLogs)
      .where(and(gte(weightLogs.date, start), lte(weightLogs.date, end)))
      .orderBy(weightLogs.date).all();
  }

  addWeightLog(data: InsertWeightLog): WeightLog {
    return db.insert(weightLogs).values(data).returning().get();
  }

  deleteWeightLog(id: number): void {
    db.delete(weightLogs).where(eq(weightLogs.id, id)).run();
  }

  getSleepLogs(): SleepLog[] {
    return db.select().from(sleepLogs).orderBy(desc(sleepLogs.date)).all();
  }

  getSleepLogsByRange(start: string, end: string): SleepLog[] {
    return db.select().from(sleepLogs)
      .where(and(gte(sleepLogs.date, start), lte(sleepLogs.date, end)))
      .orderBy(sleepLogs.date).all();
  }

  getSleepLog(date: string): SleepLog | undefined {
    return db.select().from(sleepLogs).where(eq(sleepLogs.date, date)).get();
  }

  upsertSleepLog(data: InsertSleepLog): SleepLog {
    const existing = this.getSleepLog(data.date);
    if (existing) {
      db.update(sleepLogs).set(data).where(eq(sleepLogs.id, existing.id)).run();
      return db.select().from(sleepLogs).where(eq(sleepLogs.id, existing.id)).get()!;
    }
    return db.insert(sleepLogs).values(data).returning().get();
  }

  deleteSleepLog(id: number): void {
    db.delete(sleepLogs).where(eq(sleepLogs.id, id)).run();
  }

  getMedications(): Medication[] {
    return db.select().from(medications).orderBy(medications.name).all();
  }

  addMedication(data: InsertMedication): Medication {
    return db.insert(medications).values(data).returning().get();
  }

  updateMedication(id: number, data: Partial<InsertMedication>): Medication {
    db.update(medications).set(data).where(eq(medications.id, id)).run();
    return db.select().from(medications).where(eq(medications.id, id)).get()!;
  }

  deleteMedication(id: number): void {
    db.delete(medications).where(eq(medications.id, id)).run();
  }

  getMedicationLogs(date: string): MedicationLog[] {
    return db.select().from(medicationLogs).where(eq(medicationLogs.date, date)).all();
  }

  getMedicationLogsByRange(start: string, end: string): MedicationLog[] {
    return db.select().from(medicationLogs)
      .where(and(gte(medicationLogs.date, start), lte(medicationLogs.date, end)))
      .orderBy(medicationLogs.date).all();
  }

  upsertMedicationLog(data: InsertMedicationLog): MedicationLog {
    const existing = db.select().from(medicationLogs)
      .where(and(
        eq(medicationLogs.medicationId, data.medicationId),
        eq(medicationLogs.date, data.date),
        ...(data.scheduledTime ? [eq(medicationLogs.scheduledTime, data.scheduledTime)] : [])
      )).get();
    if (existing) {
      db.update(medicationLogs).set(data).where(eq(medicationLogs.id, existing.id)).run();
      return db.select().from(medicationLogs).where(eq(medicationLogs.id, existing.id)).get()!;
    }
    return db.insert(medicationLogs).values(data).returning().get();
  }

  updateMedicationLog(id: number, data: Partial<InsertMedicationLog>): MedicationLog {
    db.update(medicationLogs).set(data).where(eq(medicationLogs.id, id)).run();
    return db.select().from(medicationLogs).where(eq(medicationLogs.id, id)).get()!;
  }
}

export const storage = new SQLiteStorage();
