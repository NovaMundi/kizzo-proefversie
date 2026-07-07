# Kizzo proefversie

Een werkende webversie van Kizzo om met een kleine groep bevriende gezinnen te testen. Geen app-installatie nodig: je kind opent gewoon een link in de browser, praat of typt met Kizzo, en jij kunt het gesprek op hetzelfde toestel teruglezen.

Dit is bewust simpel gehouden voor een test:
- Eén `index.html` (de app) + serverfuncties: `api/chat.js` (praat veilig met Claude) en `api/tts.js` (natuurlijke stem via Google).
- Stem in via de browser (microfoon). Stem uit via Google Cloud Text-to-Speech (natuurlijke Nederlandse stem); zonder Google-sleutel valt de app terug op de browserstem.
- Gesprekken worden lokaal op het toestel bewaard, niet in een database.

## Online zetten (eenmalig, ~3 minuten)

De app moet ergens draaien omdat de Claude-sleutel veilig op de server moet staan. Het simpelst is Vercel (gratis).

1. Ga naar **vercel.com** en log in met **GitHub** (account NovaMundi).
2. **Add New… → Project** en importeer de repo **`kizzo-proefversie`**.
3. Open **Environment Variables** en voeg toe:
   - Naam: `ANTHROPIC_API_KEY` — waarde: je Claude-sleutel (begint met `sk-ant-...`)
   - Naam: `GOOGLE_TTS_API_KEY` — waarde: je Google Cloud-sleutel voor Text-to-Speech (optioneel; zonder deze gebruikt de app de browserstem)
4. Klik **Deploy**. Na een minuut krijg je een link zoals `https://kizzo-proefversie.vercel.app`.
5. Stuur die link naar je testgezinnen. Klaar.

Sneller: gebruik de knop hieronder, dan vraagt Vercel meteen om je sleutel.

[![Deploy met Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/NovaMundi/kizzo-proefversie&env=ANTHROPIC_API_KEY&envDescription=Je%20Claude-sleutel%20(sk-ant-...))

## Lokaal proberen (optioneel, voor jezelf)

```
npm install
npm i -g vercel
vercel dev
```
Zet je sleutel lokaal in een `.env` met `ANTHROPIC_API_KEY=sk-ant-...`.

## Goed om te weten

- **Model:** standaard `claude-opus-4-8` (beste kwaliteit). Wil je goedkoper testen, vervang in `api/chat.js` de modelnaam door `claude-sonnet-4-6`.
- **Kosten:** je betaalt per gesprek een paar cent aan Claude. Voor een testgroepje is dat hooguit een paar euro.
- **Privacy:** gesprekken staan alleen lokaal op het toestel van het kind. Er is nog geen ouderaccount of database. Dit is een proefopstelling, geen productieversie.
