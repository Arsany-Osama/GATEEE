const GENERIC_ERROR = 'An unexpected error occurred.';

const sendUnexpectedError = (res, error, context = 'Request failed') => {
  console.error(context, error);
  return res.status(500).json({ error: GENERIC_ERROR });
};

const clientIp = (req) => {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket?.remoteAddress || req.ip || '';
};

const countryCode = (req) => {
  const value = req.headers['cf-ipcountry'] || req.headers['x-vercel-ip-country'] || req.headers['x-country-code'];
  return value ? String(value).slice(0, 8).toUpperCase() : null;
};

module.exports = {
  GENERIC_ERROR,
  clientIp,
  countryCode,
  sendUnexpectedError,
};
