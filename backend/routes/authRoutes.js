const express = require('express');
const r = express.Router();
const c = require('../controllers/authController');
const { protect, isSuperAdmin, canManageOrg, isOrgOwner, canAssignRoles } = require('../middleware/auth');

r.post('/register', (req,res,next) => {
  const auth = req.headers.authorization;
  if (auth) return protect(req,res,() => c.register(req,res));
  c.register(req,res);
});
r.post('/login',         c.login);
r.post('/reset-password', c.resetPassword);
r.get('/me',             protect, c.getMe);
r.get('/users',          protect, canAssignRoles, c.getUsers);
r.put('/users/:id',      protect, canAssignRoles, c.updateUser);
r.get('/orgs',           protect, isSuperAdmin, c.getOrgs);
r.get('/org',            protect, isOrgOwner, c.getOrg);
r.put('/org',            protect, isOrgOwner, c.updateOrg);

module.exports = r;
