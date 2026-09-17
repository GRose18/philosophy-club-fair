# One free Render service

The combined launcher starts the existing API and website on private loopback ports, waits for both, then exposes the website and `/api/*` through one public port. The existing Postgres database is unchanged. Free Render may still sleep, but there is no second API instance to wake for dashboard requests.

## Safe cutover

Before changing the live website start command, copy these existing API service environment values into the **website** service privately in Render:

- DATABASE_URL (the same existing database)
- SESSION_SECRET (the same value, to preserve signed-in sessions)
- AUTOMATION_KEY (the same value)
- INVITATION_SECRET (the same Apps Script shared secret)
- APP_ORIGIN and PUBLIC_APP_URL = https://philosophy-ews.onrender.com

Do not generate replacement secrets or create a replacement database. Do not paste secrets into chat or commit them.

Set the website start command to `node api/combined-server.mjs` and health check to `/api/health`. Keep its free instance plan. Deploy the tested commit, then verify sign-in, existing assignments, inbox, and file downloads. Do not send test invitations or publish content during verification.

The render.yaml website now uses the combined launcher. Its secret declarations preserve manually configured values. The legacy API definition remains for rollback and automation compatibility.

After verification, inventory any Apps Script or other automation calling the old API address before retiring that service. The combined public API deliberately does not expose automation/import endpoints. Keep the legacy service available until those integrations have a separate migration plan. No service, database, or stored data should be deleted as part of this cutover.
