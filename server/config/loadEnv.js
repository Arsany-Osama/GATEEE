const path = require('path');
const dotenv = require('dotenv');

const serverEnvPath = path.resolve(__dirname, '..', '.env');
const rootEnvPath = path.resolve(__dirname, '..', '..', '.env');

dotenv.config({ path: serverEnvPath });
dotenv.config({ path: rootEnvPath });
