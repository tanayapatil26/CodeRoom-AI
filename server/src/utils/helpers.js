const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no look-alike chars

function generateRoomCode(len = 8) {
  const bytes = crypto.randomBytes(len);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

const EXT_LANG = {
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', ts: 'typescript', tsx: 'typescript',
  html: 'html', css: 'css', json: 'json', py: 'python', md: 'markdown', java: 'java',
  c: 'c', cpp: 'cpp', go: 'go', rs: 'rust', sql: 'sql', yml: 'yaml', yaml: 'yaml', sh: 'shell',
};

function languageFromName(name = '') {
  const ext = name.split('.').pop().toLowerCase();
  return EXT_LANG[ext] || 'plaintext';
}

// Wrap async route handlers so errors reach the error middleware.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { generateRoomCode, languageFromName, wrap };
