export interface CreateStaffDto {
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  isActive?: boolean;
  designationId?: string | null;
}

export interface UpdateStaffDto {
  name?: string;
  age?: number;
  gender?: "Male" | "Female" | "Other";
  isActive?: boolean;
  designationId?: string | null;
}

export interface StaffListQuery {
  search?: string;
  isActive?: string;
  page?: number;
  limit?: number;
}
