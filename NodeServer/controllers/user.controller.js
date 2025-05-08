import User from '../models/user.model.js';
import bcryptjs from "bcryptjs";
import { Ban } from '../models/ban.model.js';
import { PreviousBan } from '../models/previousbans.model.js';
import { Feedback } from '../models/feedback.model.js';

export const getPreviousBans = async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user;
    
    // console.log("Requesting User:", requestingUser); // Debugging

    if (!id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Ensure `requestingUser` exists and has `id`
    if (!requestingUser || !requestingUser.id) {
      return res.status(403).json({ error: "Unauthorized access - No valid user" });
    }

    // Check if the requester is either the banned user or an admin
    if (requestingUser.id.toString() !== id.toString() && !requestingUser.isAdmin) {
      console.log("Unauthorized access attempt:", requestingUser);
      return res.status(403).json({ error: "Unauthorized access" });
    }

    // Fetch previous bans
    const previousBans = await PreviousBan.find({ bannedUser: id })
      .populate("bannedUser", "firstName lastName")
      .populate("bannedByWho", "firstName lastName");

    if (!previousBans || previousBans.length === 0) {
      return res.status(404).json({ error: "No previous bans found" });
    }

    return res.status(200).json(previousBans);
  } catch (error) {
    console.error("Error fetching previous bans:", error);
    return res.status(500).json({ error: "Failed to retrieve previous ban details" });
  }
};

export const addUserAge = async (req, res) => {
  try {
    const { id } = req.params;
    const { birthDate } = req.body;
    const requestingUser = req.user;
    
    if (!id) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    // Ensure `requestingUser` exists and has `id`
    if (!requestingUser || !requestingUser.id) {
      return res.status(403).json({ error: "Unauthorized access - No valid user" });
    }
    
    if (requestingUser.id.toString() !== id.toString() && !requestingUser.isAdmin) {
      console.log("Unauthorized access attempt:", requestingUser);
      return res.status(403).json({ error: "Unauthorized access" });
    }
    
    if (!birthDate || !birthDate.day || !birthDate.month || !birthDate.year) {
      return res.status(400).json({ error: "Complete birth date is required" });
    }
    
    // Calculate age
    const today = new Date();
    const birthDateObj = new Date(
      Number.parseInt(birthDate.year),
      Number.parseInt(birthDate.month) - 1,
      Number.parseInt(birthDate.day)
    );
    
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDiff = today.getMonth() - birthDateObj.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    
    // Format birth date as string (e.g., "January 15, 1990")
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const formattedBirthDate = `${months[birthDateObj.getMonth()]} ${birthDate.day}, ${birthDate.year}`;
    
    // Update user in database
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { 
        userAge: age,
        userBirthDate: formattedBirthDate
      },
      { new: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    
    return res.status(200).json({ 
      message: "User age updated successfully",
      user: {
        userAge: updatedUser.userAge,
        userBirthDate: updatedUser.userBirthDate
      }
    });
    
  } catch (error) {
    console.error("Error Adding User Age", error);
    return res.status(500).json({ error: "Error Adding User Age" });
  }
};

export const addUserGender = async (req, res) => {
  try {
    const { id } = req.params;
    const { gender } = req.body;
    const requestingUser = req.user;
    
    if (!id) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    // Ensure `requestingUser` exists and has `id`
    if (!requestingUser || !requestingUser.id) {
      return res.status(403).json({ error: "Unauthorized access - No valid user" });
    }
    
    if (requestingUser.id.toString() !== id.toString() && !requestingUser.isAdmin) {
      console.log("Unauthorized access attempt:", requestingUser);
      return res.status(403).json({ error: "Unauthorized access" });
    }
    
    if (!gender || !['male', 'female'].includes(gender)) {
      return res.status(400).json({ error: "Valid gender (male or female) is required" });
    }
    
    // Update user in database
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { gender },
      { new: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    
    return res.status(200).json({ 
      message: "User gender updated successfully",
      user: {
        gender: updatedUser.gender
      }
    });
    
  } catch (error) {
    console.error("Error Adding User Gender", error);
    return res.status(500).json({ error: "Error Adding User Gender" });
  }
};

export const userFinishedSteps = async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user;
    if (!id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Ensure `requestingUser` exists and has `id`
    if (!requestingUser || !requestingUser.id) {
      return res.status(403).json({ error: "Unauthorized access - No valid user" });
    }

    if (requestingUser.id.toString() !== id.toString() && !requestingUser.isAdmin) {
      console.log("Unauthorized access attempt:", requestingUser);
      return res.status(403).json({ error: "Unauthorized access" });
    }

    // Update user in database
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { isFinishedSteps: true },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ 
      message: "User steps marked as finished successfully",
      user: {
        isFinishedSteps: updatedUser.isFinishedSteps
      }
    });

  } catch (error) {
    console.error("Error updating user steps", error);
    return res.status(500).json({ error: "Error updating user steps" });
  }
};
export const addUserCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const { country } = req.body;
    const requestingUser = req.user;
    
    if (!id) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    // Ensure `requestingUser` exists and has `id`
    if (!requestingUser || !requestingUser.id) {
      return res.status(403).json({ error: "Unauthorized access - No valid user" });
    }
    
    if (requestingUser.id.toString() !== id.toString() && !requestingUser.isAdmin) {
      console.log("Unauthorized access attempt:", requestingUser);
      return res.status(403).json({ error: "Unauthorized access" });
    }
    
    if (!country) {
      return res.status(400).json({ error: "Country is required" });
    }
    
    // Update user in database
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { country },
      { new: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    
    return res.status(200).json({ 
      message: "User country updated successfully",
      user: {
        country: updatedUser.country
      }
    });
    
  } catch (error) {
    console.error("Error Adding User Country", error);
    return res.status(500).json({ error: "Error Adding User Country" });
  }
};
export const appealBan = async (req, res) => {
  try {
    const { id } = req.params; // User ID from params
    const { appealExplanation } = req.body;
    const requestingUser = req.user; // Authenticated user

    if (!id || !appealExplanation) {
      return res.status(400).json({ error: "User ID and appeal explanation are required" });
    }

    // Check if the user is actually banned
    const banRecord = await Ban.findOne({ bannedUser: id });

    if (!banRecord) {
      return res.status(404).json({ error: "No active ban found" });
    }

    // Ensure only the banned user can submit an appeal
    if (requestingUser.id !== id) {
      return res.status(403).json({ error: "Unauthorized to appeal this ban" });
    }

    // Update the ban record with appeal status and explanation
    banRecord.appealStatus = "pending";
    banRecord.appealExplanation = appealExplanation;
    await banRecord.save();

    // Update the PreviousBan record instead of creating a new one
    await PreviousBan.findOneAndUpdate(
      { bannedUser: id, caseId: banRecord.caseId }, // Find by user ID and case ID
      {
        appealStatus: "pending",
        appealExplanation: appealExplanation,
      },
      { new: true }
    );

    return res.status(200).json({
      message: "Appeal submitted successfully",
      appealStatus: "pending",
    });

  } catch (error) {
    console.error("Error submitting appeal:", error);
    return res.status(500).json({ error: "Failed to submit appeal" });
  }
};


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

export const GetBanInfo = async (req, res) => {
  try {
    const { id } = req.params; // ID of the user we are fetching ban info for
    const requestingUser = req.user; // Authenticated user making the request

    if (!id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const banRecord = await Ban.findOne({ bannedUser: id })
      .populate("bannedUser", "firstName lastName")
      .populate("bannedByWho", "firstName lastName");

    if (!banRecord) {
      return res.status(404).json({ error: "No ban record found" });
    }

    // Check if the requester is either the banned user or an admin
    // if (requestingUser._id !== id && !requestingUser.isAdmin) {
    //   return res.status(403).json({ error: "Unauthorized access" });
    // }

    return res.status(200).json({
      caseId: banRecord.caseId,
      bannedUser: {
        _id: banRecord.bannedUser._id,
        firstName: banRecord.bannedUser.firstName,
        lastName: banRecord.bannedUser.lastName,
      },
      bannedByWho: {
        _id: banRecord.bannedByWho._id,
        firstName: banRecord.bannedByWho.firstName,
        lastName: banRecord.bannedByWho.lastName,
      },
      reason: banRecord.reason,
      expiryDate: banRecord.expiryDate,
      appealStatus: banRecord.appealStatus,
      appealExplanation: banRecord.appealExplanation,
      isBanned: banRecord.isBanned,
      banDate: banRecord.banDate,
    });

  } catch (error) {
    console.error("Error fetching ban info:", error);
    return res.status(500).json({ error: "Failed to retrieve ban details" });
  }
};


export const submitFeedback = async (req, res) => {
  try {
    const { submittedBy, rating, additionalInformation, type } = req.body;

    if (!submittedBy || !rating || !type) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const feedback = new Feedback({
      submittedBy,
      rating,
      additionalInformation,
      type,
    });

    await feedback.save();
    res.status(201).json(feedback);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};