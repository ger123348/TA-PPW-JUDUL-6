// ========= KONFIGURASI DASAR =========
const API_KEY = "17b9eed65198fdb631e8ad4fa012be46"; // ganti dengan API key OpenWeather kamu
let currentCity = "Bandar Lampung";
let currentUnit = "metric"; // metric = °C, imperial = °F
let autoUpdateInterval = null;

// ========= ELEMENT DOM =========
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const unitToggle = document.getElementById("unitToggle");
const themeToggle = document.getElementById("themeToggle");
const refreshBtn = document.getElementById("refreshBtn");

const loadingEl = document.getElementById("loading");
const errorEl = document.getElementById("errorMessage");

const locationNameEl = document.getElementById("locationName");
const timestampEl = document.getElementById("timestamp");
const tempEl = document.getElementById("temperature");
const descEl = document.getElementById("weatherDesc");
const iconEl = document.getElementById("weatherIcon");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("windSpeed");

const forecastListEl = document.getElementById("forecastList");

const favoriteBtn = document.getElementById("favoriteBtn");
const favoritesListEl = document.getElementById("favoritesList");

// ========= UTILITAS =========
function showLoading(show) {
  loadingEl.classList.toggle("hidden", !show);
}

function showError(message = "") {
  if (!message) {
    errorEl.classList.add("hidden");
    errorEl.textContent = "";
  } else {
    errorEl.classList.remove("hidden");
    errorEl.textContent = message;
  }
}

function formatTimestamp(dt, timezoneOffsetSec) {
  // dt: unix detik, timezoneOffsetSec: offset dari API (detik)
  const localMs = (dt + timezoneOffsetSec) * 1000;
  const date = new Date(localMs);
  return date.toLocaleString("id-ID", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getUnitSymbol() {
  return currentUnit === "metric" ? "°C" : "°F";
}

// ========= FAVORIT (localStorage) =========
function getFavorites() {
  const raw = localStorage.getItem("favoriteCities");
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveFavorites(list) {
  localStorage.setItem("favoriteCities", JSON.stringify(list));
}

function toggleFavorite(cityName) {
  let favs = getFavorites();
  const exists = favs.includes(cityName);

  if (exists) {
    favs = favs.filter((c) => c !== cityName);
  } else {
    favs.push(cityName);
  }

  saveFavorites(favs);
  updateFavoriteButtonState();
  renderFavorites();
}

function updateFavoriteButtonState() {
  const favs = getFavorites();
  if (favs.includes(currentCity)) {
    favoriteBtn.classList.add("active");
    favoriteBtn.textContent = "★";
  } else {
    favoriteBtn.classList.remove("active");
    favoriteBtn.textContent = "☆";
  }
}

function renderFavorites() {
  const favs = getFavorites();
  favoritesListEl.innerHTML = "";

  if (favs.length === 0) {
    const p = document.createElement("p");
    p.className = "empty-text";
    p.textContent = "Belum ada kota favorit";
    favoritesListEl.appendChild(p);
    return;
  }

  favs.forEach((city) => {
    const btn = document.createElement("button");
    btn.className = "favorite-pill";
    btn.textContent = city;
    btn.addEventListener("click", () => {
      currentCity = city;
      cityInput.value = city;
      fetchWeatherAndForecast();
    });
    favoritesListEl.appendChild(btn);
  });
}

// ========= API REQUEST =========
async function fetchCurrentWeather(city) {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
    city
  )}&appid=${API_KEY}&units=${currentUnit}&lang=id`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Gagal mengambil cuaca (status ${res.status})`);
  }
  return res.json();
}

async function fetchForecast(city) {
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
    city
  )}&appid=${API_KEY}&units=${currentUnit}&lang=id`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Gagal mengambil forecast (status ${res.status})`);
  }
  return res.json();
}

// ========= RENDER KE UI =========
function renderCurrentWeather(data) {
  currentCity = data.name;

  const temp = Math.round(data.main.temp);
  const humidity = data.main.humidity;
  const wind = data.wind.speed;
  const desc = data.weather[0].description;
  const icon = data.weather[0].icon;
  const tzOffset = data.timezone; // detik
  const dt = data.dt; // unix detik

  locationNameEl.textContent = `${data.name}, ${data.sys.country}`;
  timestampEl.textContent = `Terakhir update: ${formatTimestamp(
    dt,
    tzOffset
  )}`;

  tempEl.textContent = `${temp}${getUnitSymbol()}`;
  descEl.textContent = desc;

  humidityEl.textContent = `${humidity}%`;
  windEl.textContent =
    currentUnit === "metric" ? `${wind} m/s` : `${wind} mph`;

  iconEl.src = `https://openweathermap.org/img/wn/${icon}@2x.png`;
  iconEl.alt = desc;

  updateFavoriteButtonState();
}

function renderForecast(data) {
  // Data 5 hari ke depan, ambil dari list (3 jam sekali)
  const list = data.list;
  const byDate = {};

  list.forEach((item) => {
    const dateTxt = item.dt_txt.split(" ")[0]; // "YYYY-MM-DD"
    if (!byDate[dateTxt]) {
      byDate[dateTxt] = [];
    }
    byDate[dateTxt].push(item);
  });

  const dates = Object.keys(byDate).sort();

  // Buang hari pertama kalau itu hari ini (supaya benar-benar 5 hari ke depan)
  const today = new Date().toISOString().slice(0, 10);
  const filteredDates = dates.filter((d) => d >= today).slice(0, 5);

  forecastListEl.innerHTML = "";

  filteredDates.forEach((dateStr) => {
    const items = byDate[dateStr];
    let minTemp = Infinity;
    let maxTemp = -Infinity;
    let chosenItem = items[0];

    items.forEach((it) => {
      if (it.main.temp_min < minTemp) minTemp = it.main.temp_min;
      if (it.main.temp_max > maxTemp) maxTemp = it.main.temp_max;
      // kalau jam 12:00, pakai itu untuk icon & deskripsi
      if (it.dt_txt.includes("12:00:00")) {
        chosenItem = it;
      }
    });

    const desc = chosenItem.weather[0].description;
    const icon = chosenItem.weather[0].icon;

    const dateObj = new Date(dateStr);
    const label = dateObj.toLocaleDateString("id-ID", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });

    const card = document.createElement("div");
    card.className = "forecast-item";
    card.innerHTML = `
      <div><strong>${label}</strong></div>
      <img src="https://openweathermap.org/img/wn/${icon}.png" alt="${desc}">
      <div style="text-transform: capitalize; margin-bottom:4px;">${desc}</div>
      <div><strong>${Math.round(
        maxTemp
      )}${getUnitSymbol()}</strong> / ${Math.round(minTemp)}${getUnitSymbol()}</div>
    `;

    forecastListEl.appendChild(card);
  });
}

// ========= FUNGSI UTAMA =========
async function fetchWeatherAndForecast() {
  showError("");
  showLoading(true);

  try {
    const [current, forecast] = await Promise.all([
      fetchCurrentWeather(currentCity),
      fetchForecast(currentCity),
    ]);

    renderCurrentWeather(current);
    renderForecast(forecast);
    setupAutoUpdate(); // reset/update interval setiap kali kota diganti
  } catch (err) {
    console.error(err);
    showError(err.message || "Terjadi kesalahan saat mengambil data cuaca.");
  } finally {
    showLoading(false);
  }
}

function setupAutoUpdate() {
  // clear interval lama
  if (autoUpdateInterval) {
    clearInterval(autoUpdateInterval);
  }
  // real-time update tiap 5 menit (300000 ms)
  autoUpdateInterval = setInterval(() => {
    fetchWeatherAndForecast();
  }, 300000);
}

// ========= EVENT LISTENER =========

// Search
searchBtn.addEventListener("click", () => {
  const value = cityInput.value.trim();
  if (!value) return;
  currentCity = value;
  fetchWeatherAndForecast();
});

cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    searchBtn.click();
  }
});

// Toggle unit C / F
unitToggle.addEventListener("click", () => {
  currentUnit = currentUnit === "metric" ? "imperial" : "metric";
  unitToggle.classList.toggle("active");
  unitToggle.textContent = currentUnit === "metric" ? "°C" : "°F";
  fetchWeatherAndForecast();
});

// Toggle tema
themeToggle.addEventListener("click", () => {
  const body = document.body;
  const isDark = body.classList.contains("dark");
  if (isDark) {
    body.classList.remove("dark");
    body.classList.add("light");
    themeToggle.textContent = "🌞 Light";
  } else {
    body.classList.remove("light");
    body.classList.add("dark");
    themeToggle.textContent = "🌙 Dark";
  }
  // Simpan preferensi
  localStorage.setItem(
    "theme",
    body.classList.contains("dark") ? "dark" : "light"
  );
});

// Refresh manual
refreshBtn.addEventListener("click", () => {
  fetchWeatherAndForecast();
});

// Favorite
favoriteBtn.addEventListener("click", () => {
  toggleFavorite(currentCity);
});

// ========= INISIALISASI =========
function initTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "dark") {
    document.body.classList.remove("light");
    document.body.classList.add("dark");
    themeToggle.textContent = "🌙 Dark";
  } else {
    document.body.classList.remove("dark");
    document.body.classList.add("light");
    themeToggle.textContent = "🌞 Light";
  }
}

function init() {
  initTheme();
  renderFavorites();
  cityInput.value = currentCity;
  unitToggle.textContent = "°C";
  unitToggle.classList.add("active");
  fetchWeatherAndForecast();
}

window.addEventListener("load", init);