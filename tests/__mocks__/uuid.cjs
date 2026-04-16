// Lightweight mock for the uuid package (ESM-only, not loadable by Jest's CJS transformer)
const crypto = require('node:crypto');
module.exports = {
  v4: () => crypto.randomUUID(),
};
