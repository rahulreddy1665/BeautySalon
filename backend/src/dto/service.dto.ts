export interface CreateServiceDto {
  name: string;
  category: string;
  price: number;
  durationMinutes?: number;
}

export interface UpdateServiceDto {
  name?: string;
  category?: string;
  price?: number;
  durationMinutes?: number;
}

export interface ServiceListQuery {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
}
