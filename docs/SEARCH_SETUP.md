# Web-Recherche (Umfeld-Insights & Porter Five Forces) – Setup

Die Umfeld-Insights und Porter Five Forces nutzen eine externe Such-API für Web-Recherche. Ohne Konfiguration zeigt die UI eine Setup-Box und der Refresh-Button ist deaktiviert.

**Ein Refresh liefert:**
- **Umfeld-Insights (PESTEL)**: Externe Treiber aus verifizierten Web-Quellen
- **Porter Five Forces**: Wettbewerbsintensität, Markteintrittsbarrieren, Kunden-/Lieferantenmacht, Substitute – alle aus denselben Suchquellen extrahiert

## Erforderliche Umgebungsvariablen

| Variable | Beschreibung | Beispiel |
|----------|--------------|----------|
| `SEARCH_PROVIDER` | Provider: `serper` oder `brave` | `serper` |
| `SEARCH_API_KEY` | API-Schlüssel des Providers | `c787222a...` |

> **Hinweis:** `SERPER_API_KEY` wird nicht mehr verwendet. Nutze ausschließlich `SEARCH_API_KEY`.

## Serper (empfohlen)

1. Account erstellen: [serper.dev](https://serper.dev)
2. API Key kopieren
3. In `.env.local`:

```env
SEARCH_PROVIDER=serper
SEARCH_API_KEY=dein-serper-api-key
```

## Brave Search

1. API anfordern: [brave.com/search/api](https://brave.com/search/api)
2. In `.env.local`:

```env
SEARCH_PROVIDER=brave
SEARCH_API_KEY=dein-brave-api-key
```

## Dev-UI ein-/ausblenden

Im Development-Modus (`npm run dev`) werden zusätzlich angezeigt: **Letzter Job**, **PESTEL-Diagnostics**, **Erzwingen**-Button.

Um das Dashboard so zu sehen wie normale Nutzer (ohne diese Dev-Elemente), in `.env.local` setzen:

```env
NEXT_PUBLIC_HIDE_UMFELD_DEV_UI=true
```

Danach Dev-Server neu starten. Ohne diese Variable oder mit `false` siehst du die volle Dev-UI.

## Nach der Konfiguration

- **Dev-Server neu starten** nach Änderungen an `.env.local` (z.B. `npm run dev` stoppen und erneut starten)
- Der Refresh-Button wird aktiv
- Bei jedem Refresh werden Diagnostik-Daten im Job gespeichert (providerName, queriesCount, rawResultsCount, etc.)
- Pro Refresh: max. 27 DE- + 8 EN-Queries (PESTEL + Porter-relevante Themen: Wettbewerber, Marktanteile, Barrieren, Kunden-/Lieferantenmacht, Substitute)

## Domain-Whitelist & Trust-Regeln

- **Whitelist Pflicht**: Nur Domains aus der Registry werden akzeptiert
- **verifyUrl Pflicht**: Jede Quelle wird per HEAD/GET verifiziert
- **publishedAt Pflicht**: Quellen ohne Datum werden verworfen
- **minSourcesRequired = 2**, **minDomainsRequired = 2** pro Treiber

Die Domain-Registry liegt in `src/lib/server/domain-registry.ts` (Tier, Type, Locales).

## Whitelist datengestützt erweitern

Nach einem Refresh (Dev: PESTEL-Diagnostics aufklappen) stehen u.a.:

| Metrik | Bedeutung |
|--------|-----------|
| `sourcesDroppedNotWhitelistedByDomain` | Top 20 Domains, die wegen fehlender Whitelist verworfen wurden |
| `sourcesKeptByType` | Verteilung der behaltenen Quellen nach Typ (government, research, …) |
| `sourcesKeptByTier` | Verteilung nach Tier (tier1, tier2, tier3) |

**Vorgehen zur Erweiterung:**

1. Job-Diagnostics öffnen und `sourcesDroppedNotWhitelistedByDomain` prüfen
2. Seriöse Domains mit hohem `count` in `domain-registry.ts` ergänzen (DomainRule: domain, type, tier, locales)
3. Typ wählen: `government`, `statistics`, `central_bank`, `international_org`, `trade_association`, `research`, `industry_media`, `general_media`, `platform`
4. Tier: `tier1` (Behörden, Zentralbanken), `tier2` (Forschung, Verbände, Leitmedien), `tier3` (ergänzend)

## Fehlerbehebung

- **Ohne ENV**: UI zeigt Setup-Box, Refresh deaktiviert
- **Mit ENV**: Job läuft, bei Fehlern: `diagnostics.errorStage` zeigt die Phase ("search", "verify", "gpt", "persist")
- Job-Details in `external_insight_jobs.diagnostics` (JSONB)
- **401/403 (Serper)**: `SERPER_UNAUTHORIZED` – prüfe `SEARCH_API_KEY` in `.env.local` und Serper Dashboard
- **Diagnostics** (Dev): `apiKeyPresent`, `apiKeyLength`, `endpointUsed`, `providerName` in Job-Details
