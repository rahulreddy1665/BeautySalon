import { CreateUserDto, UpdateUserDto } from "../dto/user.dto";
import { User } from "../models/user.model";

export const createUser = async (data: CreateUserDto) => {
  const user = await User.create(data);

  return user;
};

export const getUsers = async () => {
  return await User.find();
};

export const getUserById = async (id: string) => {
  return await User.findById(id);
};

export const updateUser = async (
  id: string,
  data: UpdateUserDto
) => {
  return await User.findByIdAndUpdate(
    id,
    data,
    {
      new: true,
      runValidators: true
    }
  );
};

export const deleteUser = async (id: string) => {
  return await User.findByIdAndDelete(id);
};