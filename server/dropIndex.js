require("dotenv").config();
const mongoose = require("mongoose");

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const result = await mongoose.connection.collection("Users").dropIndex("username_1");
    console.log("Index dropped:", result);

    const deleted = await mongoose.connection.collection("Users").deleteMany({ username: null });
    console.log("Removed bad documents:", deleted.deletedCount);

    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

run();