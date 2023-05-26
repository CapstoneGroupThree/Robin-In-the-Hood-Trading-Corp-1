"use strict";

const {
  db,
  models: { User, Watchlist, Ticker },
} = require("../server/db");
const axios = require("axios");
require("dotenv").config();

/**
 * seedTickers - this function fetches ticker data and populates the Ticker table.
 */
async function seedTickers() {
  try {
    const response = await axios.get(
      `https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/2023-01-09?adjusted=true&apiKey=${process.env.API_KEY}`
    );
    const tickerData = response.data.results;
    await db.transaction(async (transaction) => {
      await Promise.all(
        tickerData.map(async (tickerObject) => {
          await Ticker.create({
            symbol: tickerObject.T,
          });
        })
      );
    });
    console.log("Ticker data seeded successfully!");
  } catch (error) {
    console.error("Error fetching ticker data:", error);
  }
}

/**
 * seed - this function clears the database, updates tables to
 *      match the models, and populates the database.
 */
async function seed() {
  await db.sync(); // clears db and matches models to tables
  console.log("Database synced!");

  try {
    await seedTickers();
    // Add other seed functions here if needed
    // await seedUsers();
    // await seedWatchlists();
    console.log("Seeding completed!");
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
}

// Run the seed function
seed();
