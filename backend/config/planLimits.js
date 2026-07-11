const PLAN_LIMITS = {
  free: {
    maxLeads: 50,
  },

  basic: {
    maxLeads: 5000,
  },

  pro: {
    maxLeads: Infinity,
  },
};

module.exports = PLAN_LIMITS;