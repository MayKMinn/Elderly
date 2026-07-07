import mysql from "mysql2/promise";
import "dotenv/config";

const defaultSocketPath = "/Applications/XAMPP/xamppfiles/var/mysql/mysql.sock";
const useSocket = Boolean(process.env.DB_SOCKET) || !process.env.DB_HOST || process.env.DB_HOST === "localhost" || process.env.DB_HOST === "127.0.0.1";

const connectionConfig = useSocket
  ? { socketPath: process.env.DB_SOCKET || defaultSocketPath }
  : { host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306) };

export const databaseConfig = {
  ...connectionConfig,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "eldercare",
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  namedPlaceholders: true,
};

export const pool = mysql.createPool(databaseConfig);

export async function query(sql, params) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function execute(sql, params) {
  const [result] = await pool.execute(sql, params);
  return result;
}

export async function transaction(callback) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function checkDatabase() {
  const connection = await pool.getConnection();

  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}
