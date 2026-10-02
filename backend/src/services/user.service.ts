import { CreateUserDto, UpdateUserDto } from "../dto/user.dto";
import { User } from "../models/user.model";

export const createUser = async (data: CreateUserDto) => {
  try {
    const user = await User.create(data);
    return { statusCode: 200, data: user };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const getUsers = async () => {
  try {
    return { statusCode: 200, data: await User.find() };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const getUserById = async (id: string) => {
  try {
    return { statusCode: 200, data: await User.findById(id) };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const updateUser = async (id: string, data: UpdateUserDto) => {
  try {
    const user = await User.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    return { statusCode: 200, data: user };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const deleteUser = async (id: string) => {
  try {
    const user = await User.findByIdAndUpdate(
      id,
      { isActive: false },
      {
        new: true,
        runValidators: true,
      },
    );
    return { statusCode: 200, data: user };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};
