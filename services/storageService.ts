import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Ingredient } from '../types';

export const fetchIngredients = async (): Promise<Ingredient[]> => {
  try {
    const ingredientsRef = collection(db, 'ingredients');
    const q = query(ingredientsRef, orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        quantity: Number(data.quantity),
        unit: data.unit,
        minQuantity: Number(data.minQuantity || 0),
        price: Number(data.price || 0),
        supplier: data.supplier || '',
        note: data.note || '',
        updatedAt: data.updatedAt?.toDate().toISOString() || new Date().toISOString()
      } as Ingredient;
    });
  } catch (error) {
    console.error("Error fetching ingredients:", error);
    try {
        const ingredientsRef = collection(db, 'ingredients');
        const snapshot = await getDocs(ingredientsRef);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ingredient));
    } catch (e) {
        return [];
    }
  }
};

export const addIngredient = async (ingredientData: Omit<Ingredient, 'id'>): Promise<void> => {
  try {
    const ingredientsRef = collection(db, 'ingredients');
    await addDoc(ingredientsRef, {
      ...ingredientData,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error("Error adding ingredient:", error);
    throw error;
  }
};

export const updateIngredient = async (id: string, ingredientData: Partial<Ingredient>): Promise<void> => {
  try {
    const ingredientRef = doc(db, 'ingredients', id);
    const { id: _, ...updateData } = ingredientData as any;
    
    await updateDoc(ingredientRef, {
      ...updateData,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error("Error updating ingredient:", error);
    throw error;
  }
};

export const deleteIngredient = async (id: string): Promise<void> => {
  try {
    const ingredientRef = doc(db, 'ingredients', id);
    await deleteDoc(ingredientRef);
  } catch (error) {
    console.error("Error deleting ingredient:", error);
    throw error;
  }
};
