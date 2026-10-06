export interface CreateServiceDto {
  name: string;
  /** Preferred: managed category id */
  categoryId?: string;
  /** Legacy / import: category name (resolved to master) */
  category?: string;
  price: number;
  durationMinutes?: number;
}

export interface UpdateServiceDto {
  name?: string;
  categoryId?: string;
  category?: string;
  price?: number;
  durationMinutes?: number;
}

export interface ServiceListQuery {
  search?: string;
  category?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
}
