// Tiny module-level flag: when a new user picks "create my own categories" in
// onboarding, Home opens Expense Category Management once on first load.
let openBudgetOnLaunch = false;
export function setOpenBudgetOnLaunch(v: boolean) { openBudgetOnLaunch = v; }
export function consumeOpenBudgetOnLaunch(): boolean {
  const v = openBudgetOnLaunch;
  openBudgetOnLaunch = false;
  return v;
}
