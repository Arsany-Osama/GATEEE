exports.up = async function up(db) {
  const hasPricingType = await db.schema.hasColumn('courses', 'pricing_type');
  const hasDiscountPrice = await db.schema.hasColumn('courses', 'discount_price');

  if (!hasPricingType || !hasDiscountPrice) {
    await db.schema.alterTable('courses', (table) => {
      if (!hasPricingType) {
        table.enu('pricing_type', ['free', 'paid', 'discounted']).notNullable().defaultTo('paid').after('price');
        table.index(['pricing_type']);
      }

      if (!hasDiscountPrice) {
        table.decimal('discount_price', 10, 2).nullable().after('price');
      }
    });
  }

  await db('courses').whereNull('pricing_type').update({ pricing_type: 'paid' });
};
