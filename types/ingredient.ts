export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  minQuantity: number;
  price: number; // Cost per unit
  supplier?: string;
  notes?: string;
  updatedAt: string;
}
