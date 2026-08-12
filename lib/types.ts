export const EXPENSE_TYPES = [
  { id: "vegetables", label: "Vegetables / Sabzi" },
  { id: "milk", label: "Milk" },
  { id: "groceries", label: "Groceries" },
  { id: "food", label: "Food / Dining out" },
  { id: "household", label: "Household items" },
  { id: "cleaning", label: "Cleaning supplies" },
  { id: "gas", label: "Gas / LPG" },
  { id: "water", label: "Water bill" },
  { id: "rent", label: "Rent" },
  { id: "electricity", label: "Electricity" },
  { id: "wifi", label: "Wi-Fi / Internet" },
  { id: "maintenance", label: "Maintenance / Repair" },
  { id: "transport", label: "Transport / Auto" },
  { id: "entertainment", label: "Entertainment" },
  { id: "medical", label: "Medical" },
  { id: "other", label: "Other" },
] as const;

export type ExpenseTypeId = (typeof EXPENSE_TYPES)[number]["id"];

export const EXPENSE_TYPE_IDS = EXPENSE_TYPES.map((t) => t.id);

export function typeLabel(id: string) {
  return EXPENSE_TYPES.find((t) => t.id === id)?.label ?? id;
}

export const PRESENCE_STATES = ["at_flat", "away", "unknown"] as const;

/** Valid type from query string or fallback to other (never silently default to vegetables). */
export function expenseTypeFromParam(param: string | null): ExpenseTypeId {
  if (param && EXPENSE_TYPE_IDS.includes(param as ExpenseTypeId)) {
    return param as ExpenseTypeId;
  }
  return "other";
}
