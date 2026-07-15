const { signCertificate } = require('../services/certificates');

exports.up = async (db) => {
  const certificates = await db('certificates').select(
    'id',
    'uuid',
    'user_id',
    'course_id',
    'issued_at',
    'hmac_signature'
  );

  for (const certificate of certificates) {
    const expectedSignature = signCertificate(certificate);
    if (certificate.hmac_signature !== expectedSignature) {
      await db('certificates')
        .where({ id: certificate.id })
        .update({ hmac_signature: expectedSignature });
    }
  }
};

