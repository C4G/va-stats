export default function handler(req, res) {
  res.json({
    host: req.headers.host,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    timestamp: new Date().toISOString(),
  });
}
