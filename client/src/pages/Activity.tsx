import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Footprints, Timer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { today, stepsToMiles, estimateCaloriesBurned, formatDate } from "@/lib/dateUtils";
import type { ActivityLog } from "@shared/schema";

const EXERCISE_TYPES = [
  { value: "steps", label: "Steps", icon: "👟" },
  { value: "walking", label: "Walking", icon: "🚶" },
  { value: "japanese_walking", label: "Japanese Walking", icon: "🏃" },
  { value: "yoga", label: "Yoga", icon: "🧘" },
  { value: "tai_chi", label: "Tai Chi", icon: "🌊" },
  { value: "cycling", label: "Cycling", icon: "🚴" },
  { value: "treadmill", label: "Treadmill", icon: "⚡" },
  { value: "hiking", label: "Hiking", icon: "🥾" },
  { value: "other", label: "Other", icon: "💪" },
];

export default function Activity() {
  const [selectedDate, setSelectedDate] = useState(today());
  const { toast } = useToast();
  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm({
    defaultValues: { type: "steps", steps: "", durationMinutes: "", notes: "", caloriesBurned: "" }
  });

  const exerciseType = watch("type");
  const isSteps = exerciseType === "steps";

  const { data: activities = [], isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity", selectedDate],
    queryFn: () => apiRequest("GET", `/api/activity?date=${selectedDate}`).then(r => r.json()),
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/activity", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      reset({ type: "steps", steps: "", durationMinutes: "", notes: "", caloriesBurned: "" });
      toast({ title: "Activity logged!" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/activity/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/activity"] }),
  });

  const onSubmit = (data: any) => {
    const type = data.type;
    const steps = type === "steps" ? parseInt(data.steps) || 0 : undefined;
    const durationMinutes = type !== "steps" ? parseInt(data.durationMinutes) || 0 : undefined;
    const distanceMiles = type === "steps" && steps ? stepsToMiles(steps) : undefined;
    const caloriesBurned = type !== "steps" && durationMinutes
      ? estimateCaloriesBurned(type, durationMinutes)
      : undefined;

    addMutation.mutate({
      date: selectedDate,
      type,
      steps,
      durationMinutes,
      distanceMiles,
      caloriesBurned,
      notes: data.notes || null,
    });
  };

  const totalSteps = activities.filter(a => a.type === "steps").reduce((s, a) => s + (a.steps || 0), 0);
  const totalBurned = activities.reduce((s, a) => s + (a.caloriesBurned || 0), 0);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold font-display text-foreground">Activity Tracker</h1>
        <Input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="w-44 text-sm"
          data-testid="input-date-picker"
        />
      </div>

      {/* Summary */}
      {activities.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <Card className="bg-primary/8 border-primary/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Footprints className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs text-muted-foreground">Total Steps</span>
              </div>
              <div className="text-xl font-bold font-display text-primary">{totalSteps.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{stepsToMiles(totalSteps)} miles</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Timer className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-xs text-muted-foreground">Calories Burned</span>
              </div>
              <div className="text-xl font-bold font-display text-foreground">{totalBurned.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">kcal</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted-foreground">Sessions</span>
              </div>
              <div className="text-xl font-bold font-display text-foreground">{activities.length}</div>
              <div className="text-xs text-muted-foreground">logged today</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Log Form */}
      <Card className="mb-6" data-testid="card-log-activity">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" /> Log Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label className="text-sm mb-1.5 block">Exercise Type</Label>
              <Select value={exerciseType} onValueChange={v => setValue("type", v)}>
                <SelectTrigger data-testid="select-exercise-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXERCISE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.icon} {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isSteps ? (
              <div>
                <Label className="text-sm mb-1.5 block">Number of Steps</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 5000"
                  {...register("steps", { required: isSteps })}
                  data-testid="input-steps"
                />
                {watch("steps") && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ≈ {stepsToMiles(parseInt(watch("steps")) || 0)} miles
                  </p>
                )}
              </div>
            ) : (
              <div>
                <Label className="text-sm mb-1.5 block">Duration (minutes)</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 30"
                  {...register("durationMinutes")}
                  data-testid="input-duration"
                />
                {watch("durationMinutes") && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ≈ {estimateCaloriesBurned(exerciseType, parseInt(watch("durationMinutes")) || 0)} calories burned (est.)
                  </p>
                )}
              </div>
            )}

            <div>
              <Label className="text-sm mb-1.5 block">Notes (optional)</Label>
              <Input placeholder="Any notes..." {...register("notes")} data-testid="input-notes" />
            </div>

            <Button type="submit" disabled={addMutation.isPending} className="w-full" data-testid="button-log-activity">
              {addMutation.isPending ? "Logging..." : "Log Activity"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Activity List */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {formatDate(selectedDate)} — {activities.length} {activities.length === 1 ? "entry" : "entries"}
        </h2>
        {isLoading && <div className="skeleton h-16 rounded-lg" />}
        {!isLoading && activities.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Footprints className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No activity logged for this day yet.</p>
            <p className="text-xs mt-1">Log your first activity above!</p>
          </div>
        )}
        {activities.map(log => {
          const typeInfo = EXERCISE_TYPES.find(t => t.value === log.type);
          return (
            <Card key={log.id} data-testid={`card-activity-${log.id}`}>
              <CardContent className="p-3 flex items-center gap-3">
                <span className="text-xl">{typeInfo?.icon || "💪"}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-foreground">{typeInfo?.label || log.type}</div>
                  <div className="text-xs text-muted-foreground">
                    {log.type === "steps" ? (
                      <>{log.steps?.toLocaleString()} steps · {log.distanceMiles} miles</>
                    ) : (
                      <>{log.durationMinutes} min{log.caloriesBurned ? ` · ${log.caloriesBurned} kcal` : ""}</>
                    )}
                    {log.notes && <> · {log.notes}</>}
                  </div>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(log.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                  aria-label="Delete"
                  data-testid={`button-delete-activity-${log.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
