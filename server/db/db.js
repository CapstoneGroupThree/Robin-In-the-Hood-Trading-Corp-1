const Sequelize = require("sequelize");
require("dotenv").config();

const config = {
  url: `${process.env.DATABASE_URL}`,
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
};

const db = new Sequelize(config.url, config);

(async () => {
  try {
    await db.authenticate();
    console.log("Connected to bit.io PostgreSQL database!");
  } catch (error) {
    console.error("Error connecting to the database:", error);
    process.exit(1);
  }
})();

module.exports = db;
