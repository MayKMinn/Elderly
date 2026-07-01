
  # Frontend Code Generation

  This is a code bundle for Frontend Code Generation. The original project is available at https://www.figma.com/design/Ccl1Shp4Iuu0kmAVXygwNN/Frontend-Code-Generation.

  ## Running the code

  Run `npm i` to install the dependencies.

  For UI-only testing:

  ```bash
  npm run dev
  ```

  Open the Vite localhost URL, usually `http://localhost:5173/`.

  Demo logins:

  ```text
  Admin: admin@eldercare.com / admin123
  Nurse: patricia@eldercare.com / nurse123
  ```

  ## Sending this project to friends

  Send the project folder without `node_modules` and `dist` if possible. Your friend should run:

  ```bash
  npm install
  npm run dev
  ```

  If they want MySQL data too, they need XAMPP/MySQL running and should follow the MySQL setup below.

  ## MySQL setup

  This project already has a local API server that can connect to MySQL. The React app calls `/api`, Vite proxies that to `http://localhost:3001`, and the server reads database settings from `.env`.

  1. Start MySQL. If you use XAMPP, start MySQL from the XAMPP control panel.
  2. Update `.env` if your MySQL user/password is different:

  ```env
  DB_HOST=127.0.0.1
  DB_PORT=3306
  DB_USER=root
  DB_PASSWORD=
  DB_NAME=eldercare
  SERVER_PORT=3001
  VITE_USE_API=true
  ```

  3. Create the database tables and sample rows:

  ```bash
  /Applications/XAMPP/xamppfiles/bin/mysql -u root < database/schema.sql
  ```

  If your root user has a password, use:

  ```bash
  /Applications/XAMPP/xamppfiles/bin/mysql -u root -p < database/schema.sql
  ```

  4. Start both the API server and React app:

  ```bash
  npm run dev:full
  ```

  Open the UI at the Vite localhost URL, usually `http://localhost:5173/`.

  You can test the API directly at:

  ```bash
  curl http://localhost:3001/api/health
  curl http://localhost:3001/api/profiles
  ```

  Do not put MySQL credentials in React components. Keep them only in `.env` or in your backend.

  Run `npm run dev` to start the UI-only development server. This uses the built-in sample data.

  Run `npm run dev:full` to start both the MySQL API server and the UI.

  ## COBOL backend note

  If you replace the Node/Express server with a COBOL backend later, keep the same API contract:

  - `GET /api/health`
  - `GET /api/profiles`
  - `PUT /api/elderly/:id`
  - `DELETE /api/elderly/:id`

  The frontend should still call `/api/...`; only the backend implementation changes. The COBOL service should connect to MySQL on the server side and return the same JSON shapes that `server/index.js` returns today.
  
