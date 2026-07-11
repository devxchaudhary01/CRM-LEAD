const Lead         = require('../models/Lead');
const Organization = require('../models/Organization');
const Activity     = require('../models/Activity');
const XLSX         = require('xlsx');
const fs           = require('fs');
const PLAN_LIMITS  = require('../config/planLimits')


// ── GET /api/leads ──────────────────────────────────────────────
exports.getLeads = async (req, res) => {
  try {
    const { page=1, limit=20, search='', status='' } = req.query;
    let q = {};
    if (req.user.role !== 'super_admin') q.organization = req.user.organization._id;
    if (status) q.status = status;
    if (search) q.$or = [
      { name:      { $regex:search, $options:'i' } },
      { contactNo: { $regex:search, $options:'i' } },
      { emailId:   { $regex:search, $options:'i' } },
    ];

    const total = await Lead.countDocuments(q);
    const leads = await Lead.find(q)
      .populate('uploadedBy','name')
      .populate('lastWorkedBy','name role')
      .populate('c1.doneBy','name')
      .populate('c2.doneBy','name')
      .populate('c3.doneBy','name')
      .sort({ uploadDate:-1 })
      .skip((page-1)*Number(limit))
      .limit(Number(limit));

    // ── Duplicate detection ──────────────────────────────────
    // Mark leads whose contactNo appears more than once in this org
    const allContacts = await Lead.aggregate([
      { $match: { organization: req.user.role !== 'super_admin' ? req.user.organization._id : { $exists:true } } },
      { $group: { _id:'$contactNo', count:{ $sum:1 } } },
      { $match: { count:{ $gt:1 }, _id:{ $ne:'' } } },
    ]);
    const dupContacts = new Set(allContacts.map(d => d._id));

    const leadsWithDup = leads.map(l => {
      const obj = l.toObject();
      obj.isDuplicate = !!(obj.contactNo && dupContacts.has(obj.contactNo));
      return obj;
    });

    res.json({ success:true, total, page:+page, pages:Math.ceil(total/limit), leads:leadsWithDup });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── POST /api/leads ─────────────────────────────────────────────
exports.createLead = async (req, res) => {
  try {
    const org = req.user.organization;
    // Check lead limit based on plan
const organization = await Organization.findById(org._id);

const plan = organization?.plan || "free";
const planLimit = PLAN_LIMITS[plan]?.maxLeads ?? 50;

if (planLimit !== Infinity) {
  const currentLeadCount = await Lead.countDocuments({
    organization: org._id,
  });

  if (currentLeadCount >= planLimit) {
    return res.status(403).json({
      success: false,
      message: `Free Plan allows only ${planLimit} leads. Please upgrade your plan to add more leads.`,
    });
  }
}
    const { name,address,emailId,contactNo,product,service,customData } = req.body;
    const lead = await Lead.create({
      name, address, emailId, contactNo, product, service,
      customData: customData || {},
      organization: org._id,
      uploadedBy:   req.user._id,
    });
    res.status(201).json({ success:true, lead });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── PUT /api/leads/:id ──────────────────────────────────────────
exports.updateLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success:false, message:'Lead not found' });

    if (req.user.role !== 'super_admin' &&
        String(lead.organization) !== String(req.user.organization._id))
      return res.status(403).json({ success:false, message:'Not in your organization' });

    const role = req.user.role;
    const { c1, c2, c3, c2Enabled, c3Enabled, followUpDate, product, service, customData } = req.body;

    // ── Call updates (role-gated) ──
    if (c1 !== undefined && ['c1','ops_lead','ops_manager','org_owner','sub_business_owner','super_admin'].includes(role)) {
      lead.c1 = { ...(lead.c1?.toObject?.() ?? {}), ...c1, doneBy: req.user._id };
    }
    if (c2 !== undefined && lead.c2Enabled && ['c2','ops_lead','ops_manager','org_owner','sub_business_owner','super_admin'].includes(role)) {
      lead.c2 = { ...(lead.c2?.toObject?.() ?? {}), ...c2, doneBy: req.user._id };
    }
    if (c3 !== undefined && lead.c3Enabled && ['c3','ops_lead','ops_manager','org_owner','sub_business_owner','super_admin'].includes(role)) {
      lead.c3 = { ...(lead.c3?.toObject?.() ?? {}), ...c3, doneBy: req.user._id };
    }

    // ── Enable C2/C3 — owner-like roles or ops_manager ──
    if (c2Enabled !== undefined && ['ops_manager','org_owner','sub_business_owner','super_admin'].includes(role)) lead.c2Enabled = c2Enabled;
    if (c3Enabled !== undefined && ['ops_manager','org_owner','sub_business_owner','super_admin'].includes(role)) lead.c3Enabled = c3Enabled;

    // ── Follow-up date — owner-like roles only ──
    if (followUpDate !== undefined && ['org_owner','sub_business_owner','super_admin'].includes(role)) {
      lead.followUpDate  = followUpDate || null;
      lead.followUpSetBy = req.user._id;
    }

    // ── Editable fields ──
    if (product    !== undefined) lead.product    = product;
    if (service    !== undefined) lead.service    = service;
    if (customData !== undefined) lead.customData = { ...(lead.customData || {}), ...customData };

    lead.lastWorkedBy = req.user._id;
    lead.lastWorkedAt = new Date();
    await lead.save();

    await Activity.create({
      user: req.user._id, organization: req.user.organization?._id,
      action: 'update', description: `Updated lead: ${lead.name}`, relatedLead: lead._id,
    });

    res.json({ success:true, lead });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── DELETE /api/leads/:id ───────────────────────────────────────
exports.deleteLead = async (req, res) => {
  try {
    await Lead.findByIdAndDelete(req.params.id);
    res.json({ success:true, message:'Deleted' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── POST /api/leads/upload ──────────────────────────────────────
exports.uploadLeads = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success:false, message:'No file uploaded' });
    const org = req.user.organization;

    // Fetch org custom columns so we can map them too
    const orgDoc = await Organization.findById(org._id);
    const customCols = orgDoc?.customColumns || [];

    const wb   = XLSX.readFile(req.file.path);
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    fs.unlinkSync(req.file.path);
    if (!data.length) return res.status(400).json({ success:false, message:'File is empty' });

    const leads = data.map(r => {
      // Build customData from custom column keys
      const customData = {};
      customCols.forEach(col => {
        const val = r[col.label] || r[col.key] || '';
        if (val) customData[col.key] = String(val);
      });

      return {
        name:      r.Name    || r.name    || '',
        address:   r.Address || r.address || r.add || '',
        emailId:   r.Email   || r.email   || r['Email ID'] || r['email id'] || '',
        contactNo: r.Contact || r.contact || r.Phone || r.phone || r['cont no'] || '',
        product:   r.Product || r.product || '',
        service:   r.Service || r.service || '',
        customData,
        organization: org._id,
        uploadedBy:   req.user._id,
      };
    }).filter(l => l.name);

// Get organization plan
const organization = await Organization.findById(org._id);

const plan = organization?.plan || "free";
const planLimit = PLAN_LIMITS[plan]?.maxLeads ?? 50;

// Pro plan has unlimited leads
let leadsToInsert = leads;
let ignored = 0;

if (planLimit !== Infinity) {
  // Current lead count of this organization
  const currentLeadCount = await Lead.countDocuments({
    organization: org._id,
  });

  const remaining = Math.max(planLimit - currentLeadCount, 0);

  leadsToInsert = leads.slice(0, remaining);
  ignored = leads.length - leadsToInsert.length;
}


    const inserted = await Lead.insertMany(leadsToInsert);

    await Activity.create({
      user: req.user._id, organization: org._id, action: 'upload',
      description: `Uploaded ${inserted.length}  leads`, meta: { count: inserted.length },
    });

    res.json({
  success: true,
  imported: inserted.length,
  ignored,
  totalUploaded: leads.length,
  message:
    ignored > 0
      ? `Free Plan allows only ${planLimit} leads. ${ignored} leads were skipped.`
      : "Leads uploaded successfully.",
});
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── GET /api/leads/download ─────────────────────────────────────
exports.downloadLeads = async (req, res) => {
  try {
    const q = req.user.role !== 'super_admin' ? { organization: req.user.organization._id } : {};
    const leads = await Lead.find(q)
      .populate('uploadedBy','name').populate('lastWorkedBy','name')
      .populate('c1.doneBy','name').populate('c2.doneBy','name').populate('c3.doneBy','name');

    const orgDoc = req.user.role !== 'super_admin'
      ? await Organization.findById(req.user.organization._id)
      : null;
    const customCols = orgDoc?.customColumns || [];

    const OUTCOME = { I:'Interested', NI:'Not Interested', CB:'Call Back', NA:'No Answer', '':'—' };

    const rows = leads.map(l => {
      const row = {
        Name: l.name, Address: l.address, 'Email ID': l.emailId, 'Contact': l.contactNo,
        Product: l.product, Service: l.service,
        'Upload Date': l.uploadDate ? new Date(l.uploadDate).toLocaleDateString() : '',
        'C1 Date':   l.c1?.date   ? new Date(l.c1.date).toLocaleDateString()   : '',
        'C1 Result': OUTCOME[l.c1?.outcome || ''],
        'C1 By':     l.c1?.doneBy?.name || '',
        'C1 Notes':  l.c1?.notes || '',
        'C1 Follow-up': l.followUpDate ? new Date(l.followUpDate).toLocaleDateString() : '',
        'C2 Date':   l.c2Enabled && l.c2?.date ? new Date(l.c2.date).toLocaleDateString() : '',
        'C2 Result': l.c2Enabled ? OUTCOME[l.c2?.outcome || ''] : 'N/A',
        'C2 By':     l.c2?.doneBy?.name || '',
        'C3 Date':   l.c3Enabled && l.c3?.date ? new Date(l.c3.date).toLocaleDateString() : '',
        'C3 Result': l.c3Enabled ? OUTCOME[l.c3?.outcome || ''] : 'N/A',
        'C3 By':     l.c3?.doneBy?.name || '',
        Status:       l.status,
        'Last Worked By': l.lastWorkedBy?.name || '',
        'Duplicate': l.isDuplicate ? 'Yes' : 'No',
      };
      // Append custom columns
      customCols.forEach(col => { row[col.label] = l.customData?.[col.key] || ''; });
      return row;
    });

    const wb  = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Leads');
    const buf = XLSX.write(wb, { type:'buffer', bookType:'xlsx' });

    await Activity.create({
      user: req.user._id, organization: req.user.organization?._id,
      action: 'download', description: `Downloaded ${leads.length} leads`,
    });

    res.setHeader('Content-Disposition','attachment; filename=leads_export.xlsx');
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── GET /api/leads/org-columns — get org custom columns ─────────
exports.getOrgColumns = async (req, res) => {
  try {
    const org = await Organization.findById(req.user.organization._id);
    res.json({ success:true, customColumns: org?.customColumns || [] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── POST /api/leads/org-columns — add a custom column ───────────
exports.addOrgColumn = async (req, res) => {
  try {
    const { label, type, options } = req.body;
    if (!label?.trim()) return res.status(400).json({ success:false, message:'Column label is required' });

    const org = await Organization.findById(req.user.organization._id);
    if (!org) return res.status(404).json({ success:false, message:'Organization not found' });

    // Generate a safe key from label
    const key = label.trim().toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'') + '_' + Date.now().toString().slice(-4);

    org.customColumns.push({ key, label: label.trim(), type: type || 'text', options: options || [], editable: true });
    await org.save();

    res.json({ success:true, customColumns: org.customColumns });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── DELETE /api/leads/org-columns/:key — remove a custom column ─
exports.deleteOrgColumn = async (req, res) => {
  try {
    const org = await Organization.findById(req.user.organization._id);
    if (!org) return res.status(404).json({ success:false, message:'Organization not found' });

    org.customColumns = org.customColumns.filter(c => c.key !== req.params.key);
    await org.save();

    res.json({ success:true, customColumns: org.customColumns });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── GET /api/leads/analytics ────────────────────────────────────
exports.getAnalytics = async (req, res) => {
  try {
    const { period='month' } = req.query;
    const q = req.user.role !== 'super_admin' ? { organization: req.user.organization._id } : {};
    const now = new Date();
    const starts = { week:7, month:30, quarter:90, half:180, year:365 };
    const startDate = new Date(now - (starts[period]||30)*86400000);
    const rq = { ...q, uploadDate:{ $gte:startDate } };

    const [total,pending,inProgress,converted,notConverted] = await Promise.all([
      Lead.countDocuments(rq),
      Lead.countDocuments({ ...rq, status:'pending' }),
      Lead.countDocuments({ ...rq, status:'in_progress' }),
      Lead.countDocuments({ ...rq, status:'converted' }),
      Lead.countDocuments({ ...rq, status:'not_converted' }),
    ]);

    const monthlyUploads = await Lead.aggregate([
      { $match: { ...q, uploadDate:{ $gte:startDate } } },
      { $group: { _id:{ y:{$year:'$uploadDate'}, m:{$month:'$uploadDate'} }, count:{$sum:1} } },
      { $sort: { '_id.y':1, '_id.m':1 } },
    ]);
    const dailyUploads = await Lead.aggregate([
      { $match: { ...q, uploadDate:{ $gte:startDate } } },
      { $group: { _id:{ $dateToString:{ format:'%Y-%m-%d', date:'$uploadDate' } }, count:{$sum:1} } },
      { $sort: { _id:1 } },
    ]);
    const c1Outcomes = await Lead.aggregate([
      { $match: rq }, { $group: { _id:'$c1.outcome', count:{$sum:1} } },
    ]);
    const workerPerf = await Lead.aggregate([
      { $match: { ...q, lastWorkedBy:{ $ne:null } } },
      { $group: { _id:'$lastWorkedBy', count:{$sum:1} } },
      { $lookup: { from:'users', localField:'_id', foreignField:'_id', as:'user' } },
      { $unwind:'$user' },
      { $project: { name:'$user.name', role:'$user.role', count:1 } },
      { $sort: { count:-1 } }, { $limit:10 },
    ]);

    res.json({ success:true, analytics:{ period,total,pending,inProgress,converted,notConverted,monthlyUploads,dailyUploads,c1Outcomes,workerPerf } });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── GET /api/leads/activities ────────────────────────────────────
exports.getActivities = async (req, res) => {
  try {
    const q = req.user.role !== 'super_admin' ? { organization: req.user.organization._id } : {};
    const acts = await Activity.find(q).populate('user','name role').sort({ createdAt:-1 }).limit(30);
    res.json({ success:true, activities:acts });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── GET /api/leads/daily-report ──────────────────────────────────
exports.getDailyReport = async (req, res) => {
  try {
    const q = req.user.role !== 'super_admin' ? { organization: req.user.organization._id } : {};
    const report = await Lead.aggregate([
      { $match: q },
      { $group: {
        _id:          { $dateToString:{ format:'%Y-%m-%d', date:'$uploadDate' } },
        uploaded:     { $sum:1 },
        pending:      { $sum:{ $cond:[{ $eq:['$status','pending']       },1,0] } },
        inProgress:   { $sum:{ $cond:[{ $eq:['$status','in_progress']   },1,0] } },
        converted:    { $sum:{ $cond:[{ $eq:['$status','converted']     },1,0] } },
        notConverted: { $sum:{ $cond:[{ $eq:['$status','not_converted'] },1,0] } },
      }},
      { $sort:{ _id:-1 } }, { $limit:90 },
    ]);
    res.json({ success:true, report });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};
