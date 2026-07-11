# Shared Database Connection

Use this shared connection module for backend code that needs MySQL.

```js
import { pool, query, execute, transaction, checkDatabase } from "./database/connection.js";
```

From a file inside `server/`, import it like this:

```js
import { query } from "./database/connection.js";

const elders = await query("SELECT * FROM elderly ORDER BY elderly_id");
```

For route files inside subfolders, adjust the relative path:

```js
import { query } from "../database/connection.js";
```

Environment variables are loaded from `.env`:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_SOCKET=/Applications/XAMPP/xamppfiles/var/mysql/mysql.sock
DB_USER=root
DB_PASSWORD=
DB_NAME=eldercare
SERVER_PORT=3001
```

If `DB_SOCKET` is set, it is used instead of `DB_HOST` and `DB_PORT`.
