const jwt  = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  const token = req.headers.authorization?.startsWith('Bearer')
    ? req.headers.authorization.split(' ')[1] : null;
  if (!token) return res.status(401).json({ success:false, message:'No token' });
  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(id).select('-password').populate('organization');
    if (!req.user?.isActive) return res.status(401).json({ success:false, message:'Account inactive' });
    next();
  } catch { res.status(401).json({ success:false, message:'Invalid token' }); }
};

exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ success:false, message:`Role '${req.user.role}' not allowed` });
  next();
};

const ownerLikeRoles = ['org_owner','sub_business_owner'];
const ownerLikeWithSuper = [...ownerLikeRoles, 'super_admin'];

// Shortcuts — updated for new roles
exports.isSuperAdmin = exports.authorize('super_admin');
exports.isOrgOwner   = exports.authorize(...ownerLikeWithSuper);
exports.canManageOrg = exports.authorize(...ownerLikeRoles, 'ops_manager', 'super_admin');
exports.canDownload  = exports.authorize(...ownerLikeRoles, 'ops_manager', 'super_admin');
exports.canUpload    = exports.authorize(...ownerLikeRoles);
exports.canWork      = exports.authorize('c1','c2','c3','ops_lead','ops_manager', ...ownerLikeRoles, 'super_admin');
exports.canViewDash  = exports.authorize(...ownerLikeRoles, 'ops_manager', 'ops_lead', 'super_admin');
// ops_manager can assign roles to agents
exports.canAssignRoles = exports.authorize(...ownerLikeRoles, 'ops_manager', 'super_admin');
