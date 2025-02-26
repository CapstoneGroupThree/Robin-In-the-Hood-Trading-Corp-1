import axios from "axios";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export const fetchEntireWatchList = createAsyncThunk(
  "fetchEntireWatchList",
  async (id) => {
    try {
      const watchlist = await axios.get(`/proxy/watchlist/${id}`);
      return watchlist.data;
    } catch (error) {
      ////console.log(error);
    }
  }
);

export const addWatchListItem = createAsyncThunk(
  "addWatchListItem",
  async ({ id, ticker }) => {
    try {
      const updatedWatchlist = await axios.post(`/proxy/watchlist/${id}`, {
        ticker: ticker,
      });
      return updatedWatchlist.data;
    } catch (error) {
      //console.log(error);
    }
  }
);

export const removeWatchListItem = createAsyncThunk(
  "removeWatchListItem",
  async ({ id, ticker }) => {
    try {
      const afterItemDeleteWL = await axios.put(
        `/proxy/watchlist/${id}/${ticker}`
      );
      return { ticker, tickers: afterItemDeleteWL.data.tickers };
    } catch (error) {
      //console.log(error);
    }
  }
);

export const fetchWLSingleStockName = createAsyncThunk(
  "fetchWLStockNameByTicker",
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

export const fetchWLSingleStockTickerPrice = createAsyncThunk(
  "fetchWLStockTickerPrice",
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

export const watchlistStocksViewSlice = createSlice({
  name: "watchlist",
  initialState: {
    watchlist: {},
  },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchEntireWatchList.fulfilled, (state, action) => {
      state.watchlist.list = action.payload.tickers;
    });
    builder.addCase(fetchWLSingleStockName.fulfilled, (state, action) => {
      const ticker = action.payload.ticker;
      if (!state.watchlist[ticker]) {
        state.watchlist[ticker] = {};
      }
      //make sure its loaded or things can look wonky
      state.watchlist[ticker].name = action.payload.results.name;
      if (state.watchlist[ticker].close !== undefined) {
        state.watchlist[ticker].isLoaded = true;
      }
    });
    builder.addCase(
      fetchWLSingleStockTickerPrice.fulfilled,
      (state, action) => {
        const ticker = action.payload.ticker;
        //console.log(action.payload.preMarket);
        if (!state.watchlist[ticker]) {
          state.watchlist[ticker] = {};
        }
        state.watchlist[ticker].close =
          action.payload.close || action.payload.preMarket;
        if (state.watchlist[ticker].name !== undefined) {
          state.watchlist[ticker].isLoaded = true;
        }
      }
    );
    builder.addCase(removeWatchListItem.fulfilled, (state, action) => {
      const ticker = action.payload.ticker;
      state.watchlist.list = action.payload.tickers;

      if (state.watchlist[ticker]) {
        //remove it
        delete state.watchlist[ticker];
      }
    });
    builder.addCase(addWatchListItem.fulfilled, (state, action) => {
      state.watchlist.list = action.payload.tickers;
    });
  },
});

export const selectWatchList = (state) => state.watchlistStocksView.watchlist;

export default watchlistStocksViewSlice.reducer;
