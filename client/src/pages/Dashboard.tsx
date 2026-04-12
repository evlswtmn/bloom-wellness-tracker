import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Footprints, UtensilsCrossed, Scale, Moon, Pill, TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { today, stepsToMiles } from "@/lib/dateUtils";
import type { ActivityLog, CalorieEntry, WeightLog, SleepLog, MedicationLog, Medication, UserSettings } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

function StatCard({
  title, value, sub, href, icon: Icon, color, progress, progressLabel
}: {
  title: string; value: string; sub?: string; href: string;
  icon: React.ElementType; color: string; progress?: number; progressLabel?: string;
}) {
  return (
    <Link href={href}>
      <Card className="group cursor-pointer hover:shadow-md transition-shadow h-full" data-testid={`card-${title.toLowerCase().replace(/\s/g, "-")}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
          <div className="text-2xl font-bold font-display text-foreground mb-0.5">{value}</div>
          <div className="text-xs text-muted-foreground mb-2">{title}</div>
          {progress !== undefined && (
            <div>
              <Progress value={Math.min(progress, 100)} className="h-1.5 mb-1" />
              <div className="text-xs text-muted-foreground">{progressLabel}</div>
            </div>
          )}
          {sub && !progress && <div className="text-xs text-muted-foreground">{sub}</div>}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Dashboard() {
  const todayStr = today();

  const { data: settings } = useQuery<UserSettings>({ queryKey: ["/api/settings"] });
  const { data: activities } = useQuery<ActivityLog[]>({ queryKey: ["/api/activity", todayStr], queryFn: () => apiRequest("GET", `/api/activity?date=${todayStr}`).then(r => r.json()) });
  const { data: calories } = useQuery<CalorieEntry[]>({ queryKey: ["/api/calories", todayStr], queryFn: () => apiRequest("GET", `/api/calories?date=${todayStr}`).then(r => r.json()) });
  const { data: weights } = useQuery<WeightLog[]>({ queryKey: ["/api/weight"] });
  const { data: sleepLog } = useQuery<SleepLog | null>({ queryKey: ["/api/sleep", todayStr], queryFn: () => apiRequest("GET", `/api/sleep?date=${todayStr}`).then(r => r.json()) });
  const { data: medications } = useQuery<Medication[]>({ queryKey: ["/api/medications"] });
  const { data: medLogs } = useQuery<MedicationLog[]>({ queryKey: ["/api/medication-logs", todayStr], queryFn: () => apiRequest("GET", `/api/medication-logs?date=${todayStr}`).then(r => r.json()) });

  const totalSteps = (activities || []).filter(a => a.type === "steps").reduce((s, a) => s + (a.steps || 0), 0);
  const stepGoal = settings?.dailyStepGoal || 10000;
  const stepMiles = stepsToMiles(totalSteps);

  const totalCaloriesIn = (calories || []).reduce((s, e) => s + e.calories * e.servings, 0);
  const totalCaloriesBurned = (activities || []).reduce((s, a) => s + (a.caloriesBurned || 0), 0);
  const calorieGoal = settings?.dailyCalorieGoal || 2000;
  const netCalories = totalCaloriesIn - totalCaloriesBurned;
  const calorieDiff = netCalories - calorieGoal;

  const latestWeight = weights?.[0];
  const prevWeight = weights?.[1];
  const weightDiff = latestWeight && prevWeight ? latestWeight.weightLbs - prevWeight.weightLbs : null;

  const activeMeds = (medications || []).filter(m => m.active);
  const takenMeds = (medLogs || []).filter(l => l.taken).length;

  const dateLabel = format(new Date(), "EEEE, MMMM d");

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-display text-foreground" data-testid="text-dashboard-title">Good day! 🌿</h1>
        <p className="text-muted-foreground text-sm mt-1">{dateLabel}</p>
      </div>

      {/* Daily Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="Steps Today"
          value={totalSteps.toLocaleString()}
          href="/activity"
          icon={Footprints}
          color="bg-primary/12 text-primary"
          progress={(totalSteps / stepGoal) * 100}
          progressLabel={`${stepMiles} mi · Goal: ${stepGoal.toLocaleString()}`}
        />
        <StatCard
          title="Net Calories"
          value={Math.abs(netCalories).toLocaleString()}
          sub={calorieDiff > 0 ? `${calorieDiff} over goal` : calorieDiff < 0 ? `${Math.abs(calorieDiff)} under goal` : "At goal"}
          href="/calories"
          icon={UtensilsCrossed}
          color="bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
          progress={(totalCaloriesIn / calorieGoal) * 100}
          progressLabel={`${totalCaloriesIn.toLocaleString()} in · ${totalCaloriesBurned} burned`}
        />
        <StatCard
          title="Current Weight"
          value={latestWeight ? `${latestWeight.weightLbs} lbs` : "—"}
          sub={weightDiff !== null ? (weightDiff > 0 ? `+${weightDiff.toFixed(1)} from last` : `${weightDiff.toFixed(1)} from last`) : "Log your weight"}
          href="/weight"
          icon={Scale}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
        />
        <StatCard
          title="Sleep Last Night"
          value={sleepLog?.hoursSlept ? `${sleepLog.hoursSlept}h` : "—"}
          sub={sleepLog?.bedtime && sleepLog?.wakeTime ? `${sleepLog.bedtime} → ${sleepLog.wakeTime}` : "Log your sleep"}
          href="/sleep"
          icon={Moon}
          color="bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
        />
        <StatCard
          title="Medications"
          value={activeMeds.length > 0 ? `${takenMeds}/${activeMeds.length}` : "None set"}
          sub={activeMeds.length > 0 ? (takenMeds === activeMeds.length ? "All taken today!" : `${activeMeds.length - takenMeds} remaining`) : "Add medications"}
          href="/medications"
          icon={Pill}
          color="bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400"
        />
        <StatCard
          title="Other Activity"
          value={`${(activities || []).filter(a => a.type !== "steps").length} session${(activities || []).filter(a => a.type !== "steps").length !== 1 ? "s" : ""}`}
          sub="Yoga, cycling & more"
          href="/activity"
          icon={TrendingUp}
          color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
        />
      </div>

      {/* Calorie Balance Banner */}
      <Card className="mb-6" data-testid="card-calorie-balance">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Today's Calorie Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>Consumed: {totalCaloriesIn.toLocaleString()} kcal</span>
                <span>Goal: {calorieGoal.toLocaleString()} kcal</span>
              </div>
              <Progress value={Math.min((totalCaloriesIn / calorieGoal) * 100, 100)} className="h-2 mb-1.5" />
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Burned: {totalCaloriesBurned} kcal</span>
                <span className={calorieDiff > 50 ? "text-orange-500 font-medium" : calorieDiff < -50 ? "text-primary font-medium" : "text-muted-foreground"}>
                  {calorieDiff > 50 ? `+${calorieDiff} surplus` : calorieDiff < -50 ? `${calorieDiff} deficit` : "Balanced"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick medication reminder */}
      {activeMeds.length > 0 && takenMeds < activeMeds.length && (
        <Card className="border-rose-200 dark:border-rose-800/50 bg-rose-50/50 dark:bg-rose-950/20" data-testid="card-med-reminder">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-rose-500" />
                <span className="text-sm font-medium text-foreground">
                  {activeMeds.length - takenMeds} medication{activeMeds.length - takenMeds !== 1 ? "s" : ""} still to take today
                </span>
              </div>
              <Link href="/medications">
                <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">View →</Badge>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
