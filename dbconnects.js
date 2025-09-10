const mongoose = require("mongoose");

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000, // يقلل انتظار الاتصال
    };

    cached.promise = mongoose.connect(process.env.MONGO_URL, opts).then((mongoose) => {
      console.log("MongoDB Connected");
      return mongoose;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = dbConnect;
