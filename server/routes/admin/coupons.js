const express = require('express');
const router = express.Router();
const db = require('../../db/knex');
const { authenticate, isAdmin } = require('../../middleware/auth');
const { sendUnexpectedError } = require('../../utils/http');

const validId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const nullableDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const payloadFrom = (body) => {
  const discountType = body.discount_type === 'fixed' ? 'fixed' : 'percent';
  const discountValue = Number(body.discount_value);
  const maxUses = body.max_uses === '' || body.max_uses === undefined || body.max_uses === null ? null : Number(body.max_uses);

  return {
    code: String(body.code || '').trim().toUpperCase(),
    description: String(body.description || '').trim() || null,
    discount_type: discountType,
    discount_value: Number.isFinite(discountValue) ? discountValue : NaN,
    max_uses: Number.isFinite(maxUses) ? maxUses : null,
    starts_at: nullableDate(body.starts_at),
    expires_at: nullableDate(body.expires_at),
    is_active: body.is_active === undefined ? true : Boolean(body.is_active),
  };
};

const validate = (payload) => {
  if (!payload.code) return 'Coupon code is required.';
  if (!Number.isFinite(payload.discount_value) || payload.discount_value <= 0) return 'Discount value must be greater than zero.';
  if (payload.discount_type === 'percent' && payload.discount_value > 100) return 'Percent discounts cannot exceed 100%.';
  if (payload.max_uses !== null && (!Number.isInteger(payload.max_uses) || payload.max_uses <= 0)) return 'Max uses must be a positive whole number.';
  return '';
};

let couponsTableSupported = null;
const hasCouponsTable = async () => {
  if (couponsTableSupported !== null) return couponsTableSupported;
  couponsTableSupported = await db.schema.hasTable('coupons');
  return couponsTableSupported;
};

router.use(authenticate, isAdmin);

router.get('/', async (req, res) => {
  try {
    if (!(await hasCouponsTable())) {
      return res.json({ data: [], support: { coupons: false }, message: 'Coupons migration has not run yet.' });
    }
    const coupons = await db('coupons').select('*').orderBy('created_at', 'desc');
    res.json(coupons);
  } catch (error) {
    return sendUnexpectedError(res, error, 'List coupons failed');
  }
});

router.post('/', async (req, res) => {
  try {
    if (!(await hasCouponsTable())) return res.status(503).json({ error: 'Coupons are unavailable until database migrations run.' });
    const payload = payloadFrom(req.body);
    const error = validate(payload);
    if (error) return res.status(400).json({ error });
    const [id] = await db('coupons').insert(payload);
    res.status(201).json({ id, message: 'Coupon created.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Coupon code already exists.' });
    return sendUnexpectedError(res, error, 'Create coupon failed');
  }
});

router.put('/:id', async (req, res) => {
  const id = validId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Select a valid coupon.' });
  try {
    if (!(await hasCouponsTable())) return res.status(503).json({ error: 'Coupons are unavailable until database migrations run.' });
    const payload = payloadFrom(req.body);
    const error = validate(payload);
    if (error) return res.status(400).json({ error });
    const updated = await db('coupons').where({ id }).update(payload);
    if (!updated) return res.status(404).json({ error: 'Coupon not found.' });
    res.json({ message: 'Coupon updated.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Coupon code already exists.' });
    return sendUnexpectedError(res, error, 'Update coupon failed');
  }
});

router.delete('/:id', async (req, res) => {
  const id = validId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Select a valid coupon.' });
  try {
    if (!(await hasCouponsTable())) return res.status(503).json({ error: 'Coupons are unavailable until database migrations run.' });
    const deleted = await db('coupons').where({ id }).del();
    if (!deleted) return res.status(404).json({ error: 'Coupon not found.' });
    res.json({ message: 'Coupon deleted.' });
  } catch (error) {
    return sendUnexpectedError(res, error, 'Delete coupon failed');
  }
});

module.exports = router;
