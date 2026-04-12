import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Trash2, Plus, Moon, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { today, formatDate, last30Days } from "@/lib/dateUtils";
import type { SleepLog } from "@shared/schema";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const QUALITY_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
const QUALITY_COLORS = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981"];

function QualityStars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-3 h-3 ${i <= rating ? "fill-current text-yellow-400" : "text-muted-foreground"}`} />
      ))}
    </div>
  );
}

function calcHours(bedtime: string, wakeTime: string): number | null {
  if (!bedtime || !wakeTime) return null;
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = wakeTime.split(":").map(Number);
  let minutes = (wh * 60 + wm) - (bh * 60 + bm);
  if (minutes < 0) minutes += 24 * 60; // overnight
  return Math.round((minutes / 60) * 10) / 10;
}

export default function Sleep() {
  const { toast } = useToast();
  const [quality, setQuality] = useState(3);

  const { register, handleSubmit, watch, reset } = useForm({
    defaultValues: { date: today(), bedtime: "22:00", wakeTime: "06:30", notes: "" }
  });

  const watchBedtime = watch("bedtime");
  const watchWake = watch("wakeTime");
  const previewHours = calcHours(watchBedtime, watchWake);

  const { data: allLogs = [] } = useQuery<SleepLog[]>({ queryKey: ["/api/sleep"] });

  const addMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/sleep", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sleep"] });
      reset({ date: today(), bedtime: "22:00", wakeTime: "06:30", notes: "" });
      setQuality(3);
      toast({ title: "Sleep logged!" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/sleep/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/sleep"] }),
  });

  const onSubmit = (data: any) => {
    const hours = calcHours(data.bedtime, data.wakeTime);
    addMutation.mutate({
      date: data.date,
      bedtime: data.bedtime || null,
      wakeTime: data.wakeTime || null,
      hoursSlept: hours,
      quality: quality || null,
      notes: data.notes || null,
    });
  };

  const sorted = [...allLogs].sort((a, b) => b.date.localeCompare(a.date));
  const { start, end } = last30Days();
  const recent = sorted.filter(l => l.date >= start && l.date <= end);
  const avgHours = recent.length ? Math.round(recent.reduce((s, l) => s + (l.hoursSlept || 0), 0) / recent.length * 10) / 10 : null;
  const avgQuality = recent.filter(l => l.quality).length ? Math.round(recent.filter(l => l.quality).reduce((s, l) => s + (l.quality || 0), 0) / recent.filter(l => l.quality).length * 10) / 10 : null;

  const chartData = recent.slice().reverse().slice(-14).map(l => ({
    date: l.date.slice(5),
    hours: l.hoursSlept || 0,
    quality: l.quality || 0,
  }));

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold font-display text-foreground mb-6">Sleep Tracker</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground mb-1">Avg Hours (30d)</div>
            <div className="text-xl font-bold font-display text-foreground">{avgHours ?? "—"}</div>
            <div className="text-xs text-muted-foreground">hrs / night</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground mb-1">Avg Quality</div>
            <div className="text-xl font-bold font-display text-foreground">{avgQuality ?? "—"}</div>
            {avgQuality && <div className="text-xs text-muted-foreground">{QUALITY_LABELS[Math.round(avgQuality)]}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground mb-1">Logged Nights</div>
            <div className="text-xl font-bold font-display text-foreground">{allLogs.length}</div>
            <div className="text-xs text-muted-foreground">total</div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Last 14 Nights</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} domain={[0, 12]} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Line type="monotone" dataKey="hours" name="Hours" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Log Form */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" /> Log Sleep
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-sm mb-1.5 block">Date (woke up)</Label>
                <Input type="date" {...register("date")} data-testid="input-sleep-date" />
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">Bedtime</Label>
                <Input type="time" {...register("bedtime")} data-testid="input-bedtime" />
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">Wake Time</Label>
                <Input type="time" {...register("wakeTime")} data-testid="input-wake-time" />
              </div>
            </div>
            {previewHours !== null && (
              <p className="text-sm font-medium text-primary">
                ≈ {previewHours} hours of sleep
              </p>
            )}
            <div>
              <Label className="text-sm mb-2 block">Sleep Quality: <span className="text-foreground">{QUALITY_LABELS[quality]}</span></Label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-8">Poor</span>
                <Slider
                  min={1} max={5} step={1}
                  value={[quality]}
                  onValueChange={([v]) => setQuality(v)}
                  className="flex-1"
                  data-testid="slider-sleep-quality"
                />
                <span className="text-xs text-muted-foreground w-14">Excellent</span>
              </div>
              <div className="mt-1.5"><QualityStars rating={quality} /></div>
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Notes (optional)</Label>
              <Input placeholder="Woke up at 3am, felt rested..." {...register("notes")} data-testid="input-sleep-notes" />
            </div>
            <Button type="submit" disabled={addMutation.isPending} className="w-full" data-testid="button-log-sleep">
              {addMutation.isPending ? "Saving..." : "Log Sleep"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* History */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">History</h2>
        {sorted.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            <Moon className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No sleep logged yet.</p>
          </div>
        )}
        {sorted.map(log => (
          <Card key={log.id} data-testid={`card-sleep-${log.id}`}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center shrink-0">
                <Moon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">{formatDate(log.date)}</div>
                <div className="text-xs text-muted-foreground">
                  {log.bedtime && log.wakeTime ? `${log.bedtime} → ${log.wakeTime}` : ""}
                  {log.hoursSlept ? ` · ${log.hoursSlept}h` : ""}
                </div>
              </div>
              <div className="text-right mr-1">
                {log.quality && <QualityStars rating={log.quality} />}
                {log.quality && <div className="text-xs text-muted-foreground mt-0.5">{QUALITY_LABELS[log.quality]}</div>}
              </div>
              <button
                onClick={() => deleteMutation.mutate(log.id)}
                className="text-muted-foreground hover:text-destructive p-1"
                data-testid={`button-delete-sleep-${log.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
