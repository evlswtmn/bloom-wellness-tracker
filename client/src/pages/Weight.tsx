import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trash2, Plus, Scale, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { today, thisWeekRange, thisMonthRange, formatDate, formatShort } from "@/lib/dateUtils";
import type { WeightLog } from "@shared/schema";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";

export default function Weight() {
  const { toast } = useToast();
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { date: today(), weightLbs: "", notes: "" }
  });

  const { data: allLogs = [], isLoading } = useQuery<WeightLog[]>({ queryKey: ["/api/weight"] });

  const addMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/weight", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weight"] });
      reset({ date: today(), weightLbs: "", notes: "" });
      toast({ title: "Weight logged!" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/weight/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/weight"] }),
  });

  const onSubmit = (data: any) => {
    addMutation.mutate({ date: data.date, weightLbs: parseFloat(data.weightLbs), notes: data.notes || null });
  };

  // Compute stats
  const sorted = [...allLogs].sort((a, b) => a.date.localeCompare(b.date));
  const weekRange = thisWeekRange();
  const monthRange = thisMonthRange();
  const weekLogs = sorted.filter(w => w.date >= weekRange.start && w.date <= weekRange.end);
  const monthLogs = sorted.filter(w => w.date >= monthRange.start && w.date <= monthRange.end);

  const latest = allLogs[0];
  const prev = allLogs[1];
  const diff = latest && prev ? latest.weightLbs - prev.weightLbs : null;
  const weekAvg = weekLogs.length ? weekLogs.reduce((s, w) => s + w.weightLbs, 0) / weekLogs.length : null;
  const monthAvg = monthLogs.length ? monthLogs.reduce((s, w) => s + w.weightLbs, 0) / monthLogs.length : null;

  const chartData = sorted.slice(-30).map(w => ({
    date: formatShort(w.date),
    weight: w.weightLbs,
  }));

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-bold font-display text-foreground">Weight Tracker</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card data-testid="card-current-weight">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground mb-1">Current</div>
            <div className="text-xl font-bold font-display text-foreground">{latest ? `${latest.weightLbs}` : "—"}</div>
            <div className="text-xs text-muted-foreground">lbs</div>
            {diff !== null && (
              <div className={`text-xs mt-0.5 flex items-center gap-0.5 ${diff < 0 ? "text-primary" : diff > 0 ? "text-orange-500" : "text-muted-foreground"}`}>
                {diff < 0 ? <TrendingDown className="w-3 h-3" /> : diff > 0 ? <TrendingUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                {diff > 0 ? "+" : ""}{diff.toFixed(1)} lbs
              </div>
            )}
          </CardContent>
        </Card>
        <Card data-testid="card-week-avg">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground mb-1">This Week Avg</div>
            <div className="text-xl font-bold font-display text-foreground">{weekAvg ? weekAvg.toFixed(1) : "—"}</div>
            <div className="text-xs text-muted-foreground">lbs</div>
          </CardContent>
        </Card>
        <Card data-testid="card-month-avg">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground mb-1">This Month Avg</div>
            <div className="text-xl font-bold font-display text-foreground">{monthAvg ? monthAvg.toFixed(1) : "—"}</div>
            <div className="text-xs text-muted-foreground">lbs</div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <Card className="mb-6" data-testid="card-weight-chart">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Last 30 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Log Form */}
      <Card className="mb-6" data-testid="card-log-weight">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" /> Log Weight
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm mb-1.5 block">Date</Label>
                <Input type="date" {...register("date", { required: true })} data-testid="input-weight-date" />
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">Weight (lbs)</Label>
                <Input type="number" step="0.1" placeholder="150.0" {...register("weightLbs", { required: true })} data-testid="input-weight-value" />
              </div>
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Notes (optional)</Label>
              <Input placeholder="Morning, after breakfast, etc." {...register("notes")} data-testid="input-weight-notes" />
            </div>
            <Button type="submit" disabled={addMutation.isPending} className="w-full" data-testid="button-log-weight">
              {addMutation.isPending ? "Saving..." : "Log Weight"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* History tabs */}
      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
          <TabsTrigger value="all">All Time</TabsTrigger>
        </TabsList>

        {["week", "month", "all"].map(tab => {
          const logs = tab === "week" ? weekLogs : tab === "month" ? monthLogs : [...allLogs].sort((a, b) => b.date.localeCompare(a.date));
          return (
            <TabsContent key={tab} value={tab}>
              {logs.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Scale className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No weight logs for this period.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map(log => (
                    <Card key={log.id} data-testid={`card-weight-${log.id}`}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{formatDate(log.date)}</div>
                          {log.notes && <div className="text-xs text-muted-foreground">{log.notes}</div>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold font-display text-foreground">{log.weightLbs} lbs</span>
                          <button
                            onClick={() => deleteMutation.mutate(log.id)}
                            className="text-muted-foreground hover:text-destructive"
                            data-testid={`button-delete-weight-${log.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
