const { serwist } = require("@serwist/next/config");

module.exports = serwist({
  swSrc: "service-worker.ts",
  swDest: "public/sw.js",
});
