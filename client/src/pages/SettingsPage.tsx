import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Leaf, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { UserSettings } from "@shared/schema";
import { useEffect } from "react";

const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentary", desc: "Little or no exercise" },
  { value: "light", label: "Light", desc: "1–3 days/week" },
  { value: "moderate", label: "Moderate", desc: "3–5 days/week" },
  { value: "active", label: "Active", desc: "6–7 days/week" },
  { value: "very_active", label: "Very Active", desc: "Hard exercise daily" },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<UserSettings>({ queryKey: ["/api/settings"] });

  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: { dailyCalorieGoal: 2000, dailyStepGoal: 10000, activityLevel: "moderate" }
  });

  useEffect(() => {
    if (settings) {
      reset({ dailyCalorieGoal: settings.dailyCalorieGoal, dailyStepGoal: settings.dailyStepGoal, activityLevel: settings.activityLevel });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", "/api/settings", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings saved!" });
    },
  });

  const onSubmit = (data: any) => {
    updateMutation.mutate({
      dailyCalorieGoal: parseInt(data.dailyCalorieGoal),
      dailyStepGoal: parseInt(data.dailyStepGoal),
      activityLevel: data.activityLevel,
    });
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-xl font-bold font-display text-foreground mb-6">Settings</h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" /> Daily Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="skeleton h-32 rounded-lg" />
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <Label className="text-sm mb-1.5 block">Daily Calorie Goal</Label>
                <Input type="number" min="500" max="5000" step="50" {...register("dailyCalorieGoal")} data-testid="input-calorie-goal" />
                <p className="text-xs text-muted-foreground mt-1">Recommended: 1200–2500 kcal depending on activity level</p>
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">Daily Step Goal</Label>
                <Input type="number" min="1000" max="30000" step="500" {...register("dailyStepGoal")} data-testid="input-step-goal" />
                <p className="text-xs text-muted-foreground mt-1">Most guidelines recommend 8,000–10,000 steps/day</p>
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">Activity Level</Label>
                <Select value={watch("activityLevel")} onValueChange={v => setValue("activityLevel", v)}>
                  <SelectTrigger data-testid="select-activity-level"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_LEVELS.map(l => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label} — {l.desc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Used to adjust your daily calorie balance calculations</p>
              </div>
              <Button type="submit" disabled={updateMutation.isPending} className="w-full" data-testid="button-save-settings">
                {updateMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* About card */}
      <Card className="mt-6">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary/12 flex items-center justify-center">
              <Leaf className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="font-semibold font-display text-foreground">Bloom</div>
              <div className="text-xs text-muted-foreground">Your personal wellness companion</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Track your steps, exercise, calories, weight, sleep, and medications — all in one place.
            Your data is stored locally and privately on your device.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
