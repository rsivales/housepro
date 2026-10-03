#!/usr/bin/env node
/**
 * Ingestão semanal de notícias imobiliárias — corre no GitHub Actions
 * (runner com acesso normal à internet), não no ambiente de desenvolvimento.
 *
 * Lê feeds RSS reais de fontes do setor, normaliza cada item para o
 * formato esperado por /api/admin/news/ingest e envia-os. Nenhum conteúdo
 * é inventado: usa-se sempre o título e o resumo que a própria fonte
 * publica, com o link para o artigo original. Os artigos entram sempre
 * como "pendente" — a aprovação final (com escolha de foto) é manual em
 * /admin/website/artigos.
 *
 * Se uma fonte estiver em baixo ou mudar de URL, essa fonte é ignorada
 * nessa semana (log de aviso) sem travar as restantes.
 *
 * Env vars obrigatórias (GitHub Secrets):
 *   ARTICLES_INGEST_URL     ex.: https://housepro.pt/api/admin/news/ingest
 *   ARTICLES_INGEST_SECRET  o mesmo valor definido em Vercel
 */
import Parser from "rss-parser";

const INGEST_URL = process.env.ARTICLES_INGEST_URL;
const INGEST_SECRET = process.env.ARTICLES_INGEST_SECRET;

if (!INGEST_URL || !INGEST_SECRET) {
  console.error("Faltam ARTICLES_INGEST_URL e/ou ARTICLES_INGEST_SECRET.");
  process.exit(1);
}

// Fontes reais do setor imobiliário/económico em Portugal. Ajustar aqui
// caso uma fonte mude de URL — cada uma é independente das outras.
const FEEDS = [
  { url: "https://www.idealista.pt/news/feed", source: "Idealista News", category: "Mercado" },
  { url: "https://www.publico.pt/rss/economia", source: "Público Economia", category: "Legislação" },
  { url: "https://eco.sapo.pt/feed/", source: "ECO", category: "Investimento" },
  { url: "https://diarioimobiliario.pt/feed/", source: "Diário Imobiliário", category: "Mercado" },
  { url: "https://www.vidaimobiliaria.com/feed/", source: "Vida Imobiliária", category: "Dicas" },
];

const MAX_PER_FEED = 2;
const MAX_TOTAL = 6;
const FETCH_TIMEOUT_MS = 15_000;

const parser = new Parser({ timeout: FETCH_TIMEOUT_MS });

function cleanExcerpt(raw) {
  if (!raw) return "";
  const text = raw
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 280 ? `${text.slice(0, 277)}...` : text;
}

function toIsoDate(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

async function readFeed(feed) {
  try {
    const parsed = await parser.parseURL(feed.url);
    const items = (parsed.items ?? []).slice(0, MAX_PER_FEED);
    console.log(`[ok] ${feed.source}: ${items.length} item(ns)`);
    return items.map((item) => {
      const excerpt = cleanExcerpt(item.contentSnippet || item.summary || item.content || item.title);
      return {
        category: feed.category,
        title: (item.title || "").trim(),
        excerpt,
        body: excerpt ? [excerpt] : [],
        source: feed.source,
        sourceUrl: item.link || undefined,
        date: toIsoDate(item.isoDate || item.pubDate),
      };
    });
  } catch (error) {
    console.warn(`[skip] ${feed.source} (${feed.url}): ${error.message}`);
    return [];
  }
}

async function main() {
  const results = await Promise.all(FEEDS.map(readFeed));
  const drafts = results
    .flat()
    .filter((d) => d.title && d.excerpt)
    .slice(0, MAX_TOTAL);

  if (drafts.length === 0) {
    console.log("Nenhum artigo novo encontrado esta semana — nada para enviar.");
    return;
  }

  const res = await fetch(INGEST_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-ingest-secret": INGEST_SECRET },
    body: JSON.stringify({ articles: drafts }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`Falha na ingestão (HTTP ${res.status}):`, body);
    process.exit(1);
  }
  console.log("Ingestão concluída:", body);
}

main().catch((error) => {
  console.error("Erro inesperado na ingestão:", error);
  process.exit(1);
});
