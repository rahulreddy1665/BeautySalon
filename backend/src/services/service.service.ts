import { CreateServiceDto, UpdateServiceDto } from "../dto/service.dto";
import { Service } from "../models/service.model";

export const createService = async (data: CreateServiceDto) => {
  try {
    return { statusCode: 200, data: await Service.create(data) };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const createBulkService = async (data: CreateServiceDto) => {
  try {
    return { statusCode: 200, data: await Service.insertMany(data) };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const getServices = async () => {
  try {
    return { statusCode: 200, data: await Service.find() };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const getServiceById = async (id: string) => {
  try {
    return { statusCode: 200, data: await Service.findById(id) };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const updateService = async (id: string, data: UpdateServiceDto) => {
  try {
    const service = await Service.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    return { statusCode: 200, data: service };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const deleteService = async (id: string) => {
  try {
    return { statusCode: 200, data: await Service.findByIdAndDelete(id) };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};
