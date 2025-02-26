import axios from "axios";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export const fetchSinglePopularStockName = createAsyncThunk(
  "fetchPopStockNameByTicker",
  async (ticker) => {
    try {
      const response = await axios.get(
        `/proxy/rde/ticker-details?ticker=${ticker}`
      );
      return { ticker, results: response.data.results };
    } catch (error) {
      //console.log(error);
      return error;
    }
  }
);

export const fetchSinglePopularStockTickerPrice = createAsyncThunk(
  "fetchPopStockTickerPrice",
  async ({ ticker, marketOpen, from, to }) => {
    try {
      //console.log("sent");
      if (marketOpen) {
        //console.log("me?");
        const response = await axios.get(
          `/proxy/mde/aggregates?ticker=${ticker}&from=${from}&to=${to}`
        );
        //console.log(response.data);
        return { ticker, close: response.data.results[0].c };
      } else {
        //console.log("got");
        const response = await axios.get(
          `/proxy/mde/open-close?ticker=${ticker}&date=${to}`
        );
        //console.log(response.data);
        return {
          ticker,
          close: response.data.close,
          preMarket: response.data.preMarket,
        };
      }
    } catch (error) {
      //console.log(error);
      return error;
    }
  }
);

export const popularStocksViewSlice = createSlice({
  name: "popularStocksView",
  initialState: {
    stocks: {},
  },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchSinglePopularStockName.fulfilled, (state, action) => {
      const ticker = action.payload.ticker;
      if (!state.stocks[ticker]) {
        state.stocks[ticker] = {};
      }
      //make sure its loaded or things can look wonky
      state.stocks[ticker].name = action.payload.results.name;
      if (state.stocks[ticker].close !== undefined) {
        state.stocks[ticker].isLoaded = true;
      }
    });
    builder.addCase(
      fetchSinglePopularStockTickerPrice.fulfilled,
      (state, action) => {
        const ticker = action.payload.ticker;
        if (!state.stocks[ticker]) {
          state.stocks[ticker] = {};
        }
        state.stocks[ticker].close =
          action.payload.close || action.payload.preMarket;
        if (state.stocks[ticker].name !== undefined) {
          state.stocks[ticker].isLoaded = true;
        }
      }
    );
  },
});

export const selectSinglePopularStock = (state) =>
  state.popularStocksView.stocks;

export default popularStocksViewSlice.reducer;
