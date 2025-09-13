const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;

// اتصال به دیتابیس PostgreSQL Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }  // Render نیاز داره
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// تست کانکشن دیتابیس
pool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL"))
  .catch(err => console.error("❌ DB connection error:", err));

// ساخت جدول (اگر وجود نداشت)
const createTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        code VARCHAR(10) NOT NULL,
        verified BOOLEAN DEFAULT false
      )
    `);
    console.log("✅ Users table ready");
  } catch (err) {
    console.error("❌ Error creating table:", err);
  }
};
createTable();

// ثبت ایمیل و کد
app.post("/register", async (req, res) => {
  const { email, code } = req.body;
  try {
    await pool.query(
      "INSERT INTO users (email, code) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING",
      [email, code]
    );
    res.json({ success: true, message: "Email registered" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "DB error" });
  }
});

// تایید کد
app.post("/verify", async (req, res) => {
  const { email, code } = req.body;
  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email=$1 AND code=$2",
      [email, code]
    );

    if (result.rows.length > 0) {
      await pool.query("UPDATE users SET verified=true WHERE email=$1", [email]);
      res.json({ success: true, message: "✅ Verified successfully!" });
    } else {
      res.json({ success: false, message: "❌ Invalid code" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "DB error" });
  }
});

// اجرا
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
