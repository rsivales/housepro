import { NextResponse } from "next/server";
import { lookup } from "node:dns/promises";

import { getSession } from "@/lib/supabase/auth";

/**
 * Importar fotos por link — Google Drive (pasta ou ficheiro) ou URL directo de
 * imagem. Pensado para o fluxo real: o fotógrafo entrega as fotos profissionais
 * numa **pasta partilhada do Drive**, e o consultor só cola o link.
 *
 *  POST  { url }            → lista os ficheiros de imagem a importar
 *                             [{ name, fetchUrl }] (fetchUrl = proxy same-origin)
 *  GET   ?id=<driveId>      → descarrega um ficheiro do Drive (sem CORS)
 *  GET   ?src=<url>         → descarrega um URL directo de imagem (com guardas)
 *
 * O download é feito no servidor (evita CORS) e o cliente reaproveita todo o
 * pipeline existente: redução, conversão para JPEG e marca de água.
 */

const API_KEY = process.env.GOOGLE_DRIVE_API_KEY;
const MAX_BYTES = 30_000_000; // 30 MB por foto (fotos profissionais são pesadas)
const MAX_FILES = 60;

/** Extrai o ID de pasta ou ficheiro de um link do Google Drive. */
function parseDrive(url: string): { kind: "folder" | "file"; id: string } | null {
  const folder = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folder) return { kind: "folder", id: folder[1] };
  const file = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (file) return { kind: "file", id: file[1] };
  const open = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (open) return { kind: "file", id: open[1] };
  return null;
}

function isDriveHost(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return h.endsWith("google.com") || h.endsWith("googleusercontent.com") || h.endsWith("googleapis.com");
  } catch {
    return false;
  }
}

/** Rejeita destinos internos/privados (defesa contra SSRF no proxy de URL). */
function isPrivateIp(ip: string): boolean {
  if (ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) return true;
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
  const [a, b] = p;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) || // link-local / metadata (169.254.169.254)
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

async function assertPublicUrl(raw: string): Promise<URL> {
  const u = new URL(raw);
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    throw new Error("Só são aceites endereços http(s).");
  }
  // Domínios do Google são de confiança (a própria API os serve).
  if (!isDriveHost(raw)) {
    const { address } = await lookup(u.hostname);
    if (isPrivateIp(address)) throw new Error("Endereço não permitido.");
  }
  return u;
}

// --- POST: resolve o link numa lista de imagens a importar -------------------

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.demo) {
    return NextResponse.json({ error: "Sessão inválida — faça login." }, { status: 401 });
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const url = (body.url ?? "").trim();
  if (!url) return NextResponse.json({ error: "Cole um link." }, { status: 400 });

  const drive = parseDrive(url);

  // Link do Google Drive
  if (drive) {
    if (!API_KEY) {
      return NextResponse.json(
        {
          error:
            "Importação do Google Drive por configurar. O administrador precisa de definir GOOGLE_DRIVE_API_KEY.",
          needsKey: true,
        },
        { status: 503 }
      );
    }

    if (drive.kind === "file") {
      return NextResponse.json({
        files: [{ name: "foto", fetchUrl: `/api/import/drive?id=${drive.id}` }],
      });
    }

    // Pasta partilhada: lista as imagens (só funciona se a pasta estiver
    // partilhada "qualquer pessoa com o link").
    const q = encodeURIComponent(`'${drive.id}' in parents and mimeType contains 'image/'`);
    const api =
      `https://www.googleapis.com/drive/v3/files?q=${q}` +
      `&key=${API_KEY}&fields=files(id,name,mimeType)&pageSize=${MAX_FILES}` +
      `&supportsAllDrives=true&includeItemsFromAllDrives=true`;
    try {
      const res = await fetch(api);
      const data = await res.json();
      if (!res.ok) {
        return NextResponse.json(
          { error: data?.error?.message ?? "Não foi possível ler a pasta do Drive." },
          { status: 400 }
        );
      }
      const files = (data.files ?? [])
        .filter((f: { mimeType?: string }) => (f.mimeType ?? "").startsWith("image/"))
        .map((f: { id: string; name: string }) => ({
          name: f.name,
          fetchUrl: `/api/import/drive?id=${f.id}`,
        }));
      if (files.length === 0) {
        return NextResponse.json(
          {
            error:
              "A pasta não tem imagens visíveis. Confirme que está partilhada como 'qualquer pessoa com o link'.",
          },
          { status: 400 }
        );
      }
      return NextResponse.json({ files });
    } catch {
      return NextResponse.json({ error: "Falha a contactar o Google Drive." }, { status: 502 });
    }
  }

  // URL directo de imagem (Dropbox direct, etc.)
  try {
    await assertPublicUrl(url);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Link inválido." },
      { status: 400 }
    );
  }
  return NextResponse.json({
    files: [{ name: "imagem", fetchUrl: `/api/import/drive?src=${encodeURIComponent(url)}` }],
  });
}

// --- GET: descarrega os bytes da imagem (sem CORS para o cliente) ------------

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.demo) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const src = searchParams.get("src");

  let target: string;
  if (id) {
    if (!API_KEY) return new NextResponse("drive not configured", { status: 503 });
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) return new NextResponse("bad id", { status: 400 });
    target = `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${API_KEY}&supportsAllDrives=true`;
  } else if (src) {
    try {
      await assertPublicUrl(src);
    } catch {
      return new NextResponse("blocked", { status: 400 });
    }
    target = src;
  } else {
    return new NextResponse("missing target", { status: 400 });
  }

  try {
    const res = await fetch(target, { redirect: "follow" });
    if (!res.ok) return new NextResponse("upstream error", { status: 502 });

    const ct = res.headers.get("content-type") ?? "";
    if (!ct.startsWith("image/")) {
      return new NextResponse("not an image", { status: 415 });
    }
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len && len > MAX_BYTES) return new NextResponse("too large", { status: 413 });

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) return new NextResponse("too large", { status: 413 });

    return new NextResponse(buf, {
      status: 200,
      headers: { "content-type": ct, "cache-control": "no-store" },
    });
  } catch {
    return new NextResponse("fetch failed", { status: 502 });
  }
}
