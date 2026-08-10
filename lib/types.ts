export const EXPENSE_TYPES = [
  { id: "vegetables", label: "Vegetables" },
  { id: "milk", label: "Milk" },
  { id: "groceries", label: "Groceries" },
  { id: "food", label: "Food" },
  { id: "household", label: "Household" },
  { id: "rent", label: "Rent" },
  { id: "electricity", label: "Electricity" },
  { id: "wifi", label: "Wi-Fi" },
  { id: "other", label: "Other" },
] as const;

export type ExpenseTypeId = (typeof EXPENSE_TYPES)[number]["id"];

export function typeLabel(id: string) {
  return EXPENSE_TYPES.find((t) => t.id === id)?.label ?? id;
}

export const PRESENCE_STATES = ["at_flat", "away", "unknown"] as const;
