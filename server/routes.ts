import type { Express } from "express";
import { Server } from "http";
import { storage } from "./storage";
import { z } from "zod";

export function registerRoutes(httpServer: Server, app: Express): void {
  // ─── Settings ─────────────────────────────────────────────────────────────
  app.get("/api/settings", (_req, res) => {
    res.json(storage.getSettings());
  });

  app.patch("/api/settings", (req, res) => {
    try {
      const updated = storage.updateSettings(req.body);
      res.json(updated);
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });

  // ─── Activity ─────────────────────────────────────────────────────────────
  app.get("/api/activity", (req, res) => {
    const { date, start, end } = req.query as Record<string, string>;
    if (start && end) {
      res.json(storage.getActivityLogsByRange(start, end));
    } else {
      res.json(storage.getActivityLogs(date));
    }
  });

  app.post("/api/activity", (req, res) => {
    try {
      const log = storage.addActivityLog(req.body);
      res.status(201).json(log);
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });

  app.delete("/api/activity/:id", (req, res) => {
    storage.deleteActivityLog(Number(req.params.id));
    res.status(204).send();
  });

  // ─── Food Items ───────────────────────────────────────────────────────────
  app.get("/api/food-items", (req, res) => {
    const { search } = req.query as Record<string, string>;
    res.json(storage.getFoodItems(search));
  });

  app.post("/api/food-items", (req, res) => {
    try {
      // Check if already exists (case-insensitive via search)
      const existing = storage.getFoodItemByName(req.body.name);
      if (existing) {
        return res.json(existing);
      }
      const item = storage.addFoodItem({ ...req.body, isPreset: false });
      res.status(201).json(item);
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });

  app.patch("/api/food-items/:id", (req, res) => {
    try {
      const item = storage.updateFoodItem(Number(req.params.id), req.body);
      res.json(item);
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });

  app.delete("/api/food-items/:id", (req, res) => {
    storage.deleteFoodItem(Number(req.params.id));
    res.status(204).send();
  });

  // ─── Calorie Entries ──────────────────────────────────────────────────────
  app.get("/api/calories", (req, res) => {
    const { date, start, end } = req.query as Record<string, string>;
    if (start && end) {
      res.json(storage.getCalorieEntriesByRange(start, end));
    } else {
      res.json(storage.getCalorieEntries(date || new Date().toISOString().slice(0, 10)));
    }
  });

  app.post("/api/calories", (req, res) => {
    try {
      const entry = storage.addCalorieEntry(req.body);
      res.status(201).json(entry);
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });

  app.delete("/api/calories/:id", (req, res) => {
    storage.deleteCalorieEntry(Number(req.params.id));
    res.status(204).send();
  });

  // ─── Weight ───────────────────────────────────────────────────────────────
  app.get("/api/weight", (req, res) => {
    const { start, end } = req.query as Record<string, string>;
    if (start && end) {
      res.json(storage.getWeightLogsByRange(start, end));
    } else {
      res.json(storage.getWeightLogs());
    }
  });

  app.post("/api/weight", (req, res) => {
    try {
      const log = storage.addWeightLog(req.body);
      res.status(201).json(log);
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });

  app.delete("/api/weight/:id", (req, res) => {
    storage.deleteWeightLog(Number(req.params.id));
    res.status(204).send();
  });

  // ─── Sleep ────────────────────────────────────────────────────────────────
  app.get("/api/sleep", (req, res) => {
    const { date, start, end } = req.query as Record<string, string>;
    if (date) {
      const log = storage.getSleepLog(date);
      res.json(log || null);
    } else if (start && end) {
      res.json(storage.getSleepLogsByRange(start, end));
    } else {
      res.json(storage.getSleepLogs());
    }
  });

  app.post("/api/sleep", (req, res) => {
    try {
      const log = storage.upsertSleepLog(req.body);
      res.status(201).json(log);
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });

  app.delete("/api/sleep/:id", (req, res) => {
    storage.deleteSleepLog(Number(req.params.id));
    res.status(204).send();
  });

  // ─── Medications ──────────────────────────────────────────────────────────
  app.get("/api/medications", (_req, res) => {
    res.json(storage.getMedications());
  });

  app.post("/api/medications", (req, res) => {
    try {
      const med = storage.addMedication(req.body);
      res.status(201).json(med);
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });

  app.patch("/api/medications/:id", (req, res) => {
    try {
      const med = storage.updateMedication(Number(req.params.id), req.body);
      res.json(med);
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });

  app.delete("/api/medications/:id", (req, res) => {
    storage.deleteMedication(Number(req.params.id));
    res.status(204).send();
  });

  // ─── Medication Logs ──────────────────────────────────────────────────────
  app.get("/api/medication-logs", (req, res) => {
    const { date, start, end } = req.query as Record<string, string>;
    if (start && end) {
      res.json(storage.getMedicationLogsByRange(start, end));
    } else {
      res.json(storage.getMedicationLogs(date || new Date().toISOString().slice(0, 10)));
    }
  });

  app.post("/api/medication-logs", (req, res) => {
    try {
      const log = storage.upsertMedicationLog(req.body);
      res.status(201).json(log);
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });

  app.patch("/api/medication-logs/:id", (req, res) => {
    try {
      const log = storage.updateMedicationLog(Number(req.params.id), req.body);
      res.json(log);
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });
}
