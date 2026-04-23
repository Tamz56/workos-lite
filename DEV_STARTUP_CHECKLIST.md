# WorkOS-Lite Dev Startup Checklist

Follow these steps for a stable local development environment:

1.  **Verify Port 3000 Availability**
    *   Ensure no other processes (like an old `npm run dev`) are occupying port 3000.
    *   *Check:* `lsof -i :3000`

2.  **Start Development Server**
    *   Run `npm run dev` in the root of `workos-lite`.
    *   The command should be: `next dev --webpack -p 3000`

3.  **Local Verification**
    *   Open [http://localhost:3000](http://localhost:3000) in your browser.
    *   Confirm the dashboard loads and you are prompted for login if necessary.

4.  **Remote Verification (Tunnel)**
    *   Ensure your Cloudflare Tunnel is running.
    *   Open [https://app.greenfineness.com](https://app.greenfineness.com).
    *   Verify that HMR (Fast Refresh) works correctly (the `allowedDevOrigins` setting in `next.config.ts` handles this).

5.  **Database Connection**
    *   Verify `workos.db` exists in the root.
    *   If you see "Table not found" errors, run `node run_migration.js`.
