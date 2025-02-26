import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchSingleStockInfo,
  fetchSingleStockNews,
  fetchSingleStockTickerPriceInfo,
  fetchSingleStockOpenCloseInfo,
  selectSingleStock,
} from "./singleStockViewSlice.js";
import { addWatchListItem } from "../home/watchListView/watchListViewSlice.js";
import SearchBar from "../searchBar/index.js";
import { useParams } from "react-router-dom";
import VolumeChartPage from "../JaimeTest/VolumeChartPage.js";
import StockData from "../JaimeTest/StockData.js";
import ClosePriceChartPage from "../JaimeTest/ClosePriceChartPage";
// import Chatbot from "../chatBot/index.js";
import Buy from "./buy.js";
import Sell from "./sell.js";
import { fetchUserPortfolio } from "./portfolioBuySellSlice.js";
import ChatbotWrapper from "../chatBot/chatBotWrapper.js";

export default function SingleStockView() {
  const username = useSelector((state) => state.auth.me.first_name);
  const displayedName = username.toUpperCase();
  const dispatch = useDispatch();
  const { ticker } = useParams();
  const id = useSelector((state) => state.auth.me.id);
  const singleStockInfo = useSelector(selectSingleStock);
  const [transactionStatus, setTransactionStatus] = useState(null);
  const [userPortfolio, setUserPortfolio] = useState([]);
  const [userBalance, setUserBalance] = useState(0);
  const [prevTicker, setPrevTicker] = useState(ticker);
  const [isLoading, setIsLoading] = useState(true);
  const [tickerNews, setTickerNews] = useState([]);
  const [tickerInfo, setTickerInfo] = useState({});
  const [tickerPriceInfo, setTickerPriceInfo] = useState({});
  const [currentChart, setCurrentChart] = useState("stockData");
  const [marketOpen, setMarketOpen] = useState("");
  // const allState = useSelector((state) => state);
  // //console.log("All state:", allState);
  const handleTransactionComplete = (status) => {
    setTransactionStatus(status);
  };

  useEffect(() => {
    if (prevTicker !== ticker) {
      // Refresh the page only if the `ticker` parameter changes
      window.location.reload();
    }
    // Update the previous ticker value
    setPrevTicker(ticker);
  }, [ticker, prevTicker]);

  //console.log(id);

  useEffect(() => {
    const fetchInfoToRender = async () => {
      // const priceInfo = await getStockInfo(ticker);
      const portfolioInfo = await dispatch(fetchUserPortfolio({ userId: id }));
      //console.log(portfolioInfo.payload);
      const tickerSpecificPortfolio = portfolioInfo.payload.portfolio.filter(
        (portfolioItem) => portfolioItem.stockTicker === ticker
      );
      //console.log(tickerSpecificPortfolio);
      await setUserPortfolio(tickerSpecificPortfolio);
      await setUserBalance(portfolioInfo.payload.latestBalance);

      // await //console.log(priceInfo.results);

      // setTickerPriceInfo(priceInfo.results[0].c.toFixed(2));
      // //console.log(setTickerPriceInfo);
      setIsLoading(false);
    };
    fetchInfoToRender();
  }, [transactionStatus]);
  //! tesla is currently hardcoded in until all stocks is working

  const handleImageError = (e) => {
    e.target.onerror = null; // Prevents infinite loop if the default image URL is also broken
    e.target.src = "/404sorryCat.avif";
  };

  //! used nager date api to get public holidays

  const fetchHolidays = async () => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const response = await fetch(
        `https://date.nager.at/api/v3/PublicHolidays/${year}/US`
      );

      //filter holidays because veterans day and comlumbus dont count for stock exchanges, there's only 13 so should be relatively quick
      //got market holiday info from https://www.aarp.org/money/investing/info-2023/stock-market-holidays.html#:~:text=They%20will%20close%20early%2C%20at,after%20Thanksgiving%20and%20Christmas%20Eve.
      //api using: https://date.nager.at/swagger/index.html
      const holidays = await response.json();
      const filteredHolidays = holidays
        .filter(
          (holiday) =>
            holiday.name !== "Veterans Day" && holiday.name !== "Columbus Day"
        )
        .map((holiday) => holiday.date);
      // //console.log(
      //   "🚀 ~ file: index.js:102 ~ fetchHolidays ~ filteredHolidays:",
      //   filteredHolidays
      // );
      return filteredHolidays;
    } catch (error) {
      //console.error("Error fetching holidays:", error);
      return [];
    }
  };

  const getStockInfo = async (ticker) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    let to = `${year}-${month}-${day}`;

    const holidays = await fetchHolidays();
    const estOffset = -4 * 60; // Eastern Time is UTC-5
    const utcOffset = -now.getTimezoneOffset();
    now.setMinutes(now.getMinutes() + estOffset - utcOffset);

    //todo might need to add a check for 15 min delayed data??

    const dayOfWeek = now.getDay(); // 0 is Sunday, 6 is Saturday
    const hour = now.getHours();
    const minute = now.getMinutes();
    //console.log(dayOfWeek, hour, minute);

    // Check if the current date is a holiday
    const isHoliday = holidays.includes(to);

    // Market is open on weekdays between 9:30 AM and 4:00 PM Eastern Time and not a holiday
    const marketOpen =
      dayOfWeek >= 1 &&
      dayOfWeek <= 5 &&
      (hour > 9 || (hour === 9 && minute >= 50)) &&
      hour < 16 &&
      !isHoliday;
    //console.log(marketOpen);
    if (marketOpen) {
      setMarketOpen(true);
    } else {
      setMarketOpen(false);
    }

    const isPreMarket =
      dayOfWeek >= 1 &&
      dayOfWeek <= 5 &&
      hour >= 0 &&
      (hour < 9 || (hour === 9 && minute < 50)) &&
      !isHoliday;

    const getMostRecentTradingDay = (date, marketOpen, isPreMarket) => {
      let newDate = new Date(date);

      if (isPreMarket) {
        newDate.setHours(16);
        newDate.setMinutes(0);
        newDate.setSeconds(0);
        newDate.setMilliseconds(0);
        newDate.setDate(newDate.getDate() - 1);
      }

      let currentMarketOpen = marketOpen || isPreMarket;

      while (!currentMarketOpen) {
        const dayOfWeek = newDate.getDay();
        const hour = newDate.getHours();
        const minute = newDate.getMinutes();
        const isHoliday = holidays.includes(newDate.toISOString().slice(0, 10));

        if (
          hour > 16 ||
          (hour === 16 && minute >= 1) ||
          dayOfWeek === 0 ||
          dayOfWeek === 6 ||
          isHoliday
        ) {
          if (hour > 16 || (hour === 16 && minute >= 1)) {
            // If the hour is past 4 PM, set the newDate to 16:00 (market close)
            newDate.setHours(16);
            newDate.setMinutes(0);
            newDate.setSeconds(0);
            newDate.setMilliseconds(0);
          } else {
            // Move to the previous day
            newDate.setDate(newDate.getDate() - 1);
          }
        } else {
          currentMarketOpen = true;
        }
      }
      return newDate.toISOString().slice(0, 10);
    };

    const from =
      marketOpen || isPreMarket
        ? to
        : getMostRecentTradingDay(now, marketOpen, isPreMarket);
    to = marketOpen || isPreMarket ? to : from;

    // //console.log(marketOpen);
    // //console.log(from, to);
    // Pass marketOpen and from, to to the thunk
    const getTickerPrice = async (ticker) => {
      let tickerPriceInfo = await dispatch(
        fetchSingleStockTickerPriceInfo({ ticker, marketOpen, from, to })
      );
      //save misc info into state
      const response = await dispatch(
        fetchSingleStockOpenCloseInfo({ ticker, to })
      ).unwrap();
      //console.log("Response from fetchSingleStockOpenCloseInfo:", response);
      // await //console.log(tickerPriceInfo);\
      //console.log(tickerPriceInfo.payload);
      return tickerPriceInfo.payload;
    };
    return getTickerPrice(ticker);
  };

  const trimName = (name, maxLength = 30) => {
    if (!name) {
      return "";
    }
    if (name.length > maxLength) {
      return name.slice(0, maxLength) + "...";
    }
    return name;
  };

  const fetchInfoToRender = async () => {
    const info = await dispatch(fetchSingleStockInfo({ ticker }));
    const news = await dispatch(fetchSingleStockNews({ ticker }));

    // await //console.log(info.payload);
    // await //console.log(news.payload);
    // await //console.log(priceInfo);
    setTickerInfo(info.payload);
    setTickerNews(news.payload.results);
    setIsLoading(false);

    // //console.log(tickerInfo);
    // //console.log(tickerNews);
  };

  const fetchPriceInfoToRender = async () => {
    const priceInfo = await getStockInfo(ticker);
    setTickerPriceInfo(priceInfo);
  };

  useEffect(() => {
    fetchInfoToRender();
    fetchPriceInfoToRender();
  }, [dispatch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-t from-slate-800 to-slate-900">
        <div className="lds-roller">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
    );
  }

  const handleAddToWatchList = async (e) => {
    e.preventDefault();
    let ticker = e.target.value;
    //console.log(ticker);
    await dispatch(addWatchListItem({ id, ticker }));
    alert(`Added ${ticker} to watchlist!`);
  };
  const formatNumber = (number) => {
    return (number ?? 0).toFixed(2);
  };

  const totalValue =
    (userPortfolio[0]?.quantity || 0) *
    (tickerPriceInfo?.close ||
      tickerPriceInfo?.results?.[0]?.c ||
      tickerPriceInfo?.preMarket ||
      0);

  // todo maybe make the news section a little smaller 4 ~ etc
  // ! uses clearbit Logo API to get logos
  //! potentially might break during weekdays based on different api calls
  return (
    <div className="font-semibold flex flex-col pt-1 pl-4 pr-4 pb-4 h-screen justify-between max-h-screen singleStock-bg text-white overflow-hidden">
      {/* Header */}
      <div className="flex  items-center mb-2 ">
        <div className="flex items-center">
          <div className="w-10 h-10 overflow-visible rounded-md mr-4 ">
            <img
              src={`https://logo.clearbit.com/${tickerInfo.homepage_url}`}
              alt="Company Logo"
              onError={handleImageError}
              className="object-cover w-full h-full"
            />
          </div>
          <h2 className=" text-white">{tickerInfo.name}</h2>
        </div>
        <SearchBar name={displayedName} />
      </div>

      {/* Main  */}
      <div className="flex flex-grow space-x-2 h-full max-h-fit">
        <div className="flex flex-col max-h-full h-5/6  space-y-2 pr-2 w-7/12 overflow-y-auto overflow-x-hidden">
          <div>
            <div className="">
              {currentChart === "stockData" && <StockData ticker={ticker} />}
              {currentChart === "volume" && <VolumeChartPage ticker={ticker} />}

              {currentChart === "closePrice" && (
                <ClosePriceChartPage
                  className="close-price-chart"
                  ticker={ticker}
                />
              )}
            </div>

            {/* Buttons to switch charts */}
            <div>
              <button
                className="chart-button"
                onClick={() => setCurrentChart("stockData")}
              >
                Stock Data
              </button>
              <button
                className="chart-button"
                onClick={() => setCurrentChart("volume")}
              >
                Volume Chart
              </button>
              <button
                className="chart-button"
                onClick={() => setCurrentChart("closePrice")}
              >
                2-Hour Price Chart (Delayed)
              </button>
              <button className="chart-button" onClick={fetchPriceInfoToRender}>
                Refresh Price Data
              </button>
            </div>
          </div>

          <h3 className="">{tickerInfo.ticker}</h3>

          <div className="grid grid-cols-3 gap-1">
            <div>
              <strong>
                Price:{" $"}
                {formatNumber(
                  tickerPriceInfo?.close ??
                    tickerPriceInfo?.results?.[0]?.c ??
                    tickerPriceInfo?.preMarket
                )}
              </strong>
            </div>
            <div>
              <strong>
                High:{" $"}
                {formatNumber(
                  tickerPriceInfo?.high ?? singleStockInfo?.openClose?.high
                )}
              </strong>
            </div>
            <div>
              <strong>
                Premarket:{" $"}
                {formatNumber(
                  tickerPriceInfo?.preMarket ??
                    tickerPriceInfo?.open ??
                    singleStockInfo?.openClose?.open
                )}
              </strong>
            </div>
            <div>
              <strong>
                Low:{" $"}
                {formatNumber(
                  tickerPriceInfo?.low ?? singleStockInfo?.openClose?.low
                )}
              </strong>
            </div>
            <div>
              <strong>
                Open:{" $"}
                {formatNumber(
                  tickerPriceInfo?.open ?? singleStockInfo?.openClose?.open
                )}
              </strong>
            </div>
          </div>
          <div className=" max-h-full overflow-auto scroll-style overflow-x-hidden">
            <p className="content-start ">
              Description: {tickerInfo.description}
            </p>
          </div>
        </div>

        {/* News */}
        <div className="  overflow-y-scroll scroll-style  h-5/6 max-h-full w-5/12 border border-sky-800 p-2 rounded-md bg-gradient-to-t from-slate-900 to slate-950 text-white shadow-md shadow-black">
          <h2 className="flex items-center justify-center">News</h2>
          <div>
            {tickerNews && tickerNews.length > 0 ? (
              tickerNews.map((news) => (
                <div
                  key={news.id}
                  className="mb-4 p-4 rounded-lg bg-slate-700 shadow-lg"
                >
                  <h2>
                    <a
                      href={`${news.article_url}`}
                      alt={`link to ${news.title}`}
                      className="w-full h-64 object-cover mb-2 rounded"
                    >
                      {news.title}
                    </a>
                  </h2>
                  <img
                    src={news.image_url}
                    alt="company image"
                    onError={handleImageError}
                    className="w-32 h-32 object-cover"
                  ></img>
                  <div className="text-sky-500">Author: {news.author}</div>
                  <div className="text-sky-500">
                    Published: {news.published_utc.slice(0, 10)}
                  </div>
                </div>
              ))
            ) : (
              <div>Currently no news</div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className=" flex absolute bottom-0 items-center mb-4 footer ">
        {/* <button
          onClick={() => //console.log("Buy functionality")}
          className=" buy-button"
        >
          Buy
        </button>
        <button
          onClick={() => //console.log("Sell functionality")}
          className="sell-button"
        >
          Sell
        </button> */}
        <div className=" mr-2  py-2">
          <Buy
            ticker={ticker}
            name={tickerInfo.name}
            handleTransactionComplete={handleTransactionComplete}
            transactionStatus={transactionStatus}
          />
        </div>
        <div className=" mr-2  py-2 ">
          <Sell
            ticker={ticker}
            name={tickerInfo.name}
            handleTransactionComplete={handleTransactionComplete}
            transactionStatus={transactionStatus}
          />
        </div>

        <button
          value={tickerInfo.ticker}
          onClick={handleAddToWatchList}
          className=" watchlist-button"
        >
          Add to Watchlist
        </button>
        <div className=" own-shares-text">
          {ticker} owned: {userPortfolio[0] ? userPortfolio[0].quantity : "0"}
        </div>
        <div className=" own-shares-text">
          Valuation: {"$ " + totalValue.toFixed(2)}
        </div>

        <div className=" own-shares-text">
          Cash Balance: {"$ " + userBalance.toFixed(2)}
        </div>
      </div>
      <div className="aibot absolute bottom-0 right-0">
        {/* <img
          src="/aiChatRB.png"
          alt="your AI chat assistant"
          className="w-20 h-20"
        ></img> */}
        <ChatbotWrapper ticker={ticker} />
      </div>
    </div>
  );
}

//todo add to watchlist func, stock other info
//todo if market is closed close access to buy sell feature until next day
