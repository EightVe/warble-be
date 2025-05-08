import User from "../models/user.model.js";
import { io } from "../index.js";
import crypto from "crypto";
import { UserLogs } from "../models/userlogs.model.js";
import { Ban } from "../models/ban.model.js";
import { PreviousBan } from "../models/previousbans.model.js";
import { Report } from "../models/report.model.js";
import { Feedback } from "../models/feedback.model.js";
const generateCaseNumber = () => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const randomLetters = Array.from({ length: 3 }, () =>
    letters.charAt(crypto.randomInt(0, letters.length))
  ).join("");

  const randomNumbers = () => crypto.randomInt(1000, 9999); // Generates a 4-digit number

  return `${randomLetters}-${randomNumbers()}-${randomNumbers()}`;
};
export const RecentFiveUsers = async (req, res) => {
  try {
    const latestUsers = await User.find() // Exclude admins
      .sort({ createdAt: -1 }) // Sort by latest created users
      .limit(5) // Get only 5 users
      .select('-password -refreshToken -resetPasswordToken -resetPasswordExpires');

    res.status(200).json(latestUsers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};
export const banUser = async (req, res) => {
  try {
    const { id } = req.params
    const { isBanned, bannedByWho, reason, expiryDuration } = req.body

    if (!id) {
      return res.status(400).json({ error: "User ID is required" })
    }

    const user = await User.findById(id)
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    if (isBanned) {
      // **BAN USER**
      if (!reason) {
        return res.status(400).json({ error: "Ban reason is required" })
      }

      const caseId = generateCaseNumber()
      let expiryDate = null

      if (expiryDuration) {
        expiryDate = new Date()
        expiryDate.setSeconds(expiryDate.getSeconds() + expiryDuration)
      }

      await Ban.create({
        bannedUser: id,
        bannedByWho,
        caseId,
        reason,
        expiryDate,
        appealStatus: "none",
        isBanned: true,
      })

      user.isBanned = true
      await user.save()

      await UserLogs.create({
        userId: id,
        otherUserId: bannedByWho,
        description: `User has been banned for: ${reason}`,
      })

      io.emit("banStatusUpdated", { userId: user._id, isBanned: true })

      return res.status(200).json({
        message: "User banned successfully",
        user: { _id: user._id, isBanned: true },
      })
    } else {
      // **UNBAN USER (Move to PreviousBan)**
      const banRecord = await Ban.findOne({ bannedUser: id })

      if (!banRecord) {
        return res.status(404).json({ error: "No active ban record found" })
      }

      // **Check if ban is already expired**
      const now = new Date()
      const isExpired = banRecord.expiryDate && new Date(banRecord.expiryDate) <= now

      // Move ban details to PreviousBan collection
      await PreviousBan.create({
        bannedUser: banRecord.bannedUser,
        bannedByWho: banRecord.bannedByWho,
        caseId: banRecord.caseId,
        reason: banRecord.reason,
        // Set expiryDate to current time for manual unbans to show as "Expired" in the UI
        expiryDate: isExpired ? banRecord.expiryDate : new Date(),
        banDate: banRecord.banDate,
        appealStatus: banRecord.appealStatus,
        appealExplanation: banRecord.appealExplanation,
      })

      // Delete the ban from active bans
      await Ban.deleteOne({ _id: banRecord._id })

      // **Update user status if manually unbanned before expiry**
      if (!isExpired) {
        user.isBanned = false
        await user.save()
      }

      await UserLogs.create({
        userId: id,
        otherUserId: bannedByWho,
        description: isExpired ? `Ban expired and moved to history.` : `User has been manually unbanned by admin.`,
      })

      io.emit("banStatusUpdated", { userId: user._id, isBanned: false })

      return res.status(200).json({
        message: isExpired ? "Ban expired and moved to previous bans." : "User unbanned successfully.",
        user: { _id: user._id, isBanned: false },
      })
    }
  } catch (error) {
    console.error("Error updating ban status:", error)
    return res.status(500).json({ error: "Failed to update ban status" })
  }
}
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params; // Get user ID from request params

    const user = await User.findById(id).select('-password -refreshToken -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
};

export const getAllReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate("reportedUser", "firstName avatar emailAddress _id")
      .populate("reportedByWho", "firstName avatar emailAddress _id")
      .sort({ createdAt: -1 })

    res.status(200).json(reports)
  } catch (error) {
    res.status(500).json({ message: "Error fetching all reports", error: error.message })
  }
}

export const editUser = async (req, res) => {
  try {
    const { id } = req.params
    const data = req.body

    // Validate user ID
    if (!id) {
      return res.status(400).json({ error: "User ID is required" })
    }

    // Find user by ID
    const user = await User.findById(id)
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    // Update user fields
    // Only update fields that are provided in the request
    const updatableFields = [
      "firstName",
      "lastName",
      "username",
      "emailAddress",
      "phoneNumber",
      "userAge",
      "userBirthDate",
      "gender",
      "bio",
      "isAdmin",
      "verifiedEmail",
      "twoFactorEnabled",
      "ip",
      "org",
      "postal",
      "version",
      "country_name",
      "network",
      "country_capital",
      "city",
    ]

    updatableFields.forEach((field) => {
      if (data[field] !== undefined) {
        user[field] = data[field]
      }
    })

    // Save the updated user
    await user.save()

    return res.status(200).json({
      message: "User updated successfully",
      user: {
        _id: user._id,
        username: user.username,
        emailAddress: user.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        userAge: user.userAge,
        userBirthDate: user.userBirthDate,
        gender: user.gender,
        phoneNumber: user.phoneNumber,
        bio: user.bio,
        verifiedEmail: user.verifiedEmail,
        isAdmin: user.isAdmin,
        isBanned: user.isBanned,
        twoFactorEnabled: user.twoFactorEnabled,
        avatar: user.avatar,
        ip: user.ip,
        org: user.org,
        postal: user.postal,
        version: user.version,
        country_name: user.country_name,
        network: user.network,
        country_capital: user.country_capital,
        city: user.city,
      },
    })
  } catch (error) {
    console.error("Error updating user:", error)
    return res.status(500).json({ error: "Failed to update user" })
  }
}

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find() // Fetch all users
      .sort({ createdAt: -1 }) // Sort by latest created users
      .select('-password -refreshToken -resetPasswordToken -resetPasswordExpires'); // Exclude sensitive data

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

export const rejectAppeal = async (req, res) => {
  try {
    const { caseId } = req.params;
    const ban = await Ban.findOne({ caseId });

    if (!ban) {
      return res.status(404).json({ error: "Ban case not found" });
    }

    ban.appealStatus = "rejected";
    await ban.save();

    return res.status(200).json({ message: "Appeal rejected", updated: ban });
  } catch (error) {
    console.error("Error rejecting appeal:", error);
    return res.status(500).json({ error: "Failed to reject appeal" });
  }
};

export const approveAppeal = async (req, res) => {
  try {
    const { caseId } = req.params;
    const ban = await Ban.findOne({ caseId });

    if (!ban) {
      return res.status(404).json({ error: "Ban case not found" });
    }

    // Update status
    ban.appealStatus = "approved";
    await ban.save();

    // Move ban to PreviousBan
    await PreviousBan.create({
      bannedUser: ban.bannedUser,
      bannedByWho: ban.bannedByWho,
      caseId: ban.caseId,
      reason: ban.reason,
      expiryDate: new Date(), // Mark expiry
      banDate: ban.banDate,
      appealStatus: "approved",
      appealExplanation: ban.appealExplanation,
    });

    await Ban.deleteOne({ _id: ban._id });

    // Unban user
    await User.findByIdAndUpdate(ban.bannedUser, { isBanned: false });

    io.emit("banStatusUpdated", { userId: ban.bannedUser, isBanned: false });

    return res.status(200).json({ message: "Appeal approved and user unbanned" });
  } catch (error) {
    console.error("Error approving appeal:", error);
    return res.status(500).json({ error: "Failed to approve appeal" });
  }
};

export const getAllFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find().populate("submittedBy", "firstName");
    res.status(200).json(feedbacks);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const getFeedbackById = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id).populate("submittedBy", "firstName");

    if (!feedback) return res.status(404).json({ message: "Feedback not found" });

    res.status(200).json(feedback);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};