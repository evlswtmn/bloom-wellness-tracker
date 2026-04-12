import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Search, UtensilsCrossed, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { today, formatDate } from "@/lib/dateUtils";
import type { CalorieEntry, FoodItem, UserSettings } from "@shared/schema";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

export default function Calories() {
  const [selectedDate, setSelectedDate] = useState(today());
  const [search, setSearch] = useState("");
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [showNewFood, setShowNewFood] = useState(false);
  const { toast } = useToast();

  const { register: regEntry, handleSubmit: handleEntry, watch: watchEntry, reset: resetEntry, setValue: setEntryValue } = useForm({
    defaultValues: { mealType: "snack", servings: "1" }
  });

  const { register: regFood, handleSubmit: handleFood, reset: resetFood } = useForm({
    defaultValues: { name: "", calories: "", servingSize: "" }
  });

  const { data: settings } = useQuery<UserSettings>({ queryKey: ["/api/settings"] });
  const { data: entries = [] } = useQuery<CalorieEntry[]>({
    queryKey: ["/api/calories", selectedDate],
    queryFn: () => apiRequest("GET", `/api/calories?date=${selectedDate}`).then(r => r.json()),
  });
  const { data: foodItems = [] } = useQuery<FoodItem[]>({
    queryKey: ["/api/food-items", search],
    queryFn: () => apiRequest("GET", `/api/food-items?search=${search}`).then(r => r.json()),
  });

  const addEntryMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/calories", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calories"] });
      setSelectedFood(null);
      setSearch("");
      resetEntry({ mealType: "snack", servings: "1" });
      toast({ title: "Food logged!" });
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/calories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/calories"] }),
  });

  const addFoodMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/food-items", data).then(r => r.json()),
    onSuccess: (item: FoodItem) => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-items"] });
      setSelectedFood(item);
      setShowNewFood(false);
      resetFood();
      toast({ title: `"${item.name}" saved!` });
    },
  });

  const onLogFood = (data: any) => {
    if (!selectedFood) return;
    addEntryMutation.mutate({
      date: selectedDate,
      foodItemId: selectedFood.id,
      foodName: selectedFood.name,
      calories: selectedFood.calories,
      servings: parseFloat(data.servings) || 1,
      mealType: data.mealType || null,
    });
  };

  const onAddFood = (data: any) => {
    addFoodMutation.mutate({
      name: data.name,
      calories: parseInt(data.calories),
      servingSize: data.servingSize || null,
      isPreset: false,
    });
  };

  const calorieGoal = settings?.dailyCalorieGoal || 2000;
  const totalCalories = entries.reduce((s, e) => s + e.calories * e.servings, 0);
  const remaining = calorieGoal - totalCalories;

  const byMeal: Record<string, CalorieEntry[]> = {};
  entries.forEach(e => {
    const key = e.mealType || "other";
    byMeal[key] = [...(byMeal[key] || []), e];
  });

  const filteredFoods = search.length > 0
    ? foodItems.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    : foodItems;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold font-display text-foreground">Calorie Tracker</h1>
        <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-44 text-sm" data-testid="input-date" />
      </div>

      {/* Summary bar */}
      <Card className="mb-6" data-testid="card-calorie-summary">
        <CardContent className="p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">{Math.round(totalCalories).toLocaleString()} kcal consumed</span>
            <span className={remaining < 0 ? "text-orange-500 font-medium" : "text-primary font-medium"}>
              {remaining < 0 ? `${Math.abs(Math.round(remaining))} over` : `${Math.round(remaining)} remaining`}
            </span>
          </div>
          <Progress value={Math.min((totalCalories / calorieGoal) * 100, 100)} className="h-2" />
          <div className="text-xs text-muted-foreground mt-1.5">Goal: {calorieGoal.toLocaleString()} kcal</div>
        </CardContent>
      </Card>

      {/* Log Food */}
      <Card className="mb-6" data-testid="card-log-food">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" /> Log Food
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search foods..."
              value={search}
              onChange={e => { setSearch(e.target.value); setSelectedFood(null); }}
              className="pl-9"
              data-testid="input-food-search"
            />
          </div>

          {/* Food list */}
          {search && !selectedFood && (
            <div className="border border-border rounded-lg overflow-hidden max-h-52 overflow-y-auto" data-testid="list-food-results">
              {filteredFoods.length === 0 && (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  No results.{" "}
                  <button
                    className="text-primary underline"
                    onClick={() => { setShowNewFood(true); setSearch(""); }}
                    data-testid="button-add-new-food"
                  >
                    Add "{search}" as new food
                  </button>
                </div>
              )}
              {filteredFoods.map(food => (
                <button
                  key={food.id}
                  className="w-full px-3 py-2.5 text-left hover:bg-muted transition-colors flex items-center justify-between border-b border-border last:border-0"
                  onClick={() => { setSelectedFood(food); setSearch(food.name); }}
                  data-testid={`button-select-food-${food.id}`}
                >
                  <span className="text-sm font-medium">{food.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{food.calories} kcal{food.servingSize ? ` / ${food.servingSize}` : ""}</span>
                    {food.isPreset && <Badge variant="secondary" className="text-xs py-0">preset</Badge>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Selected food → entry form */}
          {selectedFood && (
            <form onSubmit={handleEntry(onLogFood)} className="space-y-3 border border-border rounded-lg p-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{selectedFood.name}</div>
                  <div className="text-xs text-muted-foreground">{selectedFood.calories} kcal per serving</div>
                </div>
                <button type="button" onClick={() => { setSelectedFood(null); setSearch(""); }} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Servings</Label>
                  <Input type="number" min="0.25" step="0.25" {...regEntry("servings")} data-testid="input-servings" />
                  {watchEntry("servings") && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      = {Math.round(selectedFood.calories * (parseFloat(watchEntry("servings")) || 1))} kcal
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Meal</Label>
                  <Select value={watchEntry("mealType")} onValueChange={v => setEntryValue("mealType", v)}>
                    <SelectTrigger data-testid="select-meal-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MEAL_TYPES.map(m => <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" disabled={addEntryMutation.isPending} className="w-full" size="sm" data-testid="button-log-food">
                {addEntryMutation.isPending ? "Logging..." : "Add to log"}
              </Button>
            </form>
          )}

          {/* Add new food form */}
          {showNewFood && (
            <form onSubmit={handleFood(onAddFood)} className="space-y-3 border border-border rounded-lg p-3 bg-muted/30">
              <div className="font-medium text-sm">Add New Food</div>
              <div>
                <Label className="text-xs mb-1 block">Food Name</Label>
                <Input placeholder="e.g. Chobani Yogurt" {...regFood("name", { required: true })} data-testid="input-new-food-name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Calories</Label>
                  <Input type="number" placeholder="140" {...regFood("calories", { required: true })} data-testid="input-new-food-calories" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Serving Size (optional)</Label>
                  <Input placeholder="1 cup" {...regFood("servingSize")} data-testid="input-new-food-serving" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={addFoodMutation.isPending} size="sm" className="flex-1" data-testid="button-save-new-food">
                  {addFoodMutation.isPending ? "Saving..." : "Save Food"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowNewFood(false)}>Cancel</Button>
              </div>
            </form>
          )}

          {!selectedFood && !showNewFood && (
            <Button variant="outline" size="sm" className="w-full" onClick={() => setShowNewFood(true)} data-testid="button-show-add-food">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add New Food to Library
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Today's log by meal */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {formatDate(selectedDate)} Log
        </h2>
        {entries.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <UtensilsCrossed className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No food logged for this day.</p>
            <p className="text-xs mt-1">Search for a food above to get started.</p>
          </div>
        )}
        {MEAL_TYPES.map(meal => {
          const mealEntries = byMeal[meal] || [];
          if (mealEntries.length === 0) return null;
          const mealTotal = mealEntries.reduce((s, e) => s + e.calories * e.servings, 0);
          return (
            <div key={meal} data-testid={`section-meal-${meal}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold capitalize text-foreground">{meal}</h3>
                <span className="text-xs text-muted-foreground">{Math.round(mealTotal)} kcal</span>
              </div>
              <div className="space-y-1.5">
                {mealEntries.map(entry => (
                  <Card key={entry.id} data-testid={`card-entry-${entry.id}`}>
                    <CardContent className="p-2.5 flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium">{entry.foodName}</span>
                        {entry.servings !== 1 && <span className="text-xs text-muted-foreground ml-1">× {entry.servings}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{Math.round(entry.calories * entry.servings)} kcal</span>
                        <button
                          onClick={() => deleteEntryMutation.mutate(entry.id)}
                          className="text-muted-foreground hover:text-destructive p-0.5"
                          data-testid={`button-delete-entry-${entry.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
        {byMeal["other"] && byMeal["other"].length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground">Other</h3>
              <span className="text-xs text-muted-foreground">{Math.round(byMeal["other"].reduce((s, e) => s + e.calories * e.servings, 0))} kcal</span>
            </div>
            {byMeal["other"].map(entry => (
              <Card key={entry.id}>
                <CardContent className="p-2.5 flex items-center justify-between">
                  <span className="text-sm font-medium">{entry.foodName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{Math.round(entry.calories * entry.servings)} kcal</span>
                    <button onClick={() => deleteEntryMutation.mutate(entry.id)} className="text-muted-foreground hover:text-destructive p-0.5">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
