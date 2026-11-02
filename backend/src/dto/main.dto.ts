export interface CreatePermissionDto {
  name: String;
  description: string;
}

export interface UpdatePermissionDto {
  name?: string;
  description?: string;
}

export interface CreateRoleDto {
  name: String;
}

export interface UpdateRoleDto {
  name?: string;
}

export interface CreateBookingDto {
  date: string;
  invoice: string;
  service: string;
}

export interface UpdateBookingDto {
  date?: string;
  invoice?: string;
  service?: string;
}

export interface CreateCustomerDto {
  name?: string;
  email?: string;
  phone: number;
}

export interface UpdateCustomerDto {
  name?: string;
  lastName?: string;
  email?: string;
  phone?: number;
}
