exports.up = async function up(db) {
  const hasCategories = await db.schema.hasTable('categories');
  if (!hasCategories) {
    await db.schema.createTable('categories', (table) => {
      table.increments('id').unsigned().primary();
      table.string('name', 255).notNullable();
      table.string('arabic_name', 255).nullable();
      table.text('description').nullable();
      table.boolean('is_active').notNullable().defaultTo(true);
      table.integer('display_order').notNullable().defaultTo(0);
      table.timestamp('created_at').notNullable().defaultTo(db.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(db.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['name']);
      table.index(['is_active']);
      table.index(['display_order']);
    });
  }

  const hasInstructors = await db.schema.hasTable('instructors');
  if (!hasInstructors) {
    await db.schema.createTable('instructors', (table) => {
      table.increments('id').unsigned().primary();
      table.string('name', 255).notNullable();
      table.string('arabic_name', 255).nullable();
      table.string('subtitle', 255).nullable();
      table.text('bio').nullable();
      table.string('avatar_url', 1024).nullable();
      table.string('email', 255).nullable();
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('created_at').notNullable().defaultTo(db.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(db.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['is_active']);
    });
  }

  const hasCoupons = await db.schema.hasTable('coupons');
  if (!hasCoupons) {
    await db.schema.createTable('coupons', (table) => {
      table.increments('id').unsigned().primary();
      table.string('code', 64).notNullable();
      table.string('description', 255).nullable();
      table.enu('discount_type', ['percent', 'fixed']).notNullable().defaultTo('percent');
      table.decimal('discount_value', 10, 2).notNullable().defaultTo(0);
      table.integer('max_uses').unsigned().nullable();
      table.integer('used_count').unsigned().notNullable().defaultTo(0);
      table.timestamp('starts_at').nullable();
      table.timestamp('expires_at').nullable();
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('created_at').notNullable().defaultTo(db.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(db.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['code']);
      table.index(['is_active']);
      table.index(['expires_at']);
    });
  }

  const hasCourseCategory = await db.schema.hasColumn('courses', 'category_id');
  const hasCourseInstructor = await db.schema.hasColumn('courses', 'instructor_id');
  const hasCourseThumbnailPublicId = await db.schema.hasColumn('courses', 'thumbnail_public_id');

  if (!hasCourseCategory || !hasCourseInstructor || !hasCourseThumbnailPublicId) {
    await db.schema.alterTable('courses', (table) => {
      if (!hasCourseCategory) {
        table.integer('category_id').unsigned().nullable().after('price');
        table.index(['category_id']);
      }
      if (!hasCourseInstructor) {
        table.integer('instructor_id').unsigned().nullable().after('category_id');
        table.index(['instructor_id']);
      }
      if (!hasCourseThumbnailPublicId) {
        table.string('thumbnail_public_id', 1024).nullable().after('thumbnail_url');
      }
    });
  }

  const uncategorized = await db('categories').where({ name: 'Uncategorized' }).first('id');
  const categoryId = uncategorized?.id || (await db('categories').insert({
    name: 'Uncategorized',
    arabic_name: null,
    description: 'Default category for existing courses.',
    display_order: 999,
  }))[0];

  const defaultInstructor = await db('instructors').where({ name: 'Eng. Ahmed Gamal Elghawy' }).first('id');
  const instructorId = defaultInstructor?.id || (await db('instructors').insert({
    name: 'Eng. Ahmed Gamal Elghawy',
    subtitle: '10+ Years Experience',
    bio: 'Default instructor for existing GATE courses.',
  }))[0];

  await db('courses').whereNull('category_id').update({ category_id: categoryId });
  await db('courses').whereNull('instructor_id').update({ instructor_id: instructorId });
};
