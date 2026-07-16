// controllers/paymentController.js
const Razorpay    = require('razorpay');
const crypto      = require('crypto');
const Payment     = require('../models/Payment');
const Organization= require('../models/Organization');
const Activity    = require('../models/Activity');

// Initialize Razorpay
const getRazorpay = () => new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const normalizePlan = (plan) => (plan === 'free' ? 'trial' : (plan || 'trial'));

const PLAN_PRICES = {
  pro: Number(process.env.PRICE_PRO) || 299900,  // ₹2999 in paise
};

const PLAN_NAMES = { pro:'Pro Plan' };

/**
 * POST /api/payment/create-order
 * Body: { plan: 'pro' }
 * Creates a Razorpay order and returns order details to frontend
 */
exports.createOrder = async (req, res) => {
  try {
    const { plan } = req.body;
    if (plan !== 'pro')
      return res.status(400).json({ success:false, message:'Invalid plan. Choose pro.' });

    const amount = PLAN_PRICES[plan];
    const razorpay = getRazorpay();

    // Create order in Razorpay
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt:  `crm_${req.user._id}_${Date.now()}`,
      notes: {
        organizationId: String(req.user.organization._id),
        orgName:        req.user.organization.name,
        plan,
        userId:         String(req.user._id),
        userName:       req.user.name,
      },
    });

    // Save pending payment record
    await Payment.create({
      organization:    req.user.organization._id,
      paidBy:          req.user._id,
      razorpayOrderId: order.id,
      plan,
      amount,
      status:          'created',
    });

    res.json({
      success: true,
      order: {
        id:       order.id,
        amount:   order.amount,
        currency: order.currency,
      },
      key:      process.env.RAZORPAY_KEY_ID,
      plan,
      planName: PLAN_NAMES[plan],
      orgName:  req.user.organization.name,
      userName: req.user.name,
      userEmail:req.user.email,
    });
  } catch(e) {
    console.error('Razorpay create order error:', e);
    res.status(500).json({ success:false, message: e.message || 'Payment initiation failed' });
  }
};

/**
 * POST /api/payment/verify
 * Body: { razorpayOrderId, razorpayPaymentId, razorpaySignature, plan }
 * Verifies payment signature and upgrades org plan
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, plan } = req.body;

    // 1. Verify HMAC signature
    const body      = razorpayOrderId + '|' + razorpayPaymentId;
    const expected  = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expected !== razorpaySignature) {
      await Payment.findOneAndUpdate(
        { razorpayOrderId },
        { status:'failed' }
      );
      return res.status(400).json({ success:false, message:'Payment verification failed — invalid signature' });
    }

    // 2. Update payment record
    const validFrom = new Date();
    const validTill = new Date(validFrom);
    validTill.setDate(validTill.getDate() + 30); // 30-day subscription

    await Payment.findOneAndUpdate(
      { razorpayOrderId },
      { razorpayPaymentId, razorpaySignature, status:'paid', validFrom, validTill }
    );

    // 3. Upgrade organization plan
    await Organization.findByIdAndUpdate(
      req.user.organization._id,
      { plan, planValidTill: validTill }
    );

    // 4. Log activity
    await Activity.create({
      user:         req.user._id,
      organization: req.user.organization._id,
      action:       'create',
      description:  `Upgraded to ${plan.toUpperCase()} plan — valid till ${validTill.toLocaleDateString()}`,
      meta:         { plan, razorpayPaymentId, amount: PLAN_PRICES[plan] },
    });

    res.json({
      success:  true,
      message:  `🎉 Payment successful! Your plan is now ${plan.toUpperCase()}.`,
      plan,
      validTill,
    });
  } catch(e) {
    console.error('Razorpay verify error:', e);
    res.status(500).json({ success:false, message: e.message });
  }
};

/**
 * POST /api/payment/webhook
 * Razorpay sends events here automatically (for failed payments, refunds etc.)
 * Set this URL in Razorpay dashboard → Settings → Webhooks
 */
exports.webhook = async (req, res) => {
  try {
    const secret    = process.env.RAZORPAY_KEY_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    const body      = JSON.stringify(req.body);

    const expected = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (expected !== signature) {
      return res.status(400).json({ message:'Invalid webhook signature' });
    }

    const event = req.body.event;

    if (event === 'payment.captured') {
      // Payment auto-captured — already handled in verify
      console.log('Webhook: payment.captured', req.body.payload?.payment?.entity?.id);
    }

    if (event === 'payment.failed') {
      const orderId = req.body.payload?.payment?.entity?.order_id;
      if (orderId) await Payment.findOneAndUpdate({ razorpayOrderId:orderId }, { status:'failed' });
      console.log('Webhook: payment.failed for order', orderId);
    }

    if (event === 'refund.created') {
      // Handle refund — downgrade plan
      const orderId = req.body.payload?.refund?.entity?.payment_id;
      const payment = await Payment.findOne({ razorpayPaymentId: orderId });
      if (payment) {
        await Organization.findByIdAndUpdate(payment.organization, { plan:'trial' });
        console.log('Webhook: refund — org downgraded to trial');
      }
    }

    res.json({ received: true });
  } catch(e) {
    console.error('Webhook error:', e);
    res.status(500).json({ message: e.message });
  }
};

/**
 * GET /api/payment/history
 * Returns payment history for the org
 */
exports.getHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ organization: req.user.organization._id })
      .populate('paidBy','name email')
      .sort({ createdAt:-1 });
    res.json({ success:true, payments });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

/**
 * GET /api/payment/status
 * Returns current plan + days remaining
 */
exports.getPlanStatus = async (req, res) => {
  try {
    const org = await Organization.findById(req.user.organization._id);
    const now  = new Date();
    const till = org.planValidTill;
    const daysLeft = till ? Math.max(0, Math.ceil((till-now)/86400000)) : 0;

    const plan = normalizePlan(org.plan);

    res.json({
      success:   true,
      plan,
      validTill: till,
      daysLeft,
      isActive:  till ? till > now : plan === 'trial',
    });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};
