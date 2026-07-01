import mysql from "mysql2/promise";
import "dotenv/config";

const connectionConfig = process.env.DB_SOCKET
  ? { socketPath: process.env.DB_SOCKET }
  : {
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 3306),
    };

export const pool = mysql.createPool({
  ...connectionConfig,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "eldercare",
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
});

export async function checkDatabase() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}
