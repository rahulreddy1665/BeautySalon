export interface CreateStaffDto {
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  isActive?: boolean;
}

export interface UpdateStaffDto {
  name?: string;
  age?: number;
  gender?: "Male" | "Female" | "Other";
  isActive?: boolean;
}

export interface StaffListQuery {
  search?: string;
  isActive?: string;
  page?: number;
  limit?: number;
}
