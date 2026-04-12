import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Plus, Pill, Check, X, Bell, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { today, formatDate } from "@/lib/dateUtils";
import type { Medication, MedicationLog } from "@shared/schema";
import { format } from "date-fns";

export default function Medications() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(today());
  const [open, setOpen] = useState(false);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { name: "", dosage: "", scheduleTime: "", scheduleDays: "daily", notes: "" }
  });

  const { data: medications = [] } = useQuery<Medication[]>({ queryKey: ["/api/medications"] });
  const { data: medLogs = [] } = useQuery<MedicationLog[]>({
    queryKey: ["/api/medication-logs", selectedDate],
    queryFn: () => apiRequest("GET", `/api/medication-logs?date=${selectedDate}`).then(r => r.json()),
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/medications", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medications"] });
      reset();
      setOpen(false);
      toast({ title: "Medication added!" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/medications/${id}`, data).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/medications"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/medications/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/medications"] }),
  });

  const logMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/medication-logs", data).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/medication-logs"] }),
  });

  const updateLogMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/medication-logs/${id}`, data).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/medication-logs"] }),
  });

  const onAdd = (data: any) => {
    addMutation.mutate({
      name: data.name,
      dosage: data.dosage || null,
      scheduleTime: data.scheduleTime || null,
      scheduleDays: data.scheduleDays || "daily",
      notes: data.notes || null,
      active: true,
    });
  };

  const markTaken = (med: Medication, taken: boolean) => {
    const existing = medLogs.find(l => l.medicationId === med.id);
    if (existing) {
      updateLogMutation.mutate({ id: existing.id, data: { taken, takenAt: taken ? new Date().toISOString() : null, skipped: false } });
    } else {
      logMutation.mutate({
        medicationId: med.id,
        medicationName: med.name,
        scheduledTime: med.scheduleTime || null,
        takenAt: taken ? new Date().toISOString() : null,
        date: selectedDate,
        taken,
        skipped: false,
      });
    }
    if (taken) toast({ title: `✓ ${med.name} marked as taken` });
  };

  const activeMeds = medications.filter(m => m.active);
  const inactiveMeds = medications.filter(m => !m.active);
  const takenCount = activeMeds.filter(m => medLogs.find(l => l.medicationId === m.id && l.taken)).length;

  // Notification check — simple in-browser reminder
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentTime = format(now, "HH:mm");
      if (selectedDate !== today()) return;
      activeMeds.forEach(med => {
        if (!med.scheduleTime) return;
        const times = med.scheduleTime.split(",").map(t => t.trim());
        times.forEach(t => {
          if (t === currentTime) {
            const alreadyLogged = medLogs.find(l => l.medicationId === med.id && l.taken);
            if (!alreadyLogged) {
              toast({
                title: `⏰ Time to take ${med.name}`,
                description: med.dosage ? `Dosage: ${med.dosage}` : undefined,
              });
            }
          }
        });
      });
    };
    const interval = setInterval(checkReminders, 30000); // check every 30s
    checkReminders();
    return () => clearInterval(interval);
  }, [activeMeds, medLogs, selectedDate]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold font-display text-foreground">Medications</h1>
        <div className="flex items-center gap-3">
          <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-44 text-sm" data-testid="input-date" />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-medication">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Medication</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onAdd)} className="space-y-4 mt-2">
                <div>
                  <Label className="text-sm mb-1.5 block">Medication Name</Label>
                  <Input placeholder="e.g. Vitamin D" {...register("name", { required: true })} data-testid="input-med-name" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm mb-1.5 block">Dosage (optional)</Label>
                    <Input placeholder="e.g. 1000 IU" {...register("dosage")} data-testid="input-med-dosage" />
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">Schedule Time(s)</Label>
                    <Input placeholder="e.g. 08:00, 20:00" {...register("scheduleTime")} data-testid="input-med-time" />
                    <p className="text-xs text-muted-foreground mt-1">Separate multiple times with commas</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">Schedule Days</Label>
                  <Input placeholder="daily" {...register("scheduleDays")} data-testid="input-med-days" />
                  <p className="text-xs text-muted-foreground mt-1">e.g. "daily" or "mon,wed,fri"</p>
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">Notes (optional)</Label>
                  <Input placeholder="Take with food, etc." {...register("notes")} data-testid="input-med-notes" />
                </div>
                <Button type="submit" disabled={addMutation.isPending} className="w-full" data-testid="button-save-medication">
                  {addMutation.isPending ? "Saving..." : "Save Medication"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Daily Check-in */}
      {activeMeds.length > 0 && (
        <Card className="mb-6" data-testid="card-daily-checkin">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                {formatDate(selectedDate)} Check-in
              </span>
              <Badge variant={takenCount === activeMeds.length ? "default" : "secondary"} className="text-xs">
                {takenCount}/{activeMeds.length} taken
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeMeds.map(med => {
              const log = medLogs.find(l => l.medicationId === med.id);
              const isTaken = log?.taken || false;
              return (
                <div
                  key={med.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${isTaken ? "bg-primary/8 border-primary/20" : "bg-muted/30 border-border"}`}
                  data-testid={`card-med-checkin-${med.id}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isTaken ? "bg-primary text-primary-foreground" : "bg-border text-muted-foreground"}`}>
                    {isTaken ? <Check className="w-4 h-4" /> : <Pill className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground">{med.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {med.dosage && <span>{med.dosage}</span>}
                      {med.scheduleTime && <span>{med.dosage ? " · " : ""}⏰ {med.scheduleTime}</span>}
                      {isTaken && log?.takenAt && (
                        <span className="text-primary"> · Taken at {format(new Date(log.takenAt), "h:mm a")}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={isTaken ? "outline" : "default"}
                    onClick={() => markTaken(med, !isTaken)}
                    data-testid={`button-mark-taken-${med.id}`}
                    className="shrink-0"
                  >
                    {isTaken ? (
                      <><X className="w-3.5 h-3.5 mr-1" /> Undo</>
                    ) : (
                      <><Check className="w-3.5 h-3.5 mr-1" /> Taken</>
                    )}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Medication Management */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Your Medications</h2>
        {medications.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Pill className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No medications added yet.</p>
            <p className="text-xs mt-1">Use the "Add" button to set up reminders.</p>
          </div>
        )}
        <div className="space-y-2">
          {medications.map(med => (
            <Card key={med.id} data-testid={`card-med-${med.id}`}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${med.active ? "bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400" : "bg-muted text-muted-foreground"}`}>
                  <Pill className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-foreground">{med.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {med.dosage && <span>{med.dosage}</span>}
                    {med.scheduleTime && <span>{med.dosage ? " · " : ""}⏰ {med.scheduleTime}</span>}
                    {med.scheduleDays !== "daily" && <span> · {med.scheduleDays}</span>}
                    {med.notes && <span> · {med.notes}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{med.active ? "Active" : "Paused"}</span>
                    <Switch
                      checked={med.active}
                      onCheckedChange={checked => updateMutation.mutate({ id: med.id, data: { active: checked } })}
                      data-testid={`switch-med-active-${med.id}`}
                    />
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(med.id)}
                    className="text-muted-foreground hover:text-destructive p-1"
                    data-testid={`button-delete-med-${med.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
