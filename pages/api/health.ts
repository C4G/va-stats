/*
Lightweight liveness endpoint used by the Docker/Coolify healthcheck.
Intentionally does NOT touch the database so the container can report
healthy independently of the external MySQL connection.
*/

export default function handler(req, res) {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
}
