# Security policy

## Reporting a vulnerability

Please do **not** report a security problem in a public issue, pull request or
forum post.

Report it privately through GitHub instead: open the **Security** tab of this
repository, then **Report a vulnerability**.

No such button? Private reporting is not enabled yet: open an issue that only
asks the maintainers for a private contact, without any detail of the problem,
and send the report there.

Include, when you can:

- the version of the integration and of Gladys;
- what an attacker can do, and the steps to reproduce it;
- the log lines that help (remove tokens, passwords and addresses first).

The fix ships as a new version of the integration, and the advisory is
published once users can update.

## Supported versions

Only the latest release receives security fixes: update the integration from
Gladys before reporting a problem.

## Scope

In scope: the code of this repository and the Docker image it publishes.

What the integration stores and exchanges:

- `/data/school-holidays.json`: the school holidays of the chosen zone (public dates). Nothing personal,
  no secret: the integration asks for no account, no password and no API key.
- Gladys: the integration only sees the users who enabled it (selector, first name, language) and the
  calendars it created itself, never the other calendars of Gladys.
- Network: holidays are computed locally. Only when a French school zone is chosen, one HTTPS request a
  day at most goes to `data.education.gouv.fr`, without any identifier.

Out of scope: Gladys Assistant itself (see its
[security policy](https://github.com/GladysAssistant/Gladys/security/policy)),
the date-holidays library and the open data of the French Education ministry.
