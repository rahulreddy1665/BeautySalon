export interface CreateProductDto {
  name: string;
  price: number;
}

export type UpdateProductDto = Partial<CreateProductDto>;

export interface ProductListQuery {
  search?: string;
  page?: number;
  limit?: number;
}
