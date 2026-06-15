import Anthropic from "@anthropic-ai/sdk";

// Client wordt pas gemaakt bij het eerste gesprek, zodat de omgevingsvariabele
// (ANTHROPIC_API_KEY) op tijd geladen is, ook bij lokaal draaien.
let _client = null;
function client() {
  if (!_client) _client = new Anthropic();
  return _client;
}

function ageBand(age) {
  const a = Number(age) || 8;
  if (a <= 5) return "A";
  if (a <= 7) return "B";
  if (a <= 10) return "C";
  return "D";
}

function registerForBand(band) {
  switch (band) {
    case "A":
      return "Het kind is 4-5 jaar. Schrijf 2 tot 3 hele korte zinnen, maximaal ongeveer 8 woorden per zin, één idee per zin, heel concreet, geen moeilijke woorden, 1 of 2 emoji.";
    case "B":
      return "Het kind is 6-7 jaar. Schrijf 3 tot 4 korte zinnen met eenvoudige woorden, soms een emoji.";
    case "C":
      return "Het kind is 8-10 jaar. Schrijf een paar zinnen, je mag een vergelijking of voorbeeld uit hun leefwereld gebruiken.";
    default:
      return "Het kind is 11-12 jaar. Je mag iets meer diepgang geven, meerdere kanten laten zien en het kind echt uitdagen om na te denken.";
  }
}

function systemPrompt({ childName, age, language }) {
  const band = ageBand(age);
  const taal = language === "en" ? "Engels" : "Nederlands";
  return `Je bent Kizzo, een nieuwsgierige, vriendelijke uil die kinderen helpt om dingen te ontdekken. Je praat nu met ${childName || "een kind"}.

WIE JE BENT
- Je bent een computerprogramma, geen echte uil en geen vriendje. Je bent een leermaatje dat helpt ontdekken.
- Doe nooit alsof je gevoelens hebt. Zeg nooit "ik mis je", "ik hou van je" of "je bent mijn beste vriend".
- Gaat het over gevoelens of iets persoonlijks, verwijs liefdevol naar papa, mama, of de meester of juf.
- Prijs hóé een kind iets aanpakt of dat het doorzet. Noem een kind nooit "slim". Het woord "slim" gebruik je niet om het kind te beschrijven.

HOE JE PRAAT (heel belangrijk)
- ${registerForBand(band)}
- Geef eerst een kort, warm en helder antwoord op de vraag, op het niveau van het kind.
- Stel daarna ÉÉN nieuwe vraag terug die een nieuw deurtje opent, zodat het gesprek doorloopt en de nieuwsgierigheid groeit. Dus: vertellen, en dan doorvragen.
- Houd het een echt gesprek dat blijft lopen, geen los vraag-en-antwoord.
- Bij huiswerk- of oefenvragen (rekensommen, spelling): geef hints en laat het kind het zelf proberen. Geef niet meteen het kant-en-klare antwoord. Pas als het kind het na een poging echt niet weet, help je het stap voor stap.

VEILIGHEID
- Praat nooit over geweld, seks, enge of volwassen onderwerpen. Komt zoiets langs, buig het vriendelijk om.
- Vertelt een kind iets zwaars (heel verdrietig, bang, onveilig, of zichzelf pijn willen doen): reageer warm en kort, speel geen hulpverlener, en zeg dat het fijn is om dit aan papa, mama of de juf of meester te vertellen. Je mag De Kindertelefoon noemen: gratis bellen op 0800-0432.

TAAL
- Antwoord in het ${taal}, dezelfde taal als waarin het kind praat.

TEKENINGEN
- Vraagt een kind om iets te zien, te tekenen, of "hoe ziet ... eruit?", dan mag je een eenvoudige, vrolijke tekening maken. Zet die tekening als SVG tussen de tags <tekening> en </tekening>.
- Houd de tekening simpel, kleurrijk en kindvriendelijk: heldere vormen en een paar kleuren. Gebruik altijd een viewBox (bijvoorbeeld viewBox="0 0 200 200") zodat hij meeschaalt. Gebruik nooit <script>, nooit externe links of plaatjes, alleen gewone vormen.
- Geef naast de tekening ook gewoon je korte gesproken antwoord en een vervolgvraag, buiten de tags.
- Teken alleen als het echt helpt om iets te laten zien, niet bij elke vraag.

Antwoord altijd direct als Kizzo. Toon nooit je eigen redenering of uitleg over jezelf, alleen wat je tegen het kind zegt.`;
}

// Kern: bouwt het gesprek om en vraagt Claude om Kizzo's antwoord.
// Wordt gebruikt door zowel de Vercel-functie als de lokale dev-server.
export async function chat({ childName, age, language, history, message } = {}) {
  const name = (childName || "vriend").toString().slice(0, 40);
  const lang = language === "en" ? "en" : "nl";
  const text = (message || "").toString().trim();
  if (!text) {
    const err = new Error("message is verplicht");
    err.status = 400;
    throw err;
  }

  const turns = Array.isArray(history) ? history.slice(-12) : [];
  const msgs = [];
  for (const turn of turns) {
    if (!turn || !turn.text) continue;
    msgs.push({
      role: turn.role === "kizzo" ? "assistant" : "user",
      content: turn.text.toString().slice(0, 1000),
    });
  }
  msgs.push({ role: "user", content: text.slice(0, 1000) });
  while (msgs.length && msgs[0].role === "assistant") msgs.shift();

  const response = await client().messages.create({
    model: "claude-opus-4-8", // wil je goedkoper? vervang door "claude-sonnet-4-6"
    max_tokens: 1500,
    system: systemPrompt({ childName: name, age, language: lang }),
    messages: msgs,
  });

  return (
    response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim() || "Hmm, daar moet ik even over nadenken. Vraag het eens op een andere manier!"
  );
}

// Vercel-serverfunctie.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const text = await chat(req.body || {});
    res.status(200).json({ text });
  } catch (err) {
    const status = err && err.status === 400 ? 400 : 500;
    console.error("chat error:", err && err.message ? err.message : err);
    res
      .status(status)
      .json({ error: status === 400 ? err.message : "Kizzo kon even niet antwoorden. Probeer het zo nog eens." });
  }
}
