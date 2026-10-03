import { ErrorCodes, ErrorMessages, fail } from "../constants/errors";
import { CreateUserDto, UpdateUserDto } from "../dto/user.dto";
import { Role } from "../models/role.model";
import { User } from "../models/user.model";

async function countActiveAdmins(): Promise<number> {
  const adminRole = await Role.findOne({ name: "admin" });
  if (!adminRole) return 0;
  return User.countDocuments({ role: adminRole._id, isActive: true });
}

async function assertAdminDeactivationAllowed(
  targetId: string,
  actorId?: string,
) {
  const target = await User.findById(targetId).populate("role");
  if (!target) {
    return fail(404, ErrorMessages.NOT_FOUND, ErrorCodes.NOT_FOUND);
  }

  const roleName = (target.role as { name?: string } | null)?.name;
  if (roleName !== "admin") {
    return { ok: true as const, target };
  }

  if (actorId && String(actorId) === String(targetId)) {
    return fail(
      400,
      ErrorMessages.LAST_ADMIN,
      ErrorCodes.LAST_ADMIN,
    );
  }

  const activeAdmins = await countActiveAdmins();
  if (activeAdmins <= 1) {
    return fail(
      400,
      ErrorMessages.LAST_ADMIN,
      ErrorCodes.LAST_ADMIN,
    );
  }

  return { ok: true as const, target };
}

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
    return { statusCode: 200, data: await User.find().select("-password") };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const getUserById = async (id: string) => {
  try {
    return {
      statusCode: 200,
      data: await User.findById(id).select("-password"),
    };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const updateUser = async (
  id: string,
  data: UpdateUserDto & { isActive?: boolean; role?: string },
  actorId?: string,
) => {
  try {
    if (data.isActive === false) {
      const check = await assertAdminDeactivationAllowed(id, actorId);
      if ("statusCode" in check) return check;
    }

    if (data.role !== undefined) {
      const target = await User.findById(id).populate("role");
      if (!target) {
        return fail(404, ErrorMessages.NOT_FOUND, ErrorCodes.NOT_FOUND);
      }
      const currentRole = (target.role as { name?: string } | null)?.name;
      const nextRole = await Role.findById(data.role);
      if (
        currentRole === "admin" &&
        nextRole?.name !== "admin"
      ) {
        if (actorId && String(actorId) === String(id)) {
          return fail(
            400,
            ErrorMessages.LAST_ADMIN,
            ErrorCodes.LAST_ADMIN,
          );
        }
        const activeAdmins = await countActiveAdmins();
        if (activeAdmins <= 1) {
          return fail(
            400,
            ErrorMessages.LAST_ADMIN,
            ErrorCodes.LAST_ADMIN,
          );
        }
      }
    }

    const user = await User.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).select("-password");
    return { statusCode: 200, data: user };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const deleteUser = async (id: string, actorId?: string) => {
  try {
    const check = await assertAdminDeactivationAllowed(id, actorId);
    if ("statusCode" in check) return check;

    const user = await User.findByIdAndUpdate(
      id,
      { isActive: false },
      {
        new: true,
        runValidators: true,
      },
    ).select("-password");
    return { statusCode: 200, data: user };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};
