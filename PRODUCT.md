# Product

<!-- impeccable:product-schema 1 -->

## Platform

web (desktop app via Electron; renderer is a React web UI)

## Stack

Electron 34 + electron-vite 3, React 18, TypeScript, Tailwind CSS 4, shadcn/ui (Radix), Recharts, Framer Motion. Package manager: Yarn 4.

## Users and job

- Primary user: the owner, for personal monthly control of what they spend on Uber. Later: other people, each with their own Gmail account (the app must be ready for distribution).
- Situation: opens the app occasionally, picks a month and year, and sees what was spent — total, split by type (trip, Uber Cash top-up, cancelled trip), and each receipt with its details.
- Success: know, in seconds, how much went to Uber in a month and why, without opening dozens of e-mails.

## What the product does

Reads the Uber receipt e-mails (`noreply@uber.com`) from the user's own Gmail over IMAP, extracts the values (total, subtotal, fixed cost, tip, Uber One credit, payment method, driver, rating, distance, duration, pickup and drop-off), and presents them as a table, a breakdown by type and a total. The original e-mail can be viewed inside the app.

## Durable constraints

- Access is by Google app password (requires 2-step verification), typed in the app and stored encrypted by the operating system (Keychain / DPAPI / libsecret). Never stored in plain text, never in the binary. OAuth may come later behind the same `AuthProvider` interface.
- The app only reads Uber receipts; it does not send, change or delete e-mail.
- Receipts contain personal data (addresses, driver names); screenshots for docs use synthetic data.
- The original e-mail HTML is untrusted: shown only in a sandboxed iframe, with scripts and remote images blocked.

## Voice

Brazilian Portuguese, direct and friendly ("Entre com sua conta", "Não conseguimos falar com o Gmail. Confira sua internet."). No technical jargon (no "IMAP", "autenticação", "servidor") in user-facing copy.

## Brand commitments

- The user chose a new, own visual identity (not the stock shadcn/zinc look), starting at the login screen and spreading to the rest of the app later (subproject 4 of the improvement roadmap).
- The product is not affiliated with Uber: do not use Uber's logo, wordmark or brand colours as the app's identity.

## Accessibility

Keyboard-operable throughout; errors announced (`role="alert"`); light and dark themes.
