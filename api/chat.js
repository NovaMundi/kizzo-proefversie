import Anthropic from "@anthropic-ai/sdk";

// Leest ANTHROPIC_API_KEY uit de omgevingsvariabelen (zet je in Vercel).
const client = new Anthropic();

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

Antwoord altijd direct als Kizzo. Toon nooit je eigen redenering of uitleg over jezelf, alleen wat je tegen het kind zegt.`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const body = req.body || {};
    const childName = (body.childName || "vriend").toString().slice(0, 40);
    const age = body.age;
    const language = body.language === "en" ? "en" : "nl";
    const message = (body.message || "").toString().trim();
    if (!message) {
      res.status(400).json({ error: "message is verplicht" });
      return;
    }

    // Bouw de gespreksgeschiedenis om naar het Claude-formaat (laatste 12 beurten).
    const history = Array.isArray(body.history) ? body.history.slice(-12) : [];
    const msgs = [];
    for (const turn of history) {
      if (!turn || !turn.text) continue;
      msgs.push({
        role: turn.role === "kizzo" ? "assistant" : "user",
        content: turn.text.toString().slice(0, 1000),
      });
    }
    msgs.push({ role: "user", content: message.slice(0, 1000) });
    // De eerste beurt moet van het kind (user) zijn.
    while (msgs.length && msgs[0].role === "assistant") msgs.shift();

    const response = await client.messages.create({
      model: "claude-opus-4-8", // wil je goedkoper? vervang door "claude-sonnet-4-6"
      max_tokens: 500,
      system: systemPrompt({ childName, age, language }),
      messages: msgs,
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    res.status(200).json({ text: text || "Hmm, daar moet ik even over nadenken. Vraag het eens op een andere manier!" });
  } catch (err) {
    console.error("chat error:", err);
    res.status(500).json({ error: "Kizzo kon even niet antwoorden. Probeer het zo nog eens." });
  }
}
