import { fetchJson, firstOf } from '../../src/lib/http.js';
import { row } from '../../src/lib/ui.js';

const WMO = {
  0: ['Clear sky', '☀️'], 1: ['Mainly clear', '🌤️'], 2: ['Partly cloudy', '⛅'], 3: ['Overcast', '☁️'],
  45: ['Fog', '🌫️'], 48: ['Rime fog', '🌫️'], 51: ['Light drizzle', '🌦️'], 53: ['Drizzle', '🌦️'],
  55: ['Dense drizzle', '🌧️'], 61: ['Light rain', '🌦️'], 63: ['Rain', '🌧️'], 65: ['Heavy rain', '⛈️'],
  66: ['Freezing rain', '🌧️'], 67: ['Freezing rain', '🌧️'], 71: ['Light snow', '🌨️'], 73: ['Snow', '🌨️'],
  75: ['Heavy snow', '❄️'], 77: ['Snow grains', '🌨️'], 80: ['Rain showers', '🌦️'], 81: ['Rain showers', '🌧️'],
  82: ['Violent showers', '⛈️'], 85: ['Snow showers', '🌨️'], 86: ['Snow showers', '❄️'],
  95: ['Thunderstorm', '⛈️'], 96: ['Thunderstorm + hail', '⛈️'], 99: ['Severe thunderstorm', '⛈️'],
};

const describe = (code) => WMO[code] || ['Unknown', '🌡️'];

async function geocode(city) {
  const d = await fetchJson(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
  );
  const hit = d?.results?.[0];
  if (!hit) throw new Error(`I could not find "${city}".`);
  return {
    name: hit.name,
    country: hit.country_code || hit.country || '',
    lat: hit.latitude,
    lon: hit.longitude,
    timezone: hit.timezone || 'auto',
    population: hit.population,
  };
}

/** Provider 1: Open-Meteo (keyless). Provider 2: wttr.in (keyless). */
async function forecast(place) {
  return firstOf([
    async () => {
      const d = await fetchJson(
        `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}`
        + '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m'
        + '&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=3&timezone=auto',
        { timeout: 10_000 }
      );
      if (!d?.current) return null;
      return {
        provider: 'open-meteo',
        now: {
          temp: d.current.temperature_2m,
          feels: d.current.apparent_temperature,
          humidity: d.current.relative_humidity_2m,
          wind: d.current.wind_speed_10m,
          code: d.current.weather_code,
        },
        daily: (d.daily?.time || []).slice(0, 3).map((day, i) => ({
          day,
          min: d.daily.temperature_2m_min[i],
          max: d.daily.temperature_2m_max[i],
          code: d.daily.weather_code[i],
        })),
      };
    },
    async () => {
      const d = await fetchJson(`https://wttr.in/${encodeURIComponent(place.name)}?format=j1`, { timeout: 10_000 });
      const cur = d?.current_condition?.[0];
      if (!cur) return null;
      return {
        provider: 'wttr.in',
        now: {
          temp: Number(cur.temp_C),
          feels: Number(cur.FeelsLikeC),
          humidity: Number(cur.humidity),
          wind: Number(cur.windspeedKmph),
          code: Number(cur.weatherCode) || 0,
          text: cur.weatherDesc?.[0]?.value,
        },
        daily: (d.weather || []).slice(0, 3).map((w) => ({
          day: w.date,
          min: Number(w.mintempC),
          max: Number(w.maxtempC),
          code: 0,
          text: w.hourly?.[4]?.weatherDesc?.[0]?.value,
        })),
      };
    },
  ]);
}

export default {
  name: 'weather',
  aliases: ['forecast', 'wttr'],
  category: 'tools',
  description: 'Current weather + 3-day forecast for any city',
  usage: '.weather Lagos',
  cooldownMs: 6000,
  async run({ argsText, reply, config }) {
    const city = String(argsText || '').trim() || process.env.DEFAULT_CITY || '';
    if (!city) return reply({ text: 'Usage: .weather <city>\nExample: .weather Lagos' });

    try {
      const place = await geocode(city);
      const data = await forecast(place);
      const [label, emoji] = describe(data.now.code);
      const condition = data.now.text || label;

      const lines = [
        `┏❐ 《 ᴡᴇᴀᴛʜᴇʀ 》 ❐`,
        row('place', `${place.name}${place.country ? `, ${place.country}` : ''}`),
        row('now', `${data.now.temp}°C ${emoji} ${condition}`),
        row('feels like', `${data.now.feels}°C`),
        row('humidity', `${data.now.humidity}%`),
        row('wind', `${data.now.wind} km/h`),
        '┣━━━━━━━━━━',
        ...data.daily.map((d) => {
          const [text, em] = describe(d.code);
          return row(d.day.slice(5), `${d.min}° / ${d.max}° ${em} ${d.text || text}`);
        }),
        '┗❐',
        '',
        `_${data.provider} · units °C_`,
      ];
      await reply({ text: lines.join('\n') });
    } catch (err) {
      await reply({
        text: `❌ Weather lookup failed: ${err.message}\n\n_Nothing cached — both Open-Meteo and wttr.in must be reachable from the host._`,
      });
    }
  },
};
