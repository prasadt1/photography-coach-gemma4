/** Minimal JS health check — no TypeScript compile step. */
module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ ok: true, route: 'health-js' });
};
