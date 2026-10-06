export type ProductType = "retail" | "consumable";

export interface CreateProductDto {
  name: string;
  price?: number;
  type?: ProductType;
  unit?: string;
  trackStock?: boolean;
  /** When provided with trackStock, writes an opening ledger entry. */
  openingStock?: number;
}

export type UpdateProductDto = Partial<CreateProductDto>;

export interface ProductListQuery {
  search?: string;
  page?: number;
  limit?: number;
  /** Filter by product type. */
  type?: ProductType | "all";
  /** When true, only retail products (for billing). */
  retailOnly?: boolean | string;
}
