"use strict";

const path = require("path");

let cachedApp;

/**
 * Lazily build the Express app so a bad first import still returns a usable 500 body.
 */
function getApp() {
  if (cachedApp) return cachedApp;
  const { createApp } = require(path.join(__dirname, "..", "dist", "app.js"));
  cachedApp = createApp();
  return cachedApp;
}

module.exports = function neurosecureHandler(req, res, next) {
  try {
    return getApp()(req, res, next);
  } catch (err) {
    console.error("[neurosecure] api bootstrap failed:", err);
    if (res.headersSent) return;
    res.statusCode = 500;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    const debug =
      process.env.NS_VERBOSE_BOOTSTRAP === "1" ||
      process.env.VERCEL_ENV === "preview";
    res.end(
      debug && err instanceof Error
        ? `${err.message}\n\n${err.stack ?? ""}`
        : "NeuroSecure API failed to start. Check Vercel function logs (env validation, Prisma, or missing dist)."
    );
  }
};
