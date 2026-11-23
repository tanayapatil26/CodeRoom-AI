# Security Policy

## Supported version

The latest version on the default branch is the only version currently supported.

## Reporting a vulnerability

Please do not publish exploitable security details in a public issue. Contact the repository owner privately through the email address listed on their GitHub profile and include:

- A clear description of the issue and its potential impact.
- Steps to reproduce the issue, where safe to do so.
- Any suggested mitigation.

Please allow reasonable time for investigation and a fix before publicly disclosing the issue.

## Deployment precautions

- Never commit `.env` files, API keys, database credentials, or production JWT secrets.
- Use a unique, high-entropy `JWT_SECRET` in every deployed environment.
- Restrict `CLIENT_ORIGIN` to the exact frontend origin(s) you control.
- Use HTTPS/WSS in production and keep dependencies updated.
- Treat code executed in the preview as untrusted user input.
