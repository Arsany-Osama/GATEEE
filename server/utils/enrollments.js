const createOrRestoreEnrollment = async (trx, userId, courseId) => {
  const existing = await trx('enrollments').where({ user_id: userId, course_id: courseId }).first();

  if (existing?.deleted_at) {
    await trx('enrollments').where({ id: existing.id }).update({ deleted_at: null });
    return { enrollmentId: existing.id, action: 'restored' };
  }

  if (existing) {
    return { enrollmentId: existing.id, action: 'existing' };
  }

  const [enrollmentId] = await trx('enrollments').insert({ user_id: userId, course_id: courseId });
  return { enrollmentId, action: 'created' };
};

module.exports = { createOrRestoreEnrollment };
