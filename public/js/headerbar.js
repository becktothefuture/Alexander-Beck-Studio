/*
  Header bar dynamic content: UK time, London weather, sunrise/sunset.
  - No storage
  - Minimal DOM writes; O(1) updates
*/
(function(){
  function select(id){return document.getElementById(id);} 

  function formatLondonTime(date){
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(date);
  }

  function startClock(){
    var timeEl = select('uk-time');
    if(!timeEl) return;
    function tick(){ timeEl.textContent = formatLondonTime(new Date()) + ' UK'; }
    tick();
    var intervalId = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', function(){
      if(document.hidden){ return; }
      tick();
    });
    return function stop(){ clearInterval(intervalId); };
  }

  function describeWeatherCode(code){
    var map = {
      0: 'Clear',
      1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
      45: 'Fog', 48: 'Depositing rime fog',
      51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
      56: 'Freezing drizzle', 57: 'Freezing drizzle',
      61: 'Light rain', 63: 'Moderate rain', 65: 'Heavy rain',
      66: 'Freezing rain', 67: 'Freezing rain',
      71: 'Light snow', 73: 'Moderate snow', 75: 'Heavy snow',
      77: 'Snow grains',
      80: 'Light rain showers', 81: 'Rain showers', 82: 'Violent rain showers',
      85: 'Snow showers', 86: 'Heavy snow showers',
      95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Violent thunderstorm'
    };
    return map.hasOwnProperty(code) ? map[code] : 'Weather';
  }

  function fetchWeather(){
    var el = select('london-weather');
    if(!el) return;
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=51.5072&longitude=-0.1276&current_weather=true';
    fetch(url, { cache: 'no-store' }).then(function(r){return r.json();}).then(function(data){
      if(!(data && data.current_weather)) throw new Error('No current weather');
      var cw = data.current_weather; // {temperature, windspeed, weathercode}
      var desc = describeWeatherCode(Number(cw.weathercode));
      var temp = Math.round(Number(cw.temperature));
      el.textContent = 'London ' + temp + '°C, ' + desc;
    }).catch(function(){ el.textContent = 'London weather unavailable'; });
  }

  function formatTimeHHMMLondon(isoString){
    var d = new Date(isoString);
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit'
    }).format(d);
  }

  function fetchSunriseSunset(){
    var el = select('london-sun');
    if(!el) return;
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=51.5072&longitude=-0.1276&daily=sunrise,sunset&forecast_days=1&timezone=Europe%2FLondon';
    fetch(url, { cache: 'no-store' }).then(function(r){return r.json();}).then(function(data){
      if(!(data && data.daily && data.daily.sunrise && data.daily.sunset)) throw new Error('No sun data');
      var sunriseIso = data.daily.sunrise[0];
      var sunsetIso = data.daily.sunset[0];
      el.textContent = 'Sunrise ' + formatTimeHHMMLondon(sunriseIso) + ' / Sunset ' + formatTimeHHMMLondon(sunsetIso);
    }).catch(function(){ el.textContent = 'Sun times unavailable'; });
  }

  function applyTopOffset(){
    var bar = document.querySelector('.headerbar');
    if(!bar) return;
    var h = bar.getBoundingClientRect().height;
    // Offset the hero section so it doesn't sit under the fixed header
    var hero = document.querySelector('header.section--fullviewport');
    if(hero){ hero.style.scrollMarginTop = h + 'px'; }
  }

  function init(){
    startClock();
    fetchWeather();
    fetchSunriseSunset();
    applyTopOffset();
    window.addEventListener('resize', function(){ applyTopOffset(); });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();


