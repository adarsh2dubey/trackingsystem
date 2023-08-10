const functions = require('firebase-functions');

const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const port = process.env.PORT || 3001;
const bodyParser = require('body-parser');

require('dotenv').config();



const app = express()
app.use(cors())
app.use(express.json());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ extended: true }));

//Connection with stop table
const stop_tables = require("./models/stop_schema.js");

//Connection with tarcking_system table
const tracking_systems = require("./models/tracking_system.js");

// Connection with mongodb

const mongodbUrl = process.env.MONGODB_URL;

mongoose.connect(mongodbUrl, {
  useNewUrlParser: true
}).catch(error => console.error(error));

//let's check mongodb connection
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error: "));
db.once("open", function () {
  console.log("Connected successfully");
});


//*******************Implementation of Some common  function ***************************

const getDataFromTable = async (device_id) => {
  try {
    const result = await stop_tables.findOne({ device_id: device_id })
    console.log("Data fetch from stop table", result)
    return result;
  } catch (error) {
    // Handle errors
    console.log(error)
    return null
  }

}
function calculateDistance(lat1, lon1, lat2, lon2) {
  const earthRadiusInKm = 6371; // Earth's radius in kilometers

  // Convert latitude and longitude from degrees to radians
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lon1Rad = (lon1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const lon2Rad = (lon2 * Math.PI) / 180;

  // Haversine formula
  const dLat = lat2Rad - lat1Rad;
  const dLon = lon2Rad - lon1Rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = earthRadiusInKm * c;

  return distance;
}

// Function to calculate the time difference in hours between two timestamps
function calculateTimeDifferenceInHours(time1, time2) {
  // Convert time strings to seconds
  const time1Array = time1.split("-").map(Number);
  const time1Seconds = time1Array[0] * 3600 + time1Array[1] * 60 + time1Array[2];
  
  const time2Array = time2.split("-").map(Number);
  const time2Seconds = time2Array[0] * 3600 + time2Array[1] * 60 + time2Array[2];

  // Calculate time difference in seconds
  const timeDifferenceInSeconds = Math.abs(time2Seconds - time1Seconds);

  // Convert time difference to hours
  const timeDifferenceInHours = timeDifferenceInSeconds / 3600;

  return timeDifferenceInHours;
}

//Convert time in proper format
function convertDecimalToTime(decimalTime) {
  const totalMinutes = Math.round(decimalTime * 60);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const seconds = Math.round((decimalTime * 3600) % 60);

  let timeString = '';
  if (hours > 0) {
    timeString += `${hours}hr `;
  }
  if (minutes > 0) {
    timeString += `${minutes} minute `;
  }
  if (seconds > 0) {
    timeString += `${seconds} second`;
  }

  return timeString.trim();
}
//Check if timestamp is valid or not
function isValidTimestamp(time) {
  const timeRegex = /^([01]\d|2[0-3])-([0-5]\d)-([0-5]\d)$/;
  return timeRegex.test(time);
}
//check if latitude  is valid
function isValidLatitude(latitude) {
  const regex = /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?)$/;
  return regex.test(latitude);
}

//check if longitude is valid
function isValidLongitude(longitude) {
  const regex = /^[-+]?([1]?[0-7]?\d(\.\d+)?|180(\.0+)?)$/;
  return regex.test(longitude);
}



//****************  API calls ***************/


app.get('/postData', async (req, res) => {

  try {
    console.log("Data sent through post method", req.query)
    const data = req.query;
    const device_id = data.device_id;
    const current_timestamp = data.current_timestamp;
    const [lat1, long1] = data.co_ordinate.split(',');

  

    if (!isValidTimestamp(current_timestamp)) {
      console.log("Invalid Input from User")
      return res.status(400).json({ error: 'Timestamp is not valid, make sure to keep it in {hh-mm-ss} format' });
    }

    if (!isValidLatitude(lat1) || !isValidLongitude(long1)) {
      console.log("Invalid Input from User")
      return res.status(400).json({ error: 'Invaild Co-ordinate' });
    }

    //Fetching from stop table
    const getInitialData = await getDataFromTable(device_id);

    //Checking if data from stop table is valid or null
    if (getInitialData === null) {
      console.log("Error while fetching data from stop table")
      return res.status(500).json({ error: 'Something went wrong' });
    }
    const [lat2, long2] = getInitialData.co_ordinate;

    const distance = calculateDistance(lat1, long1, lat2, long2);

    const initial_timestamp = getInitialData.initialTime


    if (!isValidTimestamp(initial_timestamp)) {
      console.log("Invalid timestamp from stop table")
      return res.status(500).json({ error: 'Something went wrong' });
    }

    if (!isValidLatitude(lat2) || !isValidLongitude(long2)) {
      console.log("Invalid co_ordinate  from stop table")
      return res.status(500).json({ error: 'Something went wrong' });
    }

    const totaltimetaken = calculateTimeDifferenceInHours(initial_timestamp, current_timestamp)

    const avgspeedInkmPerhr = distance / totaltimetaken
    console.log("Average speed ", avgspeedInkmPerhr, " Km/hr")


    const newData = new tracking_systems({

      time: current_timestamp,
      co_ordinate: [lat1, long1],
      device_id: device_id,
      avg_speed: avgspeedInkmPerhr
    });

    const savedData = await newData.save();
    res.send("Data saved successfully")
  }

  catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }


})


app.get('/getData', async (req, res) => {
  try {
    console.log("fetching data from stop table")

    const result = await getDataFromTable("1");

    // Send the result as the response
    res.json({ "result": result });
  } catch (error) {
    // Handle errors
    console.log(error)
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.get('/estimateTime', async (req, res) => {
  try {

    const mostRecentEntry = await tracking_systems.findOne().sort({ _id: -1 }).limit(1)
    if (mostRecentEntry  === null) {
      console.log("Error while fetching data from stop table")
      return res.status(500).json({ error: 'Something went wrong' });
    }
   
    const resultFromStop = await getDataFromTable(mostRecentEntry.device_id);
 
    if (resultFromStop === null) {
      console.log("Error while fetching data from stop table")
      return res.status(500).json({ error: 'Something went wrong' });
    }
  
    const [lat1, long1] = resultFromStop.dest_co_ordinate
    const [lat2, long2] = mostRecentEntry.co_ordinate

  //Checking co_ordinatess

  if (!isValidLatitude(lat1) || !isValidLongitude(long1) || !isValidLatitude(lat2) || !isValidLongitude(long2)) {
    console.log("Invalid co_ordinates")
    return res.status(500).json({ error: 'Something went wrong' });
  }

    const dist_between = calculateDistance(lat1, long1, lat2, long2)
    const estimatedTime = dist_between / mostRecentEntry.avg_speed

    res.send(convertDecimalToTime(estimatedTime))
  }
  catch (error) {
    console.log(error)
    res.status(500).json({ error: 'Something went wrong' });
  }
})



exports.api = functions.https.onRequest(app);
