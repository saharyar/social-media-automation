const dotenv = require("dotenv");
dotenv.config(); // MUST run first, before anything else
const { default: mongoose } = require("mongoose");
//const mongoose = require(mongoose);
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const postRoutes = require("./routes/postRoutes");
const aiRoutes = require("./routes/aiRoutes");
const accountRoutes = require("./routes/accountRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const { startScheduler } = require("./services/scheduler");

connectDB();
startScheduler();

const app = express();
app.set('trust proxy', 1);
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/ai", aiRoutes);
//const holidayRoutes = require("./routes/holidayRoutes");
app.use("/api/accounts", accountRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));