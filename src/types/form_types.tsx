import type { Ingredient, ProductIngredient, Unit } from "./types";

export interface IngredientsSectionAndCostProps {
    productType: "ingredientBased" | "directCost";
    newIngredient: {
        id: string;
        name: string;
        quantity: string;
        unit: Unit;
    };
    setNewIngredient: React.Dispatch<React.SetStateAction<{
        id: string;
        name: string;
        quantity: string;
        unit: Unit;
    }>>;
    ingredients: Ingredient[];
    isAdmin: boolean;
    handleAddIngredient: () => void
    productIngredients: ProductIngredient[];
    getIngredientName: (id: string) => string
    getIngredientCost: (ingredient: ProductIngredient) => number;
    handleRemoveIngredient: (index: number) => void;
    formData: {
        name: string;
        description: {
            es: string;
            fr: string;
            en: string;
        };
        category: string;
        portionSize: string;
        sellingPrice: string;
        preparationTime: string;
        tags: string;
        directCostPrice: string;
    };
    setFormData: React.Dispatch<React.SetStateAction<{
        name: string;
        description: {
            es: string;
            fr: string;
            en: string;
        };
        category: string;
        portionSize: string;
        sellingPrice: string;
        preparationTime: string;
        tags: string;
        directCostPrice: string;
    }>>;
    totalCost: number;
    sellingPriceNum: number
    profit: number
    profitMargin: number

}

export interface MediaUploadProps {
    videoInputRef: React.RefObject<HTMLInputElement | null>
    imageInputRef: React.RefObject<HTMLInputElement | null>
    handleVideoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    preparationVideo: File | null
    setPreparationVideo: React.Dispatch<React.SetStateAction<File | null>>;
    existingMedia: {
        videoUrl?: string;
        imageUrls: string[];
    };
    removeExistingVideo: () => Promise<void>
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    productImages: File[];
    removeNewImage: (index: number) => void;
    removeExistingImage: (imageUrl: string) => Promise<void>
}

export interface ProductDetailsProps {
    formData: {
        name: string;
        description: {
            es: string;
            fr: string;
            en: string;
        };
        category: string;
        portionSize: string;
        sellingPrice: string;
        preparationTime: string;
        tags: string;
        directCostPrice: string;
    };
    setFormData: React.Dispatch<React.SetStateAction<{
        name: string;
        description: {
            es: string;
            fr: string;
            en: string;
        };
        category: string;
        portionSize: string;
        sellingPrice: string;
        preparationTime: string;
        tags: string;
        directCostPrice: string;
    }>>;
}
