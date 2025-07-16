require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mysql = require("mysql2/promise");

const app = express();
app.use(cors({ origin: "http://localhost:3000" })); // React app origin
app.use(bodyParser.json());

// MySQL pool for user creation
// MySQL pool for user creation (with environment variable fallbacks)
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root", // fallback to root
  password: process.env.DB_PASSWORD || "", // blank password fallback
  database: process.env.DB_NAME || "task_tracker_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ===== User CRUD =====
// POST /api/add-user
app.post("/api/add-user", async (req, res) => {
  const { name, email } = req.body;
  console.log("Add user payload:", req.body);
  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }
  try {
    const [result] = await pool.execute(
      "INSERT INTO users_tb (Name, Email) VALUES (?, ?)",
      [name, email]
    );
    return res.status(201).json({ userId: result.insertId });
  } catch (err) {
    console.error("MySQL insert error:", err);
    return res.status(500).json({ error: "Database insert failed" });
  }
});

// GET /api/users - list all users
app.get("/api/users", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email FROM users_tb ORDER BY id DESC"
    );
    return res.status(200).json(rows);
  } catch (err) {
    console.error("MySQL select error:", err);
    return res.status(500).json({ error: "Database query failed" });
  }
});

// GET single user
app.get("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email FROM users_tb WHERE id = ?",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("MySQL select error:", err);
    res.status(500).json({ error: "Database query failed" });
  }
});

// UPDATE user
app.put("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }
  try {
    const [result] = await pool.execute(
      "UPDATE users_tb SET name = ?, email = ? WHERE id = ?",
      [name, email, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("MySQL update error:", err);
    res.status(500).json({ error: "Database update failed" });
  }
});

// DELETE /api/users/:id - delete a user
app.delete("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.execute("DELETE FROM users_tb WHERE id = ?", [
      id,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("MySQL delete error:", err);
    return res.status(500).json({ error: "Database delete failed" });
  }
});

// ===== Task CRUD =====
app.post("/api/tasks", async (req, res) => {
  const { title, description, dueDate, assignTo, status } = req.body;
  if (!title || !description || !dueDate || !assignTo || !status) {
    return res.status(400).json({ error: "All task fields are required" });
  }
  try {
    const [result] = await pool.execute(
      "INSERT INTO task_tb (Title, Description, DueDate, AssignTo, Status) VALUES (?, ?, ?, ?, ?)",
      [title, description, dueDate, assignTo, status]
    );
    res.status(201).json({ taskId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create task" });
  }
});

app.get("/api/tasks", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, Title as title, Description as description, DueDate as dueDate, AssignTo as assignTo, Status as status FROM task_tb ORDER BY id DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database query failed" });
  }
});

app.get("/api/tasks/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, Title as title, Description as description, DueDate as dueDate, AssignTo as assignTo, Status as status FROM task_tb WHERE id = ?",
      [req.params.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "Task not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database query failed" });
  }
});

app.put("/api/tasks/:id", async (req, res) => {
  const { title, description, dueDate, assignTo } = req.body;
  if (!title || !description || !dueDate || !assignTo) {
    return res.status(400).json({ error: "All task fields are required" });
  }
  try {
    const [result] = await pool.execute(
      "UPDATE task_tb SET Title = ?, Description = ?, DueDate = ?, AssignTo = ? WHERE id = ?",
      [title, description, dueDate, assignTo, req.params.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Task not found" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update task" });
  }
});

app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const [result] = await pool.execute("DELETE FROM task_tb WHERE id = ?", [
      req.params.id,
    ]);
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Task not found" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// Update task status only
app.put("/api/status/:id", async (req, res) => {
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: "Status is required" });
  }
  try {
    const [result] = await pool.execute(
      "UPDATE task_tb SET Status = ? WHERE id = ?",
      [status, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("MySQL update error:", err);
    res.status(500).json({ error: "Failed to update task status" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
