// Kiểu dữ liệu khớp với response của backend (SRS mục 8).
// Mọi response thành công đều bọc trong { data, meta? }.

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// Lỗi theo RFC 7807 (CONS-005)
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
  correlationId?: string;
}

export interface UserDto {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  roles: string[];
}

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  orderIndex: number;
  recipeCount: number;
}

export interface CategoryDetailDto extends CategoryDto {
  recipes: RecipeListItemDto[];
}

export type RecipeDifficulty = "Easy" | "Medium" | "Hard" | "Expert";
export type RecipeStatus = "Draft" | "Published" | "Archived";

export interface RecipeListItemDto {
  id: string;
  title: string;
  slug: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: RecipeDifficulty;
  status: RecipeStatus;
  primaryImageUrl?: string;
  categoryName: string;
  authorDisplayName: string;
  publishedAt?: string;
}

export interface RecipeStepDto {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  timerMinutes?: number;
  imageUrl?: string;
}

export interface RecipeIngredientDto {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  orderIndex: number;
}

export interface RecipeImageDto {
  id: string;
  originalUrl: string;
  mediumUrl?: string;
  thumbnailUrl?: string;
  altText?: string;
  isPrimary: boolean;
  orderIndex: number;
}

export interface RecipeDetailDto {
  id: string;
  title: string;
  slug: string;
  description: string;
  instructions: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: RecipeDifficulty;
  status: RecipeStatus;
  publishedAt?: string;
  category: { id: string; name: string; slug: string };
  author: { id: string; displayName: string; avatarUrl?: string };
  nutrition?: {
    calories?: number;
    protein?: number;
    carbohydrates?: number;
    fat?: number;
    fiber?: number;
    sodium?: number;
  };
  steps: RecipeStepDto[];
  ingredients: RecipeIngredientDto[];
  images: RecipeImageDto[];
}
