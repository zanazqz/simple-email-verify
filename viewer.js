const sqlite3 = require("sqlite3").verbose();
const Table = require("cli-table3"); // 📌 نیاز به نصب دارد: npm install cli-table3

// اتصال به دیتابیس
const db = new sqlite3.Database("./users.db", (err) => {
  if (err) {
    console.error("❌ خطا در اتصال به دیتابیس:", err);
  } else {
    console.log("✅ اتصال به دیتابیس برقرار شد.");
  }
});

// مطمئن می‌شیم جدول users وجود داشته باشه
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
`, (err) => {
  if (err) {
    console.error("❌ خطا در ساخت جدول:", err);
    return;
  }

  console.log("✅ جدول users آماده است.");

  // حالا داده‌ها رو می‌خونیم
  db.all("SELECT * FROM users", [], (err, rows) => {
    if (err) {
      console.error("❌ خطا در خواندن داده‌ها:", err);
    } else if (rows.length === 0) {
      console.log("ℹ️ هیچ کاربری در دیتابیس وجود ندارد.");
    } else {
      // 📋 جدول زیبا با cli-table3
      const table = new Table({
        head: ["ID", "Name", "Email", "Password", "Insta Connected", "Verified", "Code", "Created At"],
        colWidths: [5, 15, 25, 15, 18, 10, 10, 20]
      });

      rows.forEach((row) => {
        table.push([
          row.id,
          row.name || "-",
          row.email,
          row.password || "-",
          row.instagram_connected ? "Yes" : "No",
          row.verified ? "✅" : "❌",
          row.verification_code || "-",
          row.created_at
        ]);
      });

      console.log(table.toString());
    }

    // اتصال رو می‌بندیم
    db.close();
  });
});
