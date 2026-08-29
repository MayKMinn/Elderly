# ElderEase

ElderEase is a web application for managing elderly care operations. It provides an admin portal, nurse/caregiver interfaces, resident profiles, medication and schedule management, and reporting. The project includes a Vite + React frontend and a Node/Express backend that uses MySQL for persistence.

## Features
- Admin and nurse portals
- Resident profile management (create, edit, delete)
- Schedules, medications, and reports
- Audit / login history
- API-first design (easy to replace backend implementation)

## Tech stack
- Frontend: React (Vite), TypeScript
- Backend: Node.js, Express
- Database: MySQL (schema provided)
- Build tools: pnpm / npm, Vite

## Prerequisites
- Node.js (LTS)
- npm or pnpm
- MySQL (for full backend + data persistence)

## Quick start (development)
1. Install dependencies:

```bash
npm install
# or: pnpm install
```

2. Start the development servers (API + UI):

```bash
npm run dev
```

This runs the backend API and the Vite dev server. Open the app at the Vite URL (commonly http://localhost:5173).

To run the UI in sample-data mode (no MySQL required):

```bash
npm run dev:ui
```

## Environment
The server reads configuration from a `.env` file in the project root. A minimal example:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=eldercare
SERVER_PORT=3001
VITE_USE_API=true
```

Do not commit real credentials to source control.

## Database setup
1. Create the database and tables using the provided schema:

```bash
# macOS XAMPP example
/Applications/XAMPP/xamppfiles/bin/mysql -u root < database/schema.sql
# or, if password protected:
# /Applications/XAMPP/xamppfiles/bin/mysql -u root -p < database/schema.sql
```

2. Confirm the API is healthy:

```bash
curl http://localhost:3001/api/health
```

## Important scripts
- `npm run dev` — Start backend API and Vite dev server
- `npm run dev:ui` — Start frontend with embedded sample data (no database required)
- `npm run build` — Build the frontend for production

## API (examples)
- `GET /api/health` — Health check
- `GET /api/profiles` — List resident profiles
- `PUT /api/elderly/:id` — Update a resident
- `DELETE /api/elderly/:id` — Remove a resident

Keep the frontend calling `/api/...`; the backend implementation can change as long as it preserves the same contract.

## Demo accounts
- Admin: use an admin account seeded in the MySQL database
- Nurse: `patricia@elderease.com` / `nurse123` (sample account)

## Contributing
Contributions are welcome. Suggested workflow:

1. Fork the repo
2. Create a feature branch
3. Add tests where appropriate
4. Open a PR with a clear description

Please follow existing code style and run linters/tests before submitting.

## License & Contact
This project does not include a license file. Add a `LICENSE` if you wish to open-source it.

Questions or help? Open an issue in the repository or contact the maintainer.
  
