import express, { json } from "express";
import axios from "axios";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

app.use(json());
app.set("json spaces", 2);
app.use(express.static(join(__dirname, "public")));

async function fetchWeatherData(city) {
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1&language=en&format=json`;
  const geoRes = await axios.get(geoUrl);

  if (!geoRes.data.results || geoRes.data.results.length === 0) {
    throw new Error("City not found");
  }

  const { latitude, longitude, name, country } = geoRes.data.results[0];

  // Updated URL to include relative_humidity_2m, surface_pressure, and uv_index
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,surface_pressure,wind_speed_10m,uv_index&timezone=auto`;

  const weatherRes = await axios.get(weatherUrl);
  const current = weatherRes.data.current;

  return {
    location: `${name}, ${country}`,
    coordinates: { latitude, longitude },
    weather: {
      temperature: current.temperature_2m,
      windspeed: current.wind_speed_10m,
      humidity: current.relative_humidity_2m,
      pressure: current.surface_pressure,
      uv_index: current.uv_index,
      weathercode: current.weather_code,
      time: current.time,
    },
  };
}

app.get("/discover", async (req, res) => {
  try {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const geoIpUrl = `http://ip-api.com/json/${ip === "::1" ? "" : ip}`;
    const ipRes = await axios.get(geoIpUrl);
    const city = ipRes.data.city || "London";
    const data = await fetchWeatherData(city);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Discovery failed" });
  }
});

app.post("/weather", async (req, res) => {
  const { city } = req.body;
  try {
    const data = await fetchWeatherData(city);
    res.json(data);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
