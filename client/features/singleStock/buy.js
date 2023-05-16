import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import "./popup.css";
import { fetchSingleStockTickerPriceInfo } from "./singleStockViewSlice.js";
import { fetchUserPortfolio } from "./portfolioBuySellSlice";

const Buy = (props) => {
  const [showPopup, setShowPopup] = useState(false);
  const [quantity, setQuantity] = useState(0);
  const userId = useSelector((state) => state.auth.me.id);
  const dispatch = useDispatch();
  const { ticker, name } = props;
  const [isLoading, setIsLoading] = useState(true);
  const [tickerPriceInfo, setTickerPriceInfo] = useState({});
  const [userPortfolio, setUserPortfolio] = useState([]);
  const [userBalance, setUserBalance] = useState(0);

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
      // console.log(
      //   "🚀 ~ file: index.js:102 ~ fetchHolidays ~ filteredHolidays:",
      //   filteredHolidays
      // );
      return filteredHolidays;
    } catch (error) {
      console.error("Error fetching holidays:", error);
    }
    return [];
  };

  const getStockInfo = async (ticker) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    let to = `${year}-${month}-${day}`;

    const holidays = await fetchHolidays();
    //! UNCHANGE THIS BEFORE MAKING PULL REQUEST
    const estOffset = -10 * 60; // Eastern Time is UTC-5
    //! UNCHANGE THE ABOVE OFFSET
    const utcOffset = -now.getTimezoneOffset();
    now.setMinutes(now.getMinutes() + estOffset - utcOffset);

    //todo might need to add a check for 15 min delayed data??

    const dayOfWeek = now.getDay(); // 0 is Sunday, 6 is Saturday
    const hour = now.getHours();
    const minute = now.getMinutes();
    console.log(dayOfWeek, hour, minute);

    // Check if the current date is a holiday
    const isHoliday = holidays.includes(to);

    // Market is open on weekdays between 9:30 AM and 4:00 PM Eastern Time and not a holiday
    const marketOpen =
      dayOfWeek >= 1 &&
      dayOfWeek <= 5 &&
      (hour > 9 || (hour === 9 && minute >= 30)) &&
      hour < 16 &&
      !isHoliday;
    console.log(marketOpen);

    const isPreMarket =
      dayOfWeek >= 1 &&
      dayOfWeek <= 5 &&
      hour >= 0 &&
      (hour < 9 || (hour === 9 && minute < 30)) &&
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

    // console.log(marketOpen);
    // console.log(from, to);
    // Pass marketOpen and from, to to the thunk
    const getTickerPrice = async (ticker) => {
      let tickerPriceInfo = await dispatch(
        fetchSingleStockTickerPriceInfo({ ticker, marketOpen, from, to })
      );
      //save misc info into state
      // await console.log(tickerPriceInfo);\
      console.log(tickerPriceInfo.payload);
      return tickerPriceInfo.payload;
    };
    return getTickerPrice(ticker);
  };

  useEffect(() => {
    const fetchInfoToRender = async () => {
      const priceInfo = await getStockInfo(ticker);
      const portfolioInfo = await dispatch(fetchUserPortfolio({ userId }));
      console.log(portfolioInfo.payload);
      const tickerSpecificPortfolio = portfolioInfo.payload.portfolio.map(
        (portfolioItem) => {
          if (portfolioItem.stockTicker === ticker) {
            return portfolioItem;
          }
        }
      );
      await setUserPortfolio(tickerSpecificPortfolio);
      await setUserBalance(portfolioInfo.payload.latestBalance);

      await console.log(priceInfo.results);

      setTickerPriceInfo(priceInfo.results[0].c.toFixed(2));
      // or different during after hours
      console.log(setTickerPriceInfo);
      setIsLoading(false);
    };
    fetchInfoToRender();
  }, [dispatch]);
  // todo fetch portfolio
  // todo fetch current price in
  // todo balance redux
  // todo buy redux that sends the post request

  const balance = "100000";
  const maxSliderValue = Math.floor(balance / tickerPriceInfo);

  const handleInputChange = (event) => {
    setQuantity(parseInt(event.target.value));
  };

  const handleBuy = (e) => {
    e.preventDefault();
  };

  if (isLoading) {
    return <div>loading...</div>;
  }

  return (
    <div>
      {console.log(userBalance, userPortfolio)}
      <button
        className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
        onClick={() => setShowPopup(true)}
      >
        Buy
      </button>
      You own: {userPortfolio ? userPortfolio[0]?.quantity : "none"}
      <div>
        {showPopup && (
          <div className="popup-overlay">
            <div className="popup-content">
              <h2>Buy {ticker} Stock</h2>
              <div>Current Price: $ {tickerPriceInfo}</div>
              <div>Current Balance: $ {userBalance} </div>
              <div>{ticker} owned: </div>
              <div>Total Valuation: </div>
              <div>
                <label htmlFor="quantity">Quantity Slider:</label>
                <input
                  type="range"
                  id="quantity-slider"
                  min={0}
                  max={maxSliderValue}
                  value={quantity}
                  onChange={handleInputChange}
                />
                <span>Q: {quantity}</span>
                <div>Cost: {(tickerPriceInfo * quantity).toFixed(2)}</div>
              </div>
              <button onClick={handleBuy}>Buy</button>
              <button onClick={() => setShowPopup(false)}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Buy;
