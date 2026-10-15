# Worked example

One summary in the template's shape, at the density a ticket reader needs: each section opens with its conclusion, a file is named only where the reader must go there, and an accepted consequence is stated plainly.

```
**Users stay signed in long after the idle timeout should have logged them out**

**Problem**
Support found accounts still signed in the next morning, well past the 30-minute idle
limit. On shared machines that leaves someone else's session open, so this is a security
exposure, not just a settings bug.

**Root cause**
Nothing distinguishes a user action from a background request. The idle timer resets on
every authenticated HTTP call, and an open dashboard polls for notifications every 60
seconds, so a tab left open refreshes the session forever. Reproduced by leaving a
dashboard open for four hours untouched: the session was still valid and the timer had
never advanced past 60 seconds.

**Fix**
Reset the idle timer only on user-initiated requests:
1. Mark background endpoints (polling, health, telemetry) with a header the client sets.
2. In the session middleware, skip the timer reset when that header is present.
3. Keep the hard maximum-session cap unchanged, so a used session still expires eventually.
Untouched: the timeout value, the login flow, and the remember-me cookie.

**Scope of code change**
- New `src/auth/activity.js` deciding whether a request counts as activity.
- Three-line change in the session middleware; one header added in the API client.
- Unit tests for the classifier, one integration test for the idle path.

**Expected behaviour after**
- An idle tab logs out at 30 minutes even with polling running.
- Active use still refreshes the session as before.
- Accepted: someone reading one long page for 30 minutes without clicking is logged out.

**Before release**
Ship the client change first, or deploy both together. Server-only leaves old clients
sending no header, which would treat polling as activity and change nothing.

**Follow-ups (separate ticket)**
Warn the user a minute before expiry instead of logging out silently; audit the other
three services that share this session middleware.
```
