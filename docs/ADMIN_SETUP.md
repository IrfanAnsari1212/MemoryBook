# Creating the first admin

There is no public signup. The single admin is created with a local script.

1. Make sure `.env` has `DATABASE_URL`, `DIRECT_URL` and a non-empty `AUTH_SECRET`
   (generate with `openssl rand -base64 48` or
   `node -p "require('crypto').randomBytes(48).toString('base64')"`).
2. Run the script with the credentials passed for that one command only
   (do not save the password in `.env`):

   PowerShell:
   ```powershell
   $env:ADMIN_EMAIL = "you@example.com"; $env:ADMIN_PASSWORD = "a-long-passphrase-12+chars"; npm run admin:create; Remove-Item Env:ADMIN_EMAIL, Env:ADMIN_PASSWORD
   ```

   Bash:
   ```bash
   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-passphrase-12+chars' npm run admin:create
   ```

3. Output is `Admin created.` or `An admin already exists. Nothing to do.`
   The password and hash are never printed. The password must be 12+ characters.
4. Start the app (`npm run dev`) and sign in at `/login`.

Notes
- Production: run the same command once against the production `DATABASE_URL`
  (e.g. from your machine with the production env), then never again.
- Running a production build locally (`next start`) over http://localhost needs
  `AUTH_TRUST_HOST=true`. On Vercel this is automatic.
- Sessions are JWTs in an httpOnly cookie (7 days). Every admin request is
  re-checked against the database, so deleting or demoting the user locks them
  out immediately. Changing `AUTH_SECRET` signs everyone out.

## Forgot your email or password

1. From your machine (with `.env` pointing at the database), run `npm run admin:recovery-key`.
   It needs no email or password and prints a recovery key once. Save it in a password manager.
2. Open `/forgot-password`, enter the key and choose a new email and password (12+ characters).
   The key is single-use: a replacement is shown once on success.
3. While signed in, you can also create or replace the key under Admin → Settings → Recovery key
   (asks for your current password).

Only a SHA-256 hash of the key is stored. Anyone holding the key can take over the admin account, so
keep it private. `npm run admin:reset` is still available to set a new password for a known email.
Existing sessions stay valid until they expire (7 days) or `AUTH_SECRET` is changed.
