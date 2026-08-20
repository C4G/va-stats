export default function handler(req, res) {
  res.json({
    host: req.headers.host,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    BETTER_AUTH_RP_ID: process.env.BETTER_AUTH_RP_ID,
    timestamp: new Date().toISOString(),
  });
}
