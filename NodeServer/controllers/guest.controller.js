// controllers/guestController.js

import Guest from "../models/guest.model.js";

export const createGuest = async (req, res) => {
  if (req.user) {
    // If the user is authenticated, do not create a guest ID
    return res.status(400).json({ message: 'Authenticated users cannot have a guest ID' });
  }

  try {
    const guestId = req.cookies.GUID;

    if (guestId) {
      // If the guest ID already exists, return it
      return res.status(200).json({ guestId });
    }

    const newGuest = new Guest();
    await newGuest.save();
    res.cookie('GUID', newGuest._id, { httpOnly: true, sameSite: 'strict' });
    res.status(201).json({ guestId: newGuest._id });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const deleteGuest = async (req, res) => {
  const guestId = req.cookies.GUID;
  try {
    await Guest.findByIdAndDelete(guestId);
    res.clearCookie('GUID');
    res.status(200).json({ message: 'Guest deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};
