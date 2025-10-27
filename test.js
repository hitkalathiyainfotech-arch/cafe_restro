// import express from "express";
// import axios from "axios";
// import * as cheerio from "cheerio";
// import pLimit from "p-limit";

// const app = express();
// app.use(express.json());
// const PORT = 3000;

// const formatResponse = (data) => ({ status: "success", message: "Success", data });
// const formatError = (msg) => ({ status: "error", message: msg, data: null });

// const cityCache = new Map();

// // axios instance
// const http = axios.create({
//   timeout: 10000,
//   headers: { "User-Agent": "Mozilla/5.0" },
// });

// // ---------------------- IMAGE SCRAPERS ---------------------- //
// const fetchPinterestImage = async (query) => {
//   try {
//     const url = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`;
//     const { data } = await http.get(url);
//     const $ = cheerio.load(data);
//     return $("img[srcset]").first().attr("src") || $("img").first().attr("src") || null;
//   } catch {
//     return null;
//   }
// };

// const fetchWikiData = async (title) => {
//   try {
//     const { data } = await http.get(
//       `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
//     );
//     return { image: data.thumbnail?.source || null, description: data.extract || null };
//   } catch {
//     return { image: null, description: null };
//   }
// };

// const fetchPixabayImage = async (query) => {
//   try {
//     const url = `https://pixabay.com/images/search/${encodeURIComponent(query)}/`;
//     const { data } = await http.get(url);
//     const $ = cheerio.load(data);
//     return (
//       $("div.item img").first().attr("data-lazy") ||
//       $("div.item img").first().attr("src") ||
//       null
//     );
//   } catch {
//     return null;
//   }
// };

// // ---------------------- OVERPASS FETCHER ---------------------- //
// async function fetchAttractions(cityName) {
//   // Multi-tag search for temples, ghats, monuments, parks, etc.
//   const query = `
//     [out:json][timeout:50];
//     area["name"="${cityName}"]["boundary"="administrative"]->.a;

//     (
//       node["tourism"~"attraction|viewpoint|museum|zoo|theme_park"](area.a);
//       node["historic"](area.a);
//       node["amenity"="place_of_worship"](area.a);
//       node["natural"="water"](area.a);
//       node["leisure"="park"](area.a);
//       node["place"="square"](area.a);
//       node["man_made"="tower"](area.a);
//     );

//     out body;
//   `;

//   try {
//     const resp = await http.get("https://overpass-api.de/api/interpreter", {
//       params: { data: query },
//     });
//     return resp.data?.elements || [];
//   } catch (err) {
//     console.error("Overpass error:", err.message);
//     return [];
//   }
// }

// // ---------------------- MAIN ROUTE ---------------------- //
// app.get("/city/:cityName/best-places", async (req, res) => {
//   const { cityName } = req.params;
//   if (!cityName) return res.status(400).json(formatError("Invalid city name"));

//   // Return cache if exists
//   if (cityCache.has(cityName)) return res.json(formatResponse(cityCache.get(cityName)));

//   try {
//     const attractions = await fetchAttractions(cityName);
//     if (!attractions.length)
//       return res.status(404).json(formatError("No attractions found for this city"));

//     const limit = pLimit(8);
//     const tasks = attractions.map((attr) =>
//       limit(async () => {
//         const name = attr.tags?.name;
//         if (!name) return null;

//         const lat = attr.lat;
//         const lon = attr.lon;

//         // Fetch all image sources in parallel
//         const [pin, wiki, pix] = await Promise.allSettled([
//           fetchPinterestImage(`${name} ${cityName}`),
//           fetchWikiData(name),
//           fetchPixabayImage(`${name} ${cityName}`),
//         ]);

//         const image = pin.value || wiki.value?.image || pix.value || null;
//         const description = wiki.value?.description || null;

//         if (!image) return null;
//         return { name, latitude: lat, longitude: lon, image, description };
//       })
//     );

//     const results = (await Promise.all(tasks)).filter(Boolean);
//     if (!results.length)
//       return res.status(404).json(formatError("No attractions with images found"));

//     cityCache.set(cityName, results);
//     res.json(formatResponse(results));
//   } catch (err) {
//     console.error("Server error:", err.message);
//     res.status(500).json(formatError("Internal Server Error"));
//   }
// });

// // get all coyuntries
// app.get("/countries", async (req, res) => {
//   try {
//     const query = `
//       [out:json][timeout:180];
//       relation["boundary"="administrative"]["admin_level"="2"];
//       out tags;
//     `;

//     const url = "https://overpass-api.de/api/interpreter";
//     const { data } = await axios.get(url, { params: { data: query } });

//     const countries = (data.elements || [])
//       .map((el) => ({
//         name: el.tags?.name,
//         code: el.tags?.["ISO3166-1"] || el.tags?.["ISO3166-1:alpha2"] || null,
//       }))
//       .filter((c) => c.name);

//     res.json(formatResponse(countries));
//   } catch (err) {
//     console.error("Overpass error:", err.message);
//     res.status(500).json(formatError("Failed to fetch country list"));
//   }
// });

// //get citys by country
// app.get("/cityByCountry/:country", async (req, res) => {
//   try {
//     const { country } = req.params;
//     const query = `
//      [out:json][timeout:180];
//      area["name"="${country}"]->.a;
//      node["place"="city"](area.a);
//      out tags;
//    `;
//     const url = "https://overpass-api.de/api/interpreter";
//     const resp = await axios.get(url, { params: { data: query } });
//     const elements = resp.data.elements || [];
//     const cityNames = elements.map(e => e.tags?.name).filter(Boolean);
//     console.log(`✅ Found ${cityNames.length} cities in ${country}`);
//     return res.status(200).json(formatResponse(cityNames));
//   } catch (error) {
//     console.error("Error fetching cities:", error.message);
//     res.status(500).json(formatError("Failed to fetch city list"));
//   }
// });

// // ---------------------- ERROR HANDLER ---------------------- //
// app.use((err, req, res, next) => {
//   console.error("Unhandled error:", err);
//   res.status(500).json(formatError("Internal Server Error"));
// });

// app.listen(PORT, () =>
//   console.log(`⚡ Fast Travel API running at http://localhost:${PORT}`)
// );

// // citys get by Country
// // import axios from "axios";

// // async function getCities(country = "India") {
// //   const query = `
// //     [out:json][timeout:180];
// //     area["name"="${country}"]->.a;
// //     node["place"="city"](area.a);
// //     out tags;
// //   `;
// //   const url = "https://overpass-api.de/api/interpreter";
// //   const resp = await axios.get(url, { params: { data: query } });
// //   const elements = resp.data.elements || [];
// //   const cityNames = elements.map(e => e.tags?.name).filter(Boolean);
// //   console.log(`✅ Found ${cityNames.length} cities in ${country}`);
// //   return cityNames;
// // }

// // getCities("India").then(console.log).catch(console.error);


// // in this code donot chanfe fyuclity onnlly optize all api so req, respons emake fast




import axios from "axios";
import * as cheerio from "cheerio";

const createEnhancedGoogleMapsUrl = (name = "") => {
  const encodedName = encodeURIComponent(name);
  return `https://www.google.com/maps/search/?api=1&query=${encodedName}`;
};

// 🦆 DuckDuckGo image fetch
const fetchDuckDuckGoImage = async (query) => {
  try {
    const url = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}`;
    const res = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (res.data?.results?.length > 0) return res.data.results[0].image;
    return null;
  } catch {
    return null;
  }
};

// 🪶 Bing fallback (with resize param)
const fetchBingImage = async (query, width = 512, height = 512) => {
  try {
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2`;
    const res = await axios.get(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const $ = cheerio.load(res.data);

    const first = $("a.iusc img.mimg").first();
    let src =
      first.attr("src") || first.attr("data-src") || $("img").first().attr("src");

    if (src && src.startsWith("http")) {
      // Add resize params if Bing CDN
      if (src.includes("tse")) {
        src = src.replace("&w=*", `&w=${width}`).replace("&h=*", `&h=${height}`);
        if (!src.includes("&w=")) src += `&w=${width}&h=${height}`;
      }
      return src;
    }
    return null;
  } catch {
    return null;
  }
};

// 🌍 Google Images fallback (scrape)
const fetchGoogleImage = async (query) => {
  try {
    const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
    const res = await axios.get(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const $ = cheerio.load(res.data);
    const first = $("img").eq(1).attr("src"); // first image is usually logo
    return first || null;
  } catch {
    return null;
  }
};

// 🔁 Full function
export const getPlaceImageAndMap = async (placeName, width = 289, height = 240) => {
  const mapsUrl = createEnhancedGoogleMapsUrl(placeName);

  let image =
    (await fetchDuckDuckGoImage(placeName)) ||
    (await fetchBingImage(placeName, width, height)) ||
    (await fetchGoogleImage(placeName)) ||
    `https://via.placeholder.com/${width}x${height}?text=No+Image`;

  return {
    status: "success",
    data: {
      name: placeName,
      mapsUrl,
      image,
    },
  };
};

// 🔍 Example
(async () => {
  const result = await getPlaceImageAndMap("CN Tower");
  console.log(result);
})();
