const adminAuth = async (req, res, next) => {
  try {
    // Check if user exists and is admin
    if (!req.user || req.user.role !== 'admin') {
      console.log('Admin auth failed:', { user: req.user });
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(403).json({ message: 'Access denied' });
  }
};

module.exports = adminAuth;