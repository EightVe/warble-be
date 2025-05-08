import crypto from "crypto";
import { Report } from "../models/report.model.js";

/**
 * Get report details (only if user is authorized).
 */
export const GetMyReportInfo = async (req, res) => {
  try {
    const { reportId, userId } = req.params;

    // Ensure requesting user matches `reportedByWho`
    const report = await Report.findOne({ _id: reportId, reportedByWho: userId });

    if (!report) {
      return res.status(403).json({ message: "Unauthorized to view this report" });
    }

    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ message: "Error fetching report info", error: error.message });
  }
};

/**
 * Get all reports submitted by the authenticated user.
 */
export const GetAllMyReports = async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch only reports where the user is `reportedByWho`
    const reports = await Report.find({ reportedByWho: userId });

    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({ message: "Error fetching reports", error: error.message });
  }
};
/**
 * Generate a secure 6-digit report ID
 */
const generateReportId = () => {
  const randomNumber = crypto.randomInt(100000, 999999); // Generate a number between 100000 - 999999
  return `REP-${randomNumber}`;
};

/**
 * Submit a new report.
 */
export const SubmitReport = async (req, res) => {
  try {

    const { reportedUser, reportedByWho, reason, screenshot, severity, type } = req.body;
    console.log(req.body)
    // Ensure reportedUser is different from the reporter
    // if (reportedUser === reportedByWho) {
    //   return res.status(400).json({ message: "You cannot report yourself." });
    // }

    // Generate unique report ID
    let reportId;
    let isUnique = false;

    while (!isUnique) {
      reportId = generateReportId();
      const existingReport = await Report.findOne({ reportId });
      if (!existingReport) isUnique = true; // Ensure it's unique before proceeding
    }

    // Create and save the new report
    const newReport = new Report({
      reportedUser,
      reportedByWho,
      reason,
      screenshot,
      severity,
      type,
      reportId,
    });

    await newReport.save();

    res.status(201).json({ message: "Report submitted successfully", report: newReport });
  } catch (error) {
    res.status(500).json({ message: "Error submitting report", error: error.message });
  }
};
