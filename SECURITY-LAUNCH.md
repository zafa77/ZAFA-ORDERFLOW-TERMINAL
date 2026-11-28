# ZAFA V0.39 — Security, privacy and launch runbook

## Status / scope
The current browser app has no user accounts or cloud sync. The account schema and
server-side rights function are prepared, not deployed. The public development
preview must not be presented as a GDPR-certified product. All new code uses
free/open tooling; no billing plan, domain or provider account was created.

## 1. Source and hosting
- GitHub remains the source of truth. Keep the public repo free of credentials
  and personal data. Enable GitHub secret scanning and push protection in repo
  Settings > Security; turn on MFA on administrator accounts; review collaborators
  and protected branches. Rotate any exposed credential immediately, even if a
  commit is reverted. Review historical commits and GitHub's actual secret alerts.
- Cloudflare Pages: connect the GitHub repo, production branch main, framework None,
  build command `node scripts/build.mjs`, output directory `dist`, use Node 22+.
  Do NOT use repository root as the deployment directory.
  The build copies only explicit public assets; it does not inject environment
  variables, backend functions, SQL, documentation, credentials or .git files.
  The static _headers file sets CSP, anti-framing, MIME protection, referrer policy,
  permission policy and HTTPS HSTS. Verify actual response headers after deployment.
- GitHub Pages cannot apply Cloudflare _headers. CSP/referrer meta tags apply there,
  but anti-framing/HSTS and other HTTP headers must be verified on production.
  GitHub Pages is a development preview, not the commercial SaaS host.
- The script policy forbids inline JS/eval and external JS; inline styles remain
  allowed for current Canvas/UI layouts. connect-src allows only observed public
  market endpoints; Academy/privacy have no network connections. If a data provider
  changes endpoints, verify and explicitly add only the exact necessary origin.
- Current code is split into terminal.js, liquidity-app.js, academy-app.js; update
  those JS files for behavior changes. Do not reintroduce inline script/event attributes.
- Test live WS/REST feeds, market switching, replay imports/exports, alerts/audio,
  Ctrl-select/Delete, drawings, privacy page and Academy on desktop/mobile under
  actual browser CSP. Review network console for violations.

## 2. Configure Supabase (owner access required)
- Create an isolated development project in an EU region, confirm current free
  plan limits and provider DPA. Do not upgrade or enable billable usage without approval.
- In staging, apply supabase/migrations/202611280001_zafa_user_state.sql as administrator.
  Run supabase/tests/rls_isolation.sql in staging (not production); confirm all tests
  pass and inspect Security Advisor. Test with actual two user JWTs through Data API.
- Schema stores six bounded JSON-object scopes only. RLS verifies authenticated
  user_id AND an existing, unexpired server-side session. Anonymous users and
  third-party OAuth client tokens are denied. On account deletion the FK cascades.
  Never store secrets, passwords, raw market archives, payment data or real orders.
  JSON payload is untrusted: validate structure before any import into live UI.
- No login UI or automatic cloud sync is enabled by this update; add the
  authentication client with PKCE and validated scope-specific import/sync before
  enabling accounts. Keep browser guest state separate from account state and
  separate each account on sign-out; never implicitly upload local notes/journals.
- Configure Auth: confirm emails, strong password requirements, rate limits and
  CAPTCHA/bot protection as appropriate; no anonymous sign-in. Restrict exact
  production and staging redirect URLs. Configure Google OAuth client ID and
  secret in provider dashboards, not GitHub. Configure custom SMTP, disable email
  link tracking, check SPF/DKIM/DMARC and reset/confirmation links. Use short JWT
  expiry (e.g. 10–15 minutes, check provider guidance) and session revocation;
  MFA for administrators. Do not use wildcard OAuth redirects in production.
- Public browser configuration may contain ONLY the project URL and publishable
  key after real project creation, never a secret/service-role key. Update CSP
  connect-src explicitly for that one project; do not allow *.supabase.co.
  Google OAuth secret, SMTP secret and Supabase admin key remain in provider
  secret storage. Never paste them into chat or put them in a Pages build variable
  that is embedded in the site. No app passwords or real exchange keys required.

## 3. Account export / deletion (staging first)
- Deploy supabase/functions/account-rights/index.ts as an Edge Function with the
  supplied function config. The gateway check is disabled to support modern keys;
  the handler authenticates the user JWT against Supabase Auth and validates an
  active server-side session through SQL. It never trusts a supplied user ID.
- Set ZAFA_ALLOWED_ORIGINS to exact HTTPS origins (comma-separated, no trailing slash).
  Leave ZAFA_ACCOUNTS_ENABLED=false until policy, Auth, DB and all tests pass.
  Supabase injects URL, publishable/anon key and secret/service-role key at runtime.
  Modern key maps default entries are preferred; legacy runtime keys are fallback.
  The browser never receives an admin key.
- POST JSON { "action": "export" } with the user's Authorization Bearer JWT;
  the response is no-store JSON containing minimal account metadata and owned rows.
- POST JSON { "action": "delete", "confirm": "DELETE_MY_ACCOUNT" } only after
  explicit user confirmation and a new sign-in within five minutes. Refreshing a
  token alone does not create a new server-side session. Verify actual session
  age and expiry on staging; server-side user deletion cascades user-state records.
  Do not enable external Storage buckets until their ownership/deletion policy exists.
- Test missing/forged/revoked JWT, wrong origin, wrong method, invalid body, stale
  session, two accounts, correct export and full hard delete (including sessions).
  A remaining JWT must not access the deleted account's data. Confirm UI clears
  local session and account data after logout/delete; backups/logs may have lawful
  retention and must be documented. Use provider rate limiting and alerting,
  generic errors, no logging raw tokens, email, payloads or secrets.
- The endpoint is not callable from the current site until actual hosting/auth
  configuration, allowed origin, exact project CSP and UI are connected.
  Do not activate production simply because source code exists.

## 4. GDPR / ePrivacy readiness checklist
Before launch, complete and approve the following as the controller:
- Legal name, address, dedicated privacy email, controller/processor roles and DPO
  if required. No fabricated company details. Establish data-processing register,
  purpose, Article 6 legal bases, recipients, processors, international transfers
  and safeguards, data retention and backup expiry. Execute DPAs with processors
  and document exchange/hosting data flows and any transfer assessments.
- Article 13 notice: current privacy.html is a development/local-mode notice;
  finalize it with the above details, account data, provider roles, rights process,
  legal bases and actual retention periods before collecting accounts. Translate
  for other target users if needed. No marketing/tracking by default. Assess
  ePrivacy consent for nonessential cookies and localStorage (including optional
  history/learning features) with Romanian legal advice. Never use a banner as a
  substitute for real consent controls; block nonessential tracking before consent.
- Local rights: privacy.html exports only app preference/personal state keys and
  clears identified localStorage/IndexedDB, after closing other ZAFA tabs. It
  excludes bulky public market archives from export and cannot erase remote logs
  or already-exported files. Provide manual access/rectification/deletion for
  provider logs and any other data not covered by the automated export.
- Set a retention schedule for inactive accounts, backups and logs; implement and
  test the purge before public launch. Decide whether to admit minors; do not
  collect unnecessary demographics. Provide explicit account deletion and export
  UI and separate local-storage controls. Respond to verified rights requests
  generally within one month under Article 12; track exceptions and deadlines.
- Incident response: restrict access, contain, rotate/revoke compromised keys,
  preserve minimal evidence, assess risk, notify ANSPDCP within 72 hours where
  Article 33 requires it, notify affected users without undue delay where Article
  34 requires it, record all incidents. Test recovery and restoration. Review
  whether DPIA or DPO is required. Obtain Romanian/EU legal review.
- Confirm market data redistribution and commercial use licenses separately.
  Public API availability is not a redistribution license. Paper Trading is
  simulation only; no deposits, actual exchange account integration or payments.

## References
- GDPR: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- Romanian authority: https://www.dataprotection.ro/
- Supabase production security: https://supabase.com/docs/guides/security/production-checklist
- Supabase keys: https://supabase.com/docs/guides/getting-started/api-keys
- RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Auth sessions: https://supabase.com/docs/guides/auth/sessions
- Cloudflare headers: https://developers.cloudflare.com/pages/configuration/headers/
- GitHub secret scanning: https://docs.github.com/en/code-security/concepts/secret-security

## Launch gate
No production accounts until a real operator/privacy contact, provider accounts,
DPA/transfer assessment, RLS + endpoint tests, actual browser checks, auth UI and
rights workflows, retention, recovery and legal review are complete. No credentials
in any public artifact. This runbook is a technical readiness package, not legal certification.


## Native Community feedback — preview activation
- community.html uses two native private forms, with one public Formspree form ID in community.js; empty by default. No recipient email or API secret in repository. The public ID is not a credential.
- Create a form at https://formspree.io/ and verify the target inbox. Enable domain restriction and provider spam filtering; test real browser submissions on the actual allowed origin. The free plan is for testing/development, with 50 monthly submissions as of 2026-11-28. Confirm terms and limits before public commercial deployment. Do not enable billing automatically.
- Complete the operator/contact, legal basis, retention and deletion process (provider archive and email copies), data processing agreement and transfer safeguards; update the feedback privacy section to reflect the actual setup before enabling FORM_ID. The optional email is for replies only. Client validation/honeypot are supplemental and not a server-side security boundary.
- Copy only the form ID (not the recipient address or password) into community.js; confirm actual success/error and inbox delivery, spam controls and quota handling. No public forum posting or automatic forwarding to GitHub. Keep feedback disabled until verified.
