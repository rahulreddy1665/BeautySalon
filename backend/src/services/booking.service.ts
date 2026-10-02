import { CreateBookingDto, UpdateBookingDto } from "../dto/main.dto";
import { Booking } from "../models/booking.model";

export const createBooking = async (data: CreateBookingDto) => {
  try {
    return { statusCode: 200, data: await Booking.create(data) };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const getBookings = async () => {
  try {
    return {
      statusCode: 200,
      data: await Booking.find()
        .populate({
          path: "user",
          select: "name",
        })
        .populate({
          path: "customer",
          select: "name",
        }),
    };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const getBookingById = async (id: string) => {
  try {
    return { statusCode: 200, data: await Booking.findById(id) };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const updateBooking = async (id: string, data: UpdateBookingDto) => {
  try {
    const booking = await Booking.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    return { statusCode: 200, data: booking };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};

export const deleteBooking = async (id: string) => {
  try {
    return { statusCode: 200, data: await Booking.findByIdAndDelete(id) };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};
