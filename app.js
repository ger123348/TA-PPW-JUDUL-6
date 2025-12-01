let citiesData = [];
let currentCityName = null;
let isCelsius = true;
let favorites = [];

const searchInput = document.getElementById("search-input");
const suggestionsEl = document.getElementById("suggestions");
const messageEl = document.getElementById("message");
const currentCard = document.getElementById("current-card");
const locationEl = document.getElementById("location");
const timestampEl = document.getElementById("timestamp");
const temperatureEl = document.getElementById("temperature");
const conditionEl = document.getElementById("condition");
const bigIconEl = document.getElementById("big-icon");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");
const forecastRow = document.getElementById("forecast-row");
const favoritesRow = document.getElementById("favorites-row");
const favBtn = document.getElementById("fav-btn");
const themeToggle = document.getElementById("theme-toggle");
const unitToggle = document.getElementById("unit-toggle");
const refreshBtn = document.getElementById("refresh-btn");
const loadingEl = document.getElementById("loading");

function showLoading(show) { loadingEl.style.display = show ? "flex" : "none"; }

async function loadData(initial = false) {
  showLoading(true);
  const res = await fetch("data.json");
  const data = await res.json();
  citiesData = data.cities;
  if (initial) { loadFavorites(); selectCity(citiesData[0].name); }
  else if (currentCityName) selectCity(currentCityName,false);
  showLoading(false);
}

function formatTime(){
  return new Date().toLocaleString("id-ID",{weekday:"short",hour:"2-digit",minute:"2-digit"});
}

function renderCurrent(city){
  currentCityName = city.name;
  currentCard.style.display = "block";
  locationEl.textContent = city.name;
  timestampEl.textContent = `Updated • ${formatTime()}`;

  let temp = city.current.temperature;
  if (!isCelsius) temp = Math.round((temp*9)/5+32);
  temperatureEl.textContent = temp + "°";

  bigIconEl.textContent = city.current.icon;
  conditionEl.textContent = city.current.condition;
  humidityEl.textContent = `Humidity ${city.current.humidity}%`;
  windEl.textContent = `Wind ${city.current.wind} km/h`;

  updateFavButton();
  renderForecast(city);
}

function renderForecast(city){
  forecastRow.innerHTML = "";
  city.forecast.forEach(d=>{
    forecastRow.innerHTML += `
    <div class="forecast-item">
      <div class="day">${d.day}</div>
      <div class="f-icon">${mapConditionToIcon(d.condition)}</div>
      <div class="range">${d.min}° / ${d.max}°</div>
      <div class="desc">${d.condition}</div>
    </div>`;
  });
}

function mapConditionToIcon(c){
  const x = c.toLowerCase();
  if(x.includes("cerah")||x.includes("sunny"))return "☀";
  if(x.includes("cloud"))return "☁";
  if(x.includes("rain"))return "🌧";
  if(x.includes("storm"))return "⛈";
  return "🌤";
}

function selectCity(name, updateInput=true){
  const city = citiesData.find(c=>c.name.toLowerCase()===name.toLowerCase());
  suggestionsEl.style.display="none"; messageEl.textContent="";
  if(!city){ messageEl.textContent=`Tidak ada data untuk "${name}"`; return; }
  if(updateInput) searchInput.value = city.name;
  renderCurrent(city);
}

function renderSuggestions(text){
  suggestionsEl.innerHTML="";
  const q=text.trim().toLowerCase();
  if(!q){ suggestionsEl.style.display="none"; return; }
  const found = citiesData.filter(c=>c.name.toLowerCase().includes(q));
  suggestionsEl.style.display="block";
  if(!found.length){
    suggestionsEl.innerHTML=`<div class="suggestion-item">Tidak ada kota.</div>`;
    return;
  }
  found.slice(0,6).forEach(c=>{
    suggestionsEl.innerHTML+=`<div class="suggestion-item" onclick="selectCity('${c.name}')">${c.name}</div>`;
  });
}

searchInput.addEventListener("input",e=>renderSuggestions(e.target.value));
searchInput.addEventListener("keydown",e=>{
  if(e.key==="Enter") selectCity(searchInput.value.trim());
});

function loadFavorites(){
  favorites = JSON.parse(localStorage.getItem("favCities"))||[];
  renderFavorites();
}

function saveFavorites(){
  localStorage.setItem("favCities",JSON.stringify(favorites));
}

function toggleFavorite(){
  const i=favorites.indexOf(currentCityName);
  i===-1 ? favorites.push(currentCityName) : favorites.splice(i,1);
  saveFavorites(); renderFavorites(); updateFavButton();
}

function updateFavButton(){
  favBtn.textContent = favorites.includes(currentCityName) ? "★ Favorit" : "♡ Simpan";
}

function renderFavorites(){
  favoritesRow.innerHTML="";
  if(!favorites.length){ favoritesRow.textContent="Belum ada favorit."; return;}
  favorites.forEach(n=>{
    favoritesRow.innerHTML+=`<div class="fav-chip" onclick="selectCity('${n}')">${n}</div>`;
  });
}

themeToggle.onclick = ()=>{ document.body.classList.toggle("light"); themeToggle.textContent=document.body.classList.contains("light")?"Dark":"Light"; };
unitToggle.onclick = ()=>{ isCelsius=!isCelsius; unitToggle.textContent=isCelsius?"°C":"°F"; selectCity(currentCityName,false); };
favBtn.onclick = toggleFavorite;
refreshBtn.onclick = ()=>loadData(false);

setInterval(()=>loadData(false),5*60*1000);
loadData(true);
