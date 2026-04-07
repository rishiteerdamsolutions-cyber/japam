/**
 * Firebase Cloud Function: Budget Alert via Google Cloud Pub/Sub
 *
 * SETUP:
 * 1. Run: firebase init functions (select JavaScript, no ESLint)
 * 2. Copy this file to functions/index.js (replacing the generated one)
 * 3. Run: cd functions && npm install @google-cloud/functions-framework
 * 4. In Google Cloud Console → Billing → Budgets & Alerts:
 *    - Create a budget for your Firebase project
 *    - Add alert thresholds: 50%, 80%, 100%
 *    - Under "Manage notifications" → Connect a Pub/Sub topic
 *    - Create topic: billing-alerts
 * 5. Deploy: firebase deploy --only functions
 * 6. In Google Cloud Console → Pub/Sub → Topics → billing-alerts:
 *    - Add subscription pointing to your Cloud Function trigger
 *
 * ENVIRONMENT VARIABLES (set in Firebase Console → Functions → Configuration):
 *   SLACK_WEBHOOK_URL  - Slack Incoming Webhook URL for #alerts channel
 *   BUDGET_NAME        - Human-readable budget name (e.g. "Japam Firebase Budget")
 *   ALERT_EMAIL        - Optional: email to notify (requires SendGrid/Mailgun setup)
 */

const functions = require('firebase-functions');
const { logger } = require('firebase-functions');

/**
 * Triggered by Google Cloud Budget alert via Pub/Sub.
 * Sends Slack notification when spend reaches alert thresholds.
 */
exports.budgetAlert = functions.pubsub
  .topic('billing-alerts')
  .onPublish(async (message) => {
    let budgetData;
    try {
      const rawData = message.data
        ? Buffer.from(message.data, 'base64').toString()
        : '{}';
      budgetData = JSON.parse(rawData);
    } catch (e) {
      logger.error('Failed to parse budget alert message', { error: e.message });
      return;
    }

    const {
      budgetDisplayName,
      alertThresholdExceeded,
      costAmount,
      costIntervalStart,
      budgetAmount,
      budgetAmountType,
      currencyCode,
    } = budgetData;

    const thresholdPct = alertThresholdExceeded
      ? Math.round(alertThresholdExceeded * 100)
      : null;

    const budgetName =
      budgetDisplayName ||
      process.env.BUDGET_NAME ||
      'Firebase Budget';

    const currency = currencyCode || 'USD';

    const emoji =
      thresholdPct >= 100 ? '🚨' : thresholdPct >= 80 ? '⚠️' : 'ℹ️';

    const severity =
      thresholdPct >= 100 ? 'CRITICAL' : thresholdPct >= 80 ? 'WARNING' : 'INFO';

    const slackMessage = {
      text: `${emoji} *${severity}: Firebase Budget Alert*`,
      attachments: [
        {
          color: thresholdPct >= 100 ? 'danger' : thresholdPct >= 80 ? 'warning' : 'good',
          fields: [
            { title: 'Budget', value: budgetName, short: true },
            { title: 'Threshold Exceeded', value: thresholdPct ? `${thresholdPct}%` : 'Unknown', short: true },
            {
              title: 'Amount Spent',
              value: costAmount != null ? `${currency} ${costAmount.toFixed(2)}` : 'Unknown',
              short: true,
            },
            {
              title: 'Budget Limit',
              value:
                budgetAmount != null && budgetAmountType !== 'LAST_PERIOD_SPEND'
                  ? `${currency} ${budgetAmount.toFixed(2)}`
                  : budgetAmountType || 'Unknown',
              short: true,
            },
            {
              title: 'Billing Period Start',
              value: costIntervalStart
                ? new Date(costIntervalStart.seconds * 1000).toISOString().slice(0, 10)
                : 'Unknown',
              short: true,
            },
            {
              title: 'Action Required',
              value:
                thresholdPct >= 100
                  ? '🛑 INVESTIGATE IMMEDIATELY. Check Firestore reads, Cloud Functions invocations. Consider enabling spend limits.'
                  : thresholdPct >= 80
                  ? 'Review recent traffic spikes. Verify rate limiting is active. Check for unusual API call patterns.'
                  : 'Monitor closely.',
              short: false,
            },
          ],
          footer: 'Google Cloud Billing Alert',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!slackWebhookUrl) {
      logger.warn('SLACK_WEBHOOK_URL not set — budget alert received but not forwarded', {
        threshold: thresholdPct,
        cost: costAmount,
      });
      return;
    }

    try {
      const response = await fetch(slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackMessage),
      });

      if (!response.ok) {
        const text = await response.text();
        logger.error('Slack webhook failed', { status: response.status, body: text });
      } else {
        logger.info('Budget alert sent to Slack', { threshold: thresholdPct, cost: costAmount });
      }
    } catch (e) {
      logger.error('Failed to send Slack notification', { error: e.message });
    }
  });
