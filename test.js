 import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
app.use(express.json());
const PORT = 3000;

const formatResponse = (data) => ({ status: "success", message: "Success", data });
const formatError = (msg) => ({ status: "error", message: msg, data: null });

// 1️⃣ Pinterest scraping (highest priority)
const fetchPinterestImage = async (query) => {
  try {
    const url = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`;
    const resp = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" } // Pinterest requires User-Agent
    });
    const $ = cheerio.load(resp.data);
    // Pinterest sometimes uses meta tags for first images
    const img = $("img[srcset]").first().attr("src") || $("img").first().attr("src");
    return img || null;
  } catch (err) {
    console.warn("Pinterest fetch failed:", err.message);
    return null;
  }
};

// 2️⃣ Wikipedia fetch
const fetchWikiData = async (title) => {
  try {
    const resp = await axios.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    );
    return {
      description: resp.data.extract || null,
      image: resp.data.thumbnail?.source || null,
    };
  } catch {
    return { description: null, image: null };
  }
};

// 3️⃣ Pixabay scraping (public search, no API key)
const fetchPixabayImage = async (query) => {
  try {
    const url = `https://pixabay.com/images/search/${encodeURIComponent(query)}/`;
    const resp = await axios.get(url);
    const $ = cheerio.load(resp.data);
    const img = $("div.item img").first().attr("data-lazy") || $("div.item img").first().attr("src");
    return img || null;
  } catch {
    return null;
  }
};

app.get("/city/:cityName/best-places", async (req, res) => {
  const { cityName } = req.params;
  if (!cityName) return res.status(400).json(formatError("Invalid city name"));

  try {
    // Overpass API: fetch attractions
    const overpassQuery = `
      [out:json][timeout:50];
      area["name"="${cityName}"]["boundary"="administrative"]->.searchArea;
      node["tourism"="attraction"](area.searchArea);
      out body;
    `;
    const overpassResp = await axios.get("https://overpass-api.de/api/interpreter", {
      params: { data: overpassQuery },
    });
    const attractions = overpassResp.data.elements || [];
    if (!attractions.length) return res.status(404).json(formatError("No attractions found"));

    const results = [];
    for (const attr of attractions) {
      const name = attr.tags?.name;
      if (!name) continue;

      const lat = attr.lat;
      const lon = attr.lon;

      // Fetch images in order: Pinterest -> Wikipedia -> Pixabay
      let image = await fetchPinterestImage(`${name} ${cityName}`);
      let description = null;

      if (!image) {
        const wiki = await fetchWikiData(name);
        image = wiki.image;
        description = wiki.description;
      }

      if (!image) image = await fetchPixabayImage(`${name} ${cityName}`);

      // Skip if no image found
      if (!image) continue;

      results.push({ name, latitude: lat, longitude: lon, image, description });
    }

    if (!results.length) return res.status(404).json(formatError("No attractions with images found"));

    res.json(formatResponse(results));
  } catch (err) {
    console.error("Server error:", err.message);
    res.status(500).json(formatError("Internal Server Error"));
  }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));