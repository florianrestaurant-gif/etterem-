import { getOberonClient } from "./client";

export type OberonRecipeIngredient = {
  materialId?: string;
  materialName: string;
  quantity: number;
  unit: string;
  cost?: number;
};

export type OberonRecipe = {
  itemId: string;
  itemName: string;
  ingredients: OberonRecipeIngredient[];
};

type RecipeArgs = {
  ItemId: string;
};

type OberonRecipeIngredientRaw = {
  MaterialId?: string;
  MaterialName?: string;
  Quantity?: number | string;
  Unit?: string;
  Cost?: number | string;
  [key: string]: unknown;
};

type OberonRecipeRaw = {
  ItemName?: string;
  Ingredients?: {
    Ingredient?: OberonRecipeIngredientRaw[] | OberonRecipeIngredientRaw;
  };
};

type OberonRecipeResponse = {
  Recipe?: OberonRecipeRaw;
};

export async function getOberonRecipe(itemId: string): Promise<OberonRecipe> {
  const client = await getOberonClient();

  const args: RecipeArgs = {
    ItemId: itemId,
  };

  const result = await new Promise<unknown>((resolve, reject) => {
    (client as unknown as {
      GetRecipe: (
        args: RecipeArgs,
        cb: (err: unknown, res: unknown) => void
      ) => void;
    }).GetRecipe(args, (err, res) => {
      if (err) return reject(err);
      resolve(res);
    });
  });

  const typed = result as OberonRecipeResponse;
  const recipeData = typed.Recipe;

  const raw = recipeData?.Ingredients?.Ingredient;
  const ingredientsRaw: OberonRecipeIngredientRaw[] = Array.isArray(raw)
    ? raw
    : raw
    ? [raw]
    : [];

  const ingredients: OberonRecipeIngredient[] = ingredientsRaw.map((ing) => ({
    materialId: ing.MaterialId,
    materialName: ing.MaterialName ?? "",
    quantity: Number(ing.Quantity ?? 0),
    unit: ing.Unit ?? "",
    cost: ing.Cost !== undefined ? Number(ing.Cost) : undefined,
  }));

  return {
    itemId,
    itemName: recipeData?.ItemName ?? "",
    ingredients,
  };
}
