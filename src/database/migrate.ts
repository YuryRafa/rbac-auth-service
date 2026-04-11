import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pool from "./connection";

const run = async () => {
    const sql = readFileSync(join(__dirname, 'migrations/001_init.sql'), 'utf-8');
    await pool.query(sql);
    console.log("Migration completed successfully.");
    await pool.end();
};

run().catch((err) => {
    console.error('Migration error', err);
    process.exit(1); 
});