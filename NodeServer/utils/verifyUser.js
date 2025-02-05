import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const { accessToken } = req.cookies;
  if (!accessToken) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ message: 'Forbidden' });
  }
};

export const authorizeAdmin = (req, res, next) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Forbidden' });
  next();
};
