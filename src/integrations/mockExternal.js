const { config } = require("../config/env");
const { withTimeout } = require("../utils/withTimeout");
const { sleep } = require("../utils/sleep");

function jitter(ms) {
  return Math.max(5, Math.floor(ms * (0.6 + Math.random() * 0.8)));
}

async function simulatedNetworkCall(action, payload, opts = {}) {
  const { minLatencyMs = 30, maxLatencyMs = 120, failureRate = 0.05 } = opts;
  const latency = minLatencyMs + Math.floor(Math.random() * (maxLatencyMs - minLatencyMs + 1));

  const run = (async () => {
    await sleep(jitter(latency));
    if (Math.random() < failureRate) {
      const err = new Error(`${action} failed`);
      err.code = "EXTERNAL_FAILURE";
      throw err;
    }
    return { ok: true, action, received: payload };
  })();

  return withTimeout(run, config.externalCallTimeoutMs, "EXTERNAL_TIMEOUT");
}

const pushProvider = {
  sendWelcome: (token, name) =>
    simulatedNetworkCall("push.sendWelcome", { token, name }, { failureRate: 0.03 }),
  sendPurchaseSuccess: (token, planId) =>
    simulatedNetworkCall("push.sendPurchaseSuccess", { token, planId }, { failureRate: 0.03 }),
};

const emailService = {
  sendPurchaseConfirmation: (to, planId, amount) =>
    simulatedNetworkCall(
      "email.sendPurchaseConfirmation",
      { to, planId, amount },
      { failureRate: 0.02 }
    ),
};

const analytics = {
  track: (event) => simulatedNetworkCall("analytics.track", event, { failureRate: 0.02 }),
  trackBatch: (events) =>
    simulatedNetworkCall(
      "analytics.trackBatch",
      { count: events.length, events },
      { minLatencyMs: 80, maxLatencyMs: 180, failureRate: 0.02 }
    ),
};

const crm = {
  upsertContact: (email, name, source) =>
    simulatedNetworkCall("crm.upsertContact", { email, name, source }, { failureRate: 0.04 }),
  triggerCampaign: (userId, campaignId) =>
    simulatedNetworkCall("crm.triggerCampaign", { userId, campaignId }, { failureRate: 0.04 }),
};

const revenue = {
  capture: (userId, amount, currency, event) =>
    simulatedNetworkCall(
      "revenue.capture",
      { userId, amount, currency, event },
      { failureRate: 0.03 }
    ),
};

module.exports = { pushProvider, emailService, analytics, crm, revenue };

