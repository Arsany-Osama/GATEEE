exports.up = async function up(db) {
  const hasPricingType = await db.schema.hasColumn('courses', 'pricing_type');
  const hasDiscountPrice = await db.schema.hasColumn('courses', 'discount_price');
  const hasPrice = await db.schema.hasColumn('courses', 'price');

  if (!hasPricingType || !hasDiscountPrice || !hasPrice) return;

  await db('courses')
    .whereNull('deleted_at')
    .update({
      pricing_type: db.raw(`
        CASE
          WHEN price IS NULL OR price <= 0 THEN 'free'
          WHEN discount_price IS NOT NULL AND discount_price > 0 AND discount_price < price THEN 'discounted'
          ELSE 'paid'
        END
      `),
      discount_price: db.raw(`
        CASE
          WHEN price IS NOT NULL AND price > 0 AND discount_price IS NOT NULL AND discount_price > 0 AND discount_price < price
            THEN discount_price
          ELSE NULL
        END
      `),
    });
};

exports.down = async function down() {
  // The data normalization is safe to keep; no reverse migration is needed.
};
