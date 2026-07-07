// Natuurlijke stem via Google Cloud Text-to-Speech (Neural2, Nederlands/Engels).
// Werkt met een simpele API-sleutel: zet GOOGLE_TTS_API_KEY in de
// omgevingsvariabelen (Vercel), of in proefversie/.env voor lokaal testen.
// Geeft base64 MP3 terug. Zonder sleutel faalt hij netjes (status 503), zodat
// de app terugvalt op de ingebouwde browserstem.
export const maxDuration = 30;

// Warme, vriendelijke stemmen per taal. Neural2 valt binnen de gratis laag
// (1 miljoen tekens per maand).
const VOICES = {
  nl: { languageCode: "nl-NL", name: "nl-NL-Neural2-A" },
  en: { languageCode: "en-US", name: "en-US-Neural2-F" },
};

// Zet Kizzo's tekst om naar spraak. Wordt gebruikt door de Vercel-functie en
// door de lokale dev-server.
export async function synthesize({ text, language, age } = {}) {
  const key = process.env.GOOGLE_TTS_API_KEY;
  if (!key) {
    const e = new Error("GOOGLE_TTS_API_KEY ontbreekt");
    e.status = 503;
    throw e;
  }
  const clean = (text || "").toString().slice(0, 3000).trim();
  if (!clean) {
    const e = new Error("text is verplicht");
    e.status = 400;
    throw e;
  }
  const lang = language === "en" ? "en" : "nl";
  const voice = VOICES[lang];
  const young = Number(age) <= 7;

  const body = {
    input: { text: clean },
    voice: { languageCode: voice.languageCode, name: voice.name },
    audioConfig: {
      audioEncoding: "MP3",
      // Iets langzamer voor de jongsten, en een vleugje hoger zodat het warm
      // en vriendelijk klinkt in plaats van zakelijk.
      speakingRate: young ? 0.9 : 0.97,
      pitch: 2.0,
    },
  };

  const r = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    const e = new Error("TTS-fout " + r.status + ": " + t.slice(0, 300));
    e.status = 502;
    throw e;
  }
  const data = await r.json();
  if (!data || !data.audioContent) {
    const e = new Error("geen audio ontvangen");
    e.status = 502;
    throw e;
  }
  return data.audioContent; // base64 MP3
}

// Vercel-serverfunctie.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const audio = await synthesize(req.body || {});
    res.status(200).json({ audio });
  } catch (err) {
    const status = err && err.status ? err.status : 500;
    if (status !== 503) console.error("tts error:", err && err.message ? err.message : err);
    res.status(status).json({ error: err && err.message ? err.message : "TTS kon niet." });
  }
}
