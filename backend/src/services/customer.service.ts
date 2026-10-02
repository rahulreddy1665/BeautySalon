import { CreateCustomerDto, UpdateCustomerDto } from "../dto/main.dto";
import { Customer } from "../models/customer.model";

export const createCustomer = async (data: CreateCustomerDto) => {
  try {
    return { statusCode: 200, data: await Customer.create(data) };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const getCustomers = async () => {
  try {
    return { statusCode: 200, data: await Customer.find() };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const getCustomerById = async (id: string) => {
  try {
    return { statusCode: 200, data: await Customer.findById(id) };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const updateCustomer = async (id: string, data: UpdateCustomerDto) => {
  try {
    const customer = await Customer.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    return { statusCode: 200, data: customer };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const deleteCustomer = async (id: string) => {
  try {
    return { statusCode: 200, data: await Customer.findByIdAndDelete(id) };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};
