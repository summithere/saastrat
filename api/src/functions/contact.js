// Azure Function (Node.js, v4 programming model): POST /api/contact
// Runs as the managed API of an Azure Static Web App.
// Validates the contact form and emails it to you via
// Azure Communication Services (ACS) Email.
//
// Application settings (set in the Static Web App > Environment variables):
//   ACS_CONNECTION_STRING  connection string of your Communication Services resource
//   SENDER_ADDRESS         e.g. DoNotReply@<something>.azurecomm.net
//   RECIPIENT_ADDRESS      the inbox that should receive messages

const { app } = require('@azure/functions');
const { EmailClient } = require('@azure/communication-email');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

function reply(request, wantsJson, ok, error, status) {
  if (wantsJson) {
    return {
      status: status || (ok ? 200 : 400),
      jsonBody: ok ? { ok: true } : { ok: false, error },
    };
  }
  // Fallback for browsers without JavaScript: send them back to the page.
  const url = new URL(request.url);
  url.pathname = '/';
  url.search = ok ? '?sent=1' : '?sent=0';
  url.hash = 'contact';
  return { status: 303, headers: { Location: url.toString() } };
}

async function handler(request, context) {
  const type = request.headers.get('content-type') || '';
  const wantsJson = type.includes('application/json');

  let data;
  try {
    data = wantsJson ? await request.json() : Object.fromEntries(await request.formData());
  } catch {
    return reply(request, wantsJson, false, 'The form could not be read.');
  }

  // Honeypot: real visitors never fill this hidden field. Pretend success for bots.
  if (clean(data.website, 200)) return reply(request, wantsJson, true);

  const name = clean(data.name, 200);
  const email = clean(data.email, 254);
  const company = clean(data.company, 200);
  const message = clean(data.message, 5000);

  if (!name || !message) {
    return reply(request, wantsJson, false, 'Please fill in your name and a message.');
  }
  if (!EMAIL_RE.test(email)) {
    return reply(request, wantsJson, false, 'Please enter a valid email address.');
  }

  const { ACS_CONNECTION_STRING, SENDER_ADDRESS, RECIPIENT_ADDRESS } = process.env;
  if (!ACS_CONNECTION_STRING || !SENDER_ADDRESS || !RECIPIENT_ADDRESS) {
    context.error('Contact form is missing ACS_CONNECTION_STRING, SENDER_ADDRESS or RECIPIENT_ADDRESS.');
    return reply(request, wantsJson, false, 'The contact form is not configured yet.', 500);
  }

  const body = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Company: ${company || '-'}`,
    '',
    message,
    '',
    `Sent from the SaaStrat website at ${new Date().toISOString()}`,
  ].join('\n');

  try {
    const client = new EmailClient(ACS_CONNECTION_STRING);
    // beginSend queues the email; we don't wait for final delivery.
    await client.beginSend({
      senderAddress: SENDER_ADDRESS,
      recipients: { to: [{ address: RECIPIENT_ADDRESS }] },
      replyTo: [{ address: email, displayName: name }],
      content: {
        subject: `Website message from ${name}${company ? ' (' + company + ')' : ''}`,
        plainText: body,
      },
    });
  } catch (err) {
    context.error('Sending contact email failed:', err && err.message);
    return reply(request, wantsJson, false, 'Sorry, the message could not be sent. Please email us directly.', 502);
  }

  return reply(request, wantsJson, true);
}

app.http('contact', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler,
});

module.exports = { handler };
