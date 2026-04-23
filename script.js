// ================================
// CITYSCOPE WEATHER - FULL SCRATCH
// Advanced Live Weather + AQI
// Free, No API Key, GitHub Pages safe
// ================================

// APIs (Open-Meteo)
const GEO_SEARCH_API = "https://geocoding-api.open-meteo.com/v1/search";
const GEO_REVERSE_API = "https://geocoding-api.open-meteo.com/v1/reverse";
const WEATHER_API = "https://api.open-meteo.com/v1/forecast";
const AQI_API = "https://air-quality-api.open-meteo.com/v1/air-quality";

// Storage
const STORAGE_LAST = "cityscope_last_place";
const STORAGE_RECENT = "cityscope_recent_places";

// DOM
const loader = document.getElementById("loader");
const errorBox = document.getElementById("errorBox");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const suggestions = document.getElementById("suggestions");
const myLocationBtn = document.getElementById("myLocationBtn");
const refreshBtn = document.getElementById("refreshBtn");
const themeBtn = document.getElementById("themeBtn");
const menuBtn = document.getElementById("menuBtn");
const navMenu = document.getElementById("navMenu");
const clearRecentBtn = document.getElementById("clearRecentBtn");
const recentSearchesEl = document.getElementById("recentSearches");

const rainFx = document.getElementById("rainFx");
const sunFx = document.getElementById("sunFx");
const stormFx = document.getElementById("stormFx");

let currentPlace = null;
let suggestionTimer = null;

// Weather code map
const WEATHER_CODES = {
  0: { label: "Clear Sky", day: "☀️", night: "🌙" },
  1: { label: "Mainly Clear", day: "🌤️", night: "🌙" },
  2: { label: "Partly Cloudy", day: "⛅", night: "☁️" },
  3: { label: "Overcast", day: "☁️", night: "☁️" },
  45: { label: "Fog", day: "🌫️", night: "🌫️" },
  48: { label: "Depositing Rime Fog", day: "🌫️", night: "🌫️" },
  51: { label: "Light Drizzle", day: "🌦️", night: "🌦️" },
  53: { label: "Moderate Drizzle", day: "🌦️", night: "🌦️" },
  55: { label: "Dense Drizzle", day: "🌧️", night: "🌧️" },
  61: { label: "Slight Rain", day: "🌦️", night: "🌧️" },
  63: { label: "Moderate Rain", day: "🌧️", night: "🌧️" },
  65: { label: "Heavy Rain", day: "⛈️", night: "⛈️" },
  66: { label: "Light Freezing Rain", day: "🌧️", night: "🌧️" },
  67: { label: "Heavy Freezing Rain", day: "🌧️", night: "🌧️" },
  71: { label: "Slight Snow", day: "❄️", night: "❄️" },
  73: { label: "Moderate Snow", day: "❄️", night: "❄️" },
  75: { label: "Heavy Snow", day: "❄️", night: "❄️" },
  77: { label: "Snow Grains", day: "❄️", night: "❄️" },
  80: { label: "Rain Showers", day: "🌦️", night: "🌧️" },
  81: { label: "Moderate Showers", day: "🌧️", night: "🌧️" },
  82: { label: "Violent Showers", day: "⛈️", night: "⛈️" },
  85: { label: "Snow Showers", day: "❄️", night: "❄️" },
  86: { label: "Heavy Snow Showers", day: "❄️", night: "❄️" },
  95: { label: "Thunderstorm", day: "⛈️", night: "⛈️" },
  96: { label: "Thunderstorm + Hail", day: "⛈️", night: "⛈️" },
  99: { label: "Severe Thunderstorm", day: "⛈️", night: "⛈️" }
};

// Helpers
const $ = (id) => document.getElementById(id);

function showLoader() {
  loader.classList.remove("hidden-loader");
}
function hideLoader() {
  loader.classList.add("hidden-loader");
}
function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove("hidden");
}
function hideError() {
  errorBox.classList.add("hidden");
}
function updateTimestamp() {
  $("updatedAt").textContent = new Date().toLocaleTimeString();
}
function formatTime(value) {
  if (!value) return "--";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatHour(value) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", hour12: true });
}
function formatDay(value) {
  return new Date(value).toLocaleDateString([], { weekday: "short" });
}
function round(value, digits = 0) {
  if (value == null || isNaN(value)) return "--";
  return Number(value).toFixed(digits);
}
function getWeatherInfo(code, isDay = true) {
  const w = WEATHER_CODES[code] || { label: "Unknown", day: "☁️", night: "☁️" };
  return { label: w.label, icon: isDay ? w.day : w.night };
}
function getClosestIndex(timeArray) {
  const now = new Date();
  let bestIndex = 0;
  let bestDiff = Infinity;
  timeArray.forEach((t, i) => {
    const diff = Math.abs(new Date(t) - now);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = i;
    }
  });
  return bestIndex;
}
function degreesToDirection(deg) {
  if (deg == null || isNaN(deg)) return "--";
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}
function buildPlaceName(place) {
  return [place.name, place.admin1, place.country].filter(Boolean).join(", ");
}
function hideSuggestions() {
  suggestions.classList.add("hidden");
  suggestions.innerHTML = "";
}

// Theme mood
function getMood(code) {
  if ([0, 1].includes(code)) return "SUNNY";
  if ([95, 96, 99].includes(code)) return "STORM";
  if ([51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "RAINY";
  return "CLOUDY";
}
function applyMood(code) {
  const mood = getMood(code);
  $("moodBadge").textContent = mood;

  rainFx.classList.add("hidden");
  sunFx.classList.add("hidden");
  stormFx.classList.add("hidden");

  if (mood === "SUNNY") sunFx.classList.remove("hidden");
  if (mood === "RAINY") rainFx.classList.remove("hidden");
  if (mood === "STORM") {
    rainFx.classList.remove("hidden");
    stormFx.classList.remove("hidden");
  }
}

// Recent searches
function getRecentSearches() {
  return JSON.parse(localStorage.getItem(STORAGE_RECENT) || "[]");
}
function saveRecentSearch(place) {
  const recent = getRecentSearches().filter(p => p.id !== place.id);
  recent.unshift(place);
  localStorage.setItem(STORAGE_RECENT, JSON.stringify(recent.slice(0, 6)));
  renderRecentSearches();
}
function renderRecentSearches() {
  const recent = getRecentSearches();
  if (!recent.length) {
    recentSearchesEl.innerHTML = `<span class="empty-chip">No recent searches yet</span>`;
    return;
  }
  recentSearchesEl.innerHTML = recent.map(place => `
    <span class="recent-chip" data-id="${place.id}">
      ${place.name}
    </span>
  `).join("");

  document.querySelectorAll(".recent-chip").forEach(chip => {
    chip.addEventListener("click", async () => {
      const place = recent.find(p => String(p.id) === chip.dataset.id);
      if (place) {
        searchInput.value = place.name;
        await loadPlace(place);
      }
    });
  });
}

// AQI helpers
function getAQIStatus(aqi) {
  if (aqi == null || isNaN(aqi)) {
    return {
      label: "AQI Unavailable",
      emoji: "❔",
      note: "Air quality data is not available for this location right now.",
      advice: "No AQI data available."
    };
  }
  if (aqi <= 50) return { label: "Good", emoji: "🌿", note: "Air quality is good.", advice: "Safe for normal outdoor activity." };
  if (aqi <= 100) return { label: "Moderate", emoji: "🙂", note: "Acceptable air quality.", advice: "Sensitive people should be slightly cautious." };
  if (aqi <= 150) return { label: "Unhealthy for Sensitive Groups", emoji: "😷", note: "Sensitive groups may feel effects.", advice: "Reduce long outdoor exposure if sensitive." };
  if (aqi <= 200) return { label: "Unhealthy", emoji: "⚠️", note: "Everyone may begin to feel health effects.", advice: "Reduce outdoor exertion." };
  if (aqi <= 300) return { label: "Very Unhealthy", emoji: "🚨", note: "Health alert for everyone.", advice: "Avoid prolonged outdoor activity." };
  return { label: "Hazardous", emoji: "☠️", note: "Emergency conditions.", advice: "Avoid going outside unless necessary." };
}

// API calls
async function searchPlaces(query, count = 6) {
  const url = `${GEO_SEARCH_API}?name=${encodeURIComponent(query)}&count=${count}&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding failed");
  const data = await res.json();
  return data.results || [];
}

async function reverseGeocode(lat, lon) {
  const url = `${GEO_REVERSE_API}?latitude=${lat}&longitude=${lon}&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Reverse geocoding failed");
  const data = await res.json();
  return data.results?.[0] || null;
}

async function fetchWeather(lat, lon) {
  const url = `${WEATHER_API}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover,visibility&hourly=temperature_2m,precipitation_probability,weather_code,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto&forecast_days=7`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather fetch failed");
  return res.json();
}

async function fetchAQI(lat, lon) {
  const url = `${AQI_API}?latitude=${lat}&longitude=${lon}&hourly=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,carbon_monoxide&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("AQI fetch failed");
  return res.json();
}

// Suggestion dropdown
async function renderSuggestions(query) {
  if (!query || query.trim().length < 2) {
    hideSuggestions();
    return;
  }

  try {
    const results = await searchPlaces(query, 6);
    if (!results.length) {
      hideSuggestions();
      return;
    }

    suggestions.innerHTML = results.map(place => {
      const displayName = buildPlaceName(place);
      return `
        <div class="suggestion-item" data-id="${place.id}">
          <div class="suggestion-name">${place.name}</div>
          <div class="suggestion-sub">${[place.admin1, place.country].filter(Boolean).join(", ")}</div>
        </div>
      `;
    }).join("");

    suggestions.classList.remove("hidden");

    document.querySelectorAll(".suggestion-item").forEach(item => {
      item.addEventListener("click", async () => {
        const resultsMap = await searchPlaces(query, 6);
        const place = resultsMap.find(p => String(p.id) === item.dataset.id);
        if (place) {
          searchInput.value = buildPlaceName(place);
          hideSuggestions();
          await loadPlace(place);
        }
      });
    });
  } catch (err) {
    console.error(err);
  }
}

// UI updates
function updatePlaceInfo(place, timezone, elevation) {
  const displayName = buildPlaceName(place);

  $("placeName").textContent = displayName;
  $("placeSubtitle").textContent = displayName;
  $("infoPlace").textContent = place.name || "--";
  $("infoRegion").textContent = place.admin1 || place.admin2 || "--";
  $("infoCountry").textContent = place.country || "--";
  $("infoCoords").textContent = `${round(place.latitude, 3)}, ${round(place.longitude, 3)}`;
  $("infoTimezone").textContent = timezone || "--";
  $("infoElevation").textContent = elevation != null ? `${round(elevation)} m` : "--";
}

function updateWeatherUI(place, weatherData) {
  const current = weatherData.current;
  const hourly = weatherData.hourly;
  const daily = weatherData.daily;
  const idx = getClosestIndex(hourly.time);
  const rainProb = hourly.precipitation_probability?.[idx] ?? 0;
  const uv = hourly.uv_index?.[idx] ?? null;
  const info = getWeatherInfo(current.weather_code, current.is_day === 1);

  updatePlaceInfo(place, weatherData.timezone, weatherData.elevation);
  applyMood(current.weather_code);

  // Hero
  $("heroTemp").textContent = `${round(current.temperature_2m)}°C`;
  $("heroCondition").textContent = info.label;
  $("heroIcon").textContent = info.icon;
  $("feelsLike").textContent = `${round(current.apparent_temperature)}°C`;
  $("humidity").textContent = `${round(current.relative_humidity_2m)}%`;
  $("windSpeed").textContent = `${round(current.wind_speed_10m)} km/h`;
  $("rainChance").textContent = `${round(rainProb)}%`;

  // Metrics
  $("metricTemp").textContent = `${round(current.temperature_2m)}°C`;
  $("metricFeels").textContent = `${round(current.apparent_temperature)}°C`;
  $("metricHumidity").textContent = `${round(current.relative_humidity_2m)}%`;
  $("metricWind").textContent = `${round(current.wind_speed_10m)} km/h`;
  $("metricWindDir").textContent = `${degreesToDirection(current.wind_direction_10m)} (${round(current.wind_direction_10m)}°)`;
  $("metricGusts").textContent = `${round(current.wind_gusts_10m)} km/h`;
  $("metricPressure").textContent = `${round(current.surface_pressure)} hPa`;
  $("metricVisibility").textContent = current.visibility != null ? `${round(current.visibility / 1000, 1)} km` : "--";
  $("metricCloud").textContent = `${round(current.cloud_cover)}%`;
  $("metricUV").textContent = uv != null ? round(uv, 1) : "--";
  $("metricPrecip").textContent = `${round(current.precipitation, 1)} mm`;
  $("metricRainProb").textContent = `${round(rainProb)}%`;

  // Sun
  $("sunrise").textContent = formatTime(daily.sunrise?.[0]);
  $("sunset").textContent = formatTime(daily.sunset?.[0]);
  $("timezoneText").textContent = weatherData.timezone || "--";

  // Hourly
  renderHourly(hourly, idx);

  // Forecast
  renderForecast(daily);

  // Summaries
  $("summary1").textContent = `Currently ${info.label.toLowerCase()} in ${place.name} with ${round(current.temperature_2m)}°C and wind around ${round(current.wind_speed_10m)} km/h.`;
  $("summary2").textContent =
    current.temperature_2m >= 34 ? "Very warm conditions. Stay hydrated and avoid strong afternoon sun." :
    current.temperature_2m >= 28 ? "Warm weather. Light clothing is recommended." :
    current.temperature_2m <= 18 ? "Cool conditions. A light layer may feel comfortable." :
    "Comfortable outdoor conditions for most people.";
  $("summary3").textContent = `Rain chance is ${round(rainProb)}% in the current hour. AQI insight updates below when air quality data loads.`;
}

function renderHourly(hourly, startIdx) {
  const grid = $("hourlyGrid");
  grid.innerHTML = "";
  const end = Math.min(startIdx + 24, hourly.time.length);

  for (let i = startIdx; i < end; i++) {
    const info = getWeatherInfo(hourly.weather_code[i], true);
    const card = document.createElement("div");
    card.className = "hour-card";
    card.innerHTML = `
      <div class="hour-time">${formatHour(hourly.time[i])}</div>
      <div class="hour-icon">${info.icon}</div>
      <div class="hour-temp">${round(hourly.temperature_2m[i])}°C</div>
      <div class="hour-meta">${info.label}</div>
      <div class="hour-meta">Rain: ${round(hourly.precipitation_probability?.[i] ?? 0)}%</div>
    `;
    grid.appendChild(card);
  }
}

function renderForecast(daily) {
  const grid = $("forecastGrid");
  grid.innerHTML = "";

  for (let i = 0; i < daily.time.length; i++) {
    const info = getWeatherInfo(daily.weather_code[i], true);
    const card = document.createElement("div");
    card.className = "forecast-card";
    card.innerHTML = `
      <div class="forecast-day">${formatDay(daily.time[i])}</div>
      <div class="forecast-icon">${info.icon}</div>
      <div class="forecast-temp">${round(daily.temperature_2m_max[i])}° / ${round(daily.temperature_2m_min[i])}°</div>
      <div class="forecast-desc">${info.label}</div>
    `;
    grid.appendChild(card);
  }
}

function updateAQIUI(aqiData) {
  const hourly = aqiData.hourly;
  const idx = getClosestIndex(hourly.time);

  const aqi = hourly.us_aqi?.[idx] ?? null;
  const pm25 = hourly.pm2_5?.[idx] ?? null;
  const pm10 = hourly.pm10?.[idx] ?? null;
  const o3 = hourly.ozone?.[idx] ?? null;
  const no2 = hourly.nitrogen_dioxide?.[idx] ?? null;
  const co = hourly.carbon_monoxide?.[idx] ?? null;

  const status = getAQIStatus(aqi);

  $("aqiValue").textContent = aqi != null ? round(aqi) : "--";
  $("aqiStatus").textContent = status.label;
  $("aqiEmoji").textContent = status.emoji;
  $("aqiNote").textContent = status.note;
  $("aqiAdvice").textContent = status.advice;

  $("pm25").textContent = pm25 != null ? `${round(pm25)} μg/m³` : "--";
  $("pm10").textContent = pm10 != null ? `${round(pm10)} μg/m³` : "--";
  $("o3").textContent = o3 != null ? `${round(o3)} μg/m³` : "--";
  $("no2").textContent = no2 != null ? `${round(no2)} μg/m³` : "--";
  $("co").textContent = co != null ? `${round(co)} μg/m³` : "--";

  const clamped = Math.min(Math.max(aqi || 0, 0), 300);
  $("aqiFill").style.width = `${(clamped / 300) * 100}%`;

  $("summary3").textContent = `AQI is ${aqi != null ? round(aqi) : "unavailable"} (${status.label}). ${status.advice}`;
}

function resetAQI() {
  $("aqiValue").textContent = "--";
  $("aqiStatus").textContent = "AQI unavailable";
  $("aqiEmoji").textContent = "❔";
  $("aqiNote").textContent = "Air quality data is not available for this location right now.";
  $("aqiAdvice").textContent = "--";
  $("pm25").textContent = "-- μg/m³";
  $("pm10").textContent = "-- μg/m³";
  $("o3").textContent = "-- μg/m³";
  $("no2").textContent = "-- μg/m³";
  $("co").textContent = "-- μg/m³";
  $("aqiFill").style.width = "0%";
}

// Main load
async function loadPlace(place) {
  try {
    hideError();
    showLoader();

    currentPlace = place;
    localStorage.setItem(STORAGE_LAST, JSON.stringify(place));
    saveRecentSearch(place);

    const [weatherData, aqiData] = await Promise.allSettled([
      fetchWeather(place.latitude, place.longitude),
      fetchAQI(place.latitude, place.longitude)
    ]);

    if (weatherData.status !== "fulfilled") {
      throw new Error("Weather unavailable");
    }

    updateWeatherUI(place, weatherData.value);

    if (aqiData.status === "fulfilled") {
      updateAQIUI(aqiData.value);
    } else {
      resetAQI();
    }

    updateTimestamp();
  } catch (err) {
    console.error(err);
    showError("Could not load live data for this location. Try another place.");
  } finally {
    setTimeout(hideLoader, 600);
  }
}

// Search actions
async function handleSearch() {
  const query = searchInput.value.trim();
  if (!query) {
    showError("Please enter a city, town, village, or district.");
    return;
  }

  try {
    hideError();
    showLoader();
    const results = await searchPlaces(query, 1);

    if (!results.length) {
      throw new Error("Location not found");
    }

    await loadPlace(results[0]);
  } catch (err) {
    console.error(err);
    showError("Location not found. Try a clearer name or nearest town/city.");
    hideLoader();
  }
}

// My location
async function handleMyLocation() {
  if (!navigator.geolocation) {
    showError("Geolocation is not supported in this browser.");
    return;
  }

  showLoader();
  myLocationBtn.disabled = true;
  myLocationBtn.textContent = "Locating...";

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        const reverse = await reverseGeocode(lat, lon);

        const place = reverse || {
          id: Date.now(),
          name: `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
          admin1: "",
          country: "Current Location",
          latitude: lat,
          longitude: lon
        };

        await loadPlace(place);
      } catch (err) {
        console.error(err);
        showError("Could not fetch your current location weather.");
        hideLoader();
      } finally {
        myLocationBtn.disabled = false;
        myLocationBtn.textContent = "📍 My Location";
      }
    },
    () => {
      showError("Location access denied. You can still search manually.");
      hideLoader();
      myLocationBtn.disabled = false;
      myLocationBtn.textContent = "📍 My Location";
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// Events
searchBtn.addEventListener("click", handleSearch);

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleSearch();
});

searchInput.addEventListener("input", () => {
  clearTimeout(suggestionTimer);
  const query = searchInput.value.trim();
  suggestionTimer = setTimeout(() => renderSuggestions(query), 250);
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-wrap")) hideSuggestions();
});

myLocationBtn.addEventListener("click", handleMyLocation);

refreshBtn.addEventListener("click", async () => {
  if (!currentPlace) {
    showError("Search a place first, then you can refresh.");
    return;
  }
  refreshBtn.disabled = true;
  refreshBtn.textContent = "Refreshing...";
  await loadPlace(currentPlace);
  refreshBtn.disabled = false;
  refreshBtn.textContent = "🔄 Refresh";
});

themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("light-mode");
  themeBtn.textContent = document.body.classList.contains("light-mode") ? "☀️" : "🌙";
});

menuBtn.addEventListener("click", () => {
  navMenu.classList.toggle("active");
  menuBtn.textContent = navMenu.classList.contains("active") ? "✕" : "☰";
});

clearRecentBtn.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_RECENT);
  renderRecentSearches();
});

// Reveal animation
const reveals = document.querySelectorAll(".reveal");
function revealOnScroll() {
  reveals.forEach(el => {
    const top = el.getBoundingClientRect().top;
    if (top < window.innerHeight - 100) el.classList.add("active");
  });
}
window.addEventListener("scroll", revealOnScroll);
revealOnScroll();

// Init
function init() {
  renderRecentSearches();

  const last = localStorage.getItem(STORAGE_LAST);
  if (last) {
    try {
      const place = JSON.parse(last);
      searchInput.value = buildPlaceName(place);
      loadPlace(place);
      return;
    } catch {}
  }

  // No default city. Start clean.
  hideLoader();
}
init();