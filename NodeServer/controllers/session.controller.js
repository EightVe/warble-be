import Session from "../models/session.model.js";
import User from "../models/user.model.js";

export const addSession = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId);
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      await Session.updateMany({ userId, isCurrent: true }, { isCurrent: false });
  
      const newSession = new Session({
        userId,
        ip: user.ip,
        city: user.city,
        country: user.country,
        org: user.org,
        postal: user.postal,
        version: user.version,
        network: user.network,
        country_capital: user.country_capital,
        userAgent: req.headers['user-agent'],
        isCurrent: true, // Mark this session as current
      });
  
      await newSession.save();
      res.status(201).json({ message: 'Session added successfully', session: newSession });
    } catch (error) {
      next(error);
    }
  };
  export const deleteSession = async (req, res, next) => {
    try {
      const sessionId = req.body.sessionId;
      await Session.findByIdAndDelete(sessionId);
      res.status(200).json({ message: 'Session deleted successfully' });
    } catch (error) {
      next(error);
    }
  };
  
  export const getSessions = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const sessions = await Session.find({ userId }).sort({ createdAt: -1 });
      res.status(200).json(sessions);
    } catch (error) {
      next(error);
    }
  };