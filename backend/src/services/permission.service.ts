import { CreatePermissionDto, UpdatePermissionDto } from "../dto/main.dto";
import { Permission } from "../models/permission.model";

export const createPermission = async (data: CreatePermissionDto) => {
  try {
    return { statusCode: 200, data: await Permission.create(data) };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const getPermissions = async () => {
  try {
    return { statusCode: 200, data: await Permission.find() };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const getPermissionById = async (id: string) => {
  try {
    return { statusCode: 200, data: await Permission.findById(id) };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const updatePermission = async (
  id: string,
  data: UpdatePermissionDto,
) => {
  try {
    const permission = await Permission.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    return { statusCode: 200, data: permission };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const deletePermission = async (id: string) => {
  try {
    return { statusCode: 200, data: await Permission.findByIdAndDelete(id) };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};
