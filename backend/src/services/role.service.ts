import { CreateRoleDto, UpdateRoleDto } from "../dto/main.dto";
import { Role } from "../models/role.model";

export const createRole = async (data: CreateRoleDto) => {
  try {
    return { statusCode: 200, data: await Role.create(data) };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const getRoles = async () => {
  try {
    return {
      statusCode: 200,
      data: await Role.find().populate({
        path: "permissions",
        select: "description",
      }),
    };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const getRoleById = async (id: string) => {
  try {
    return { statusCode: 200, data: await Role.findById(id) };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const updateRole = async (id: string, data: UpdateRoleDto) => {
  try {
    const role = await Role.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    return { statusCode: 200, data: role };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const deleteRole = async (id: string) => {
  try {
    return { statusCode: 200, data: await Role.findByIdAndDelete(id) };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};
