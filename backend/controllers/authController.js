const User         = require('../models/User');
const Organization = require('../models/Organization');
const Activity     = require('../models/Activity');
const jwt          = require('jsonwebtoken');



const genToken = id => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
const safeUser = u  => ({
  id: u._id, name: u.name, email: u.email, phone: u.phone,
  role: u.role, organization: u.organization, authMethod: u.authMethod
});

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, role, orgName } = req.body;

    // Path 1: With org name → always org_owner
    if (orgName?.trim()) {
      const org  = await Organization.create({ name: orgName.trim() });
      const user = await User.create({ name, email, password, phone, role:'org_owner', organization:org._id, authMethod:'email' });
      org.owner  = user._id; await org.save();
      await Activity.create({ user:user._id, organization:org._id, action:'create', description:`Org '${orgName}' created` });
      return res.status(201).json({ success:true, token:genToken(user._id), user:safeUser(user) });
    }

    // Path 2: No org, no users → super_admin bootstrap
    const total = await User.countDocuments();
    if (total === 0) {
      const user = await User.create({ name, email, password, phone, role:'super_admin', authMethod:'email' });
      return res.status(201).json({ success:true, token:genToken(user._id), user:safeUser(user) });
    }

    // Path 3: Authenticated user adding team member
    if (!req.user) return res.status(401).json({ success:false, message:'Not authorized' });

    // ops_manager can add c1/c2/c3; org_owner can add all
    const agentRoles  = ['c1','c2','c3'];
    const managerRoles= ['ops_lead','ops_manager'];
    const allowed     = req.user.role === 'org_owner'
      ? [...agentRoles, ...managerRoles, 'ops_manager']
      : agentRoles; // ops_manager can only add agents

    const assignRole  = allowed.includes(role) ? role : 'c1';
    const orgId       = req.user.organization?._id;
    if (!orgId) return res.status(400).json({ success:false, message:'No organization found' });

    if (assignRole === 'ops_manager' && !['org_owner','super_admin'].includes(req.user.role))
      return res.status(403).json({ success:false, message:'Only org owner can add Ops Manager' });

    const user = await User.create({ name, email, password, phone, role:assignRole, organization:orgId, createdBy:req.user._id, authMethod:'email' });
    res.status(201).json({ success:true, user:safeUser(user) });
  } catch(e) {
    if (e.code===11000) return res.status(400).json({ success:false, message:'Email already exists' });
    res.status(500).json({ success:false, message:e.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email||!password) return res.status(400).json({ success:false, message:'Email and password required' });
    const user = await User.findOne({ email }).select('+password').populate('organization');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success:false, message:'Invalid credentials' });
    if (!user.isActive) return res.status(401).json({ success:false, message:'Account deactivated' });
    user.lastLogin = new Date(); await user.save({ validateBeforeSave:false });
    await Activity.create({ user:user._id, organization:user.organization?._id, action:'login', description:`${user.name} logged in` });
    res.json({ success:true, token:genToken(user._id), user:safeUser(user) });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id).populate('organization');
  res.json({ success:true, user });
};

// GET /api/auth/users
exports.getUsers = async (req, res) => {
  try {
    const q = req.user.role === 'super_admin' ? {} : { organization: req.user.organization._id };
    const users = await User.find(q).populate('organization','name plan').populate('createdBy','name');
    res.json({ success:true, users });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// PUT /api/auth/users/:id
exports.updateUser = async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success:false, message:'User not found' });
    if (req.user.role !== 'super_admin' && String(target.organization) !== String(req.user.organization._id))
      return res.status(403).json({ success:false, message:'Not in your organization' });
    // ops_manager can only change agent roles (c1/c2/c3)
    if (req.user.role === 'ops_manager') {
      if (!['c1','c2','c3'].includes(req.body.role))
        return res.status(403).json({ success:false, message:'Ops Manager can only assign agent roles' });
    }
    if (req.body.role     !== undefined) target.role     = req.body.role;
    if (req.body.isActive !== undefined) target.isActive = req.body.isActive;
    await target.save();
    res.json({ success:true, user:target });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// GET /api/auth/orgs — super_admin
exports.getOrgs = async (req, res) => {
  try {
    const orgs = await Organization.find().populate('owner','name email');
    res.json({ success:true, orgs });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// PUT /api/auth/org — org_owner updates their org settings (plan, follow-up config, custom cols)
exports.updateOrg = async (req, res) => {
  try {
    const org = await Organization.findById(req.user.organization._id);
    if (!org) return res.status(404).json({ success:false, message:'Org not found' });
    const { plan, followUpConfig, customColumns } = req.body;
    if (plan)            org.plan            = plan;
    if (followUpConfig)  org.followUpConfig  = { ...org.followUpConfig, ...followUpConfig };
    if (customColumns)   org.customColumns   = customColumns;
    await org.save();
    res.json({ success:true, org });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// GET /api/auth/org
exports.getOrg = async (req, res) => {
  try {
    const org = await Organization.findById(req.user.organization._id);
    res.json({ success:true, org });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// Also allow updating org name (for Google users who got auto-name)
// This is already handled in updateOrg — just ensure name is accepted
