# Bouwplan: van proefversie naar definitief product

Besluit (juli 2026): de webversie op app.kizzolearn.com wordt doorontwikkeld tot
het echte, verkoopbare product (web-first). Niet een aparte mobiele app. We bouwen
fase voor fase; elke fase wordt getest; niets gaat live zonder Tims akkoord.

## Stack
- **Frontend:** blijft voorlopig lichte HTML/JS op Vercel; splitsen in pagina's
  (kind-chat, ouder-login, ouderportaal) in plaats van één `index.html`. Pas een
  framework overwegen als het onhoudbaar wordt, geen onnodige herbouw.
- **Accounts + database:** Supabase (Postgres + auth + storage). Gratis start.
- **Betaling:** Stripe (Checkout + Customer Portal) voor abonnementen.
- **Gesprek:** Claude (`claude-opus-4-8`) via `api/chat.js` — blijft.
- **Stem:** Google Cloud TTS via `api/tts.js` — blijft (wacht op `GOOGLE_TTS_API_KEY`).

Accounts die Tim zelf aanmaakt (net als de Google-sleutel): Supabase (nu), Stripe (fase 4).

## Fases

### Fase 1 — Fundament (accounts + data)
- Supabase-project + koppeling (env vars in Vercel).
- Datamodel: `parents`, `children`, `conversations`, `messages`, `child_settings`
  (limieten/interesses), `usage` (dag-tellers).
- Ouder-registratie + login (magic link / e-mail).
- Kind-profielen onder een ouder (naam, leeftijd, taal) i.p.v. localStorage.
- Gesprekken serverkant opslaan i.p.v. localStorage, gekoppeld aan kind + ouder.
- **Testpunt:** ouder maakt account, kind praat, gesprek staat in de database en is
  op een ander toestel terug te zien.

### Fase 2 — Ouderportaal (monitoren, bijsturen, begrenzen)
- Ouderdashboard: gesprekken per kind teruglezen.
- Kizzo Kompas: interessegebieden, tijdslimiet, onderwerpen afbakenen.
- Die grenzen echt laten doorwerken: in de system prompt van Kizzo + quota afdwingen.
- **Testpunt:** ouder stelt een grens/limiet in en dat verandert aantoonbaar het gedrag.

### Fase 3 — Veiligheid
- Moderatielaag op kind-invoer én Kizzo-uitvoer (Azure AI Content Safety of
  Claude-gebaseerde check).
- Crisis-route (zwaar onderwerp → warm + verwijzing, ouder-signaal).
- AVG/DPIA-basis voor gegevens van kinderen onder de 13.
- **Testpunt:** ongepaste invoer wordt netjes afgevangen en gelogd voor de ouder.

### Fase 4 — Betaling
- Stripe-abonnementen: Gratis / Premium (€7,99) / Family (€12,99).
- Gratis-limieten afdwingen (bv. 3 gesprekken/dag, 2 kinderen).
- Customer Portal voor opzeggen/wijzigen.
- **Testpunt:** proefabonnement afsluiten en de limieten kloppen.

### Fase 5 — Afwerking & lancering
- Onboarding, polish, privacyverklaring/voorwaarden.
- "Proefversie" omdopen naar Kizzo (repo, teksten, README).
- Lanceren.

## Status
- [x] Proefversie live op app.kizzolearn.com (domein via GoDaddy).
- [x] Natuurlijke stem (Google TTS) + foto-fix gebouwd en gedeployed.
- [ ] Fase 1 — Fundament (volgende).
