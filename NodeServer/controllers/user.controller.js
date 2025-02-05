import User from '../models/user.model.js';
import bcryptjs from "bcryptjs";
export const getUserByUsername = async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    // Find user by username
    const user = await User.findOne({ username }).select('-password'); // Exclude password field

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ id: user._id, username: user.username, email: user.email, ...user._doc });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
export const editProfile = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming the user ID is set in the req.user by the authenticateToken middleware
    const { firstName, lastName, phoneNumber, bio, avatar } = req.body;

    const updatedFields = {};
    if (firstName) updatedFields.firstName = firstName;
    if (lastName) updatedFields.lastName = lastName;
    if (phoneNumber) updatedFields.phoneNumber = phoneNumber;
    if (bio) updatedFields.bio = bio;
    if (avatar) updatedFields.avatar = avatar;

    const updatedUser = await User.findByIdAndUpdate(userId, updatedFields, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



export const editAccount = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming the user ID is set in the req.user by the authenticateToken middleware
    const { emailAddress, currentPassword, newPassword } = req.body;

    const updatedFields = {};

    // Validate email format if provided
    if (emailAddress) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailAddress)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      updatedFields.emailAddress = emailAddress;
    }

    // Verify current password and hash the new password if provided
    if (newPassword) {
      const user = await User.findById(userId);
      const isMatch = await bcryptjs.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      const salt = await bcryptjs.genSalt(10);
      const hashedPassword = await bcryptjs.hash(newPassword, salt);
      updatedFields.password = hashedPassword;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updatedFields, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Account updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
export const enableTwoFac = async (req, res) => {
  try {
    const userId = req.user.id;
    const updatedUser = await User.findByIdAndUpdate(userId, { twoFactorEnabled: true }, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Two-Factor Authentication enabled', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const disableTwoFac = async (req, res) => {
  try {
    const userId = req.user.id;
    const updatedUser = await User.findByIdAndUpdate(userId, { twoFactorEnabled: false }, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Two-Factor Authentication disabled', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const userToDelete = await User.findById(userId);

    if (!userToDelete) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (userToDelete.id !== userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};