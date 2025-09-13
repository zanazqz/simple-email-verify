const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;

// میدل‌ویر
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// دیتابیس SQLite
const db = new sqlite3.Database("./users.db", (err) => {
  if (err) console.error("DB connection error:", err);
  else console.log("✅ Database connected");
});

// ساخت جدول کاربران
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    instagram_connected INTEGER,
    verified INTEGER DEFAULT 0,
    verification_code TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// تنظیمات SMTP برای Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER || "your@gmail.com",
    pass: process.env.SMTP_PASS || "yourpassword"
  }
});

// 📌 ثبت‌نام
app.post("/api/register", (req, res) => {
  const { name, email, password, instagram_connected } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ ok: false, error: "لطفاً همه فیلدها را پر کنید." });
  }

  // بررسی اینکه ایمیل تکراری نباشه
  db.get("SELECT id FROM users WHERE email = ?", [email], (getErr, existing) => {
    if (getErr) {
      console.error("DB error:", getErr);
      return res.status(500).json({ ok: false, error: "خطا در دیتابیس." });
    }
    if (existing) {
      return res.status(400).json({ ok: false, error: "این ایمیل قبلاً ثبت‌نام شده است." });
    }

    // تولید کد تأیید
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`📧 Verification code for ${email} = ${verificationCode}`);

    // ارسال ایمیل
    const mailOptions = {
      from: process.env.SMTP_USER || "your@gmail.com",
      to: email,
      subject: "کد تأیید ثبت‌نام",
      text: `کد فعال‌سازی شما: ${verificationCode}`
    };

    transporter.sendMail(mailOptions, (mailErr) => {
      if (mailErr) {
        console.error("Email error:", mailErr);
        return res.status(500).json({ ok: false, error: "خطا در ارسال ایمیل." });
      }

      // 📌 فقط اگر ایمیل موفقیت‌آمیز بود → ذخیره در دیتابیس
      const query = `
        INSERT INTO users (name, email, password, instagram_connected, verified, verification_code)
        VALUES (?, ?, ?, ?, 0, ?)
      `;
      db.run(query, [name, email, password, instagram_connected ? 1 : 0, verificationCode], function (dbErr) {
        if (dbErr) {
          console.error("DB insert error:", dbErr);
          if (dbErr.code === "SQLITE_CONSTRAINT") {
            return res.status(400).json({ ok: false, error: "این ایمیل قبلاً ثبت‌نام شده است." });
          }
          return res.status(500).json({ ok: false, error: "خطا در ذخیره اطلاعات کاربر." });
        }

        return res.json({ ok: true, message: "ثبت‌نام موفق. لطفاً ایمیل خود را برای کد تأیید بررسی کنید." });
      });
    });
  });
});

// 📌 تأیید کد
app.post("/api/verify-code", (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ ok: false, error: "ایمیل و کد لازم است." });
  }

  db.get("SELECT verification_code FROM users WHERE email = ?", [email], (err, row) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ ok: false, error: "خطا در دیتابیس." });
    }
    if (!row) {
      return res.status(400).json({ ok: false, error: "کاربری با این ایمیل پیدا نشد." });
    }
    if (row.verification_code !== code) {
      return res.status(400).json({ ok: false, error: "کد وارد شده اشتباه است." });
    }

    // آپدیت کاربر به verified
    db.run("UPDATE users SET verified = 1 WHERE email = ?", [email], (updateErr) => {
      if (updateErr) {
        console.error("DB update error:", updateErr);
        return res.status(500).json({ ok: false, error: "خطا در بروزرسانی وضعیت کاربر." });
      }
      return res.json({ ok: true, message: "ایمیل با موفقیت تأیید شد." });
    });
  });
});

// 📌 شروع سرور
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
