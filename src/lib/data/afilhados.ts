import { overrideForLevel, maxOverrideDepth, DEFAULT_SPLIT } from "@/lib/commission/split";

/**
 * Afilhados (padrinhado / teams) — a árvore de consultores que um agente
 * apadrinha e dos quais recebe override sobre a faturação.
 *
 * Cada nó é um consultor apadrinhado; o nível é a distância ao agente raiz
 * (1 = afilhado direto). O override que o padrinho recebe de cada afilhado
 * depende do nível (ver DEFAULT_SPLIT.overrideTiers), limitado à profundidade
 * máxima. Em produção isto vem do Supabase (tabela `sponsorships`).
 */
export interface AfilhadoNode {
  id: string;
  name: string;
  contact: string;
  /** Entrou como consultor em… (ISO). */
  joinedAt: string;
  /** Já está a faturar? (afilhados novos podem ainda não gerar override). */
  active: boolean;
  /** Faturação de comissão bruta no mês corrente (€) — base do override. */
  monthlyGross: number;
  children: AfilhadoNode[];
}

/** Árvore demo, com raiz no consultor "rui" (o utilizador demo). */
export const demoAfilhados: AfilhadoNode = {
  id: "rui",
  name: "Rui (eu)",
  contact: "",
  joinedAt: "2023-01-10",
  active: true,
  monthlyGross: 0,
  children: [
    {
      id: "af-sofia",
      name: "Sofia Marques",
      contact: "+351 912 000 111",
      joinedAt: "2025-03-02",
      active: true,
      monthlyGross: 8000,
      children: [
        {
          id: "af-andre",
          name: "André Lopes",
          contact: "+351 913 222 333",
          joinedAt: "2025-06-15",
          active: true,
          monthlyGross: 3000,
          children: [
            {
              id: "af-tomas",
              name: "Tomás Nunes",
              contact: "+351 914 444 555",
              joinedAt: "2025-11-20",
              active: true,
              monthlyGross: 2000,
              children: [],
            },
          ],
        },
        {
          id: "af-beatriz",
          name: "Beatriz Alves",
          contact: "+351 915 666 777",
          joinedAt: "2026-07-01",
          active: false,
          monthlyGross: 0,
          children: [],
        },
      ],
    },
    {
      id: "af-miguel",
      name: "Miguel Faria",
      contact: "+351 916 888 999",
      joinedAt: "2025-04-18",
      active: true,
      monthlyGross: 5000,
      children: [
        {
          id: "af-ines",
          name: "Inês Cardoso",
          contact: "+351 917 111 222",
          joinedAt: "2025-09-05",
          active: true,
          monthlyGross: 4000,
          children: [],
        },
      ],
    },
  ],
};

export interface FlatAfilhado extends Omit<AfilhadoNode, "children"> {
  /** Nível relativo ao agente raiz (1 = direto). */
  level: number;
  /** Override que o padrinho raiz recebe deste afilhado este mês (€). */
  override: number;
  /** % de override do nível. */
  overridePct: number;
}

/** Achata a árvore (excluindo a raiz) com nível e override calculados. */
export function flattenAfilhados(
  root: AfilhadoNode,
  maxDepth = maxOverrideDepth()
): FlatAfilhado[] {
  const out: FlatAfilhado[] = [];
  const walk = (node: AfilhadoNode, level: number) => {
    if (level > maxDepth) return; // além da profundidade não gera override
    for (const child of node.children) {
      const overridePct = DEFAULT_SPLIT.overrideTiers[level - 1] ?? 0;
      out.push({
        id: child.id,
        name: child.name,
        contact: child.contact,
        joinedAt: child.joinedAt,
        active: child.active,
        monthlyGross: child.monthlyGross,
        level,
        overridePct,
        override: child.active ? overrideForLevel(child.monthlyGross, level) : 0,
      });
      walk(child, level + 1);
    }
  };
  walk(root, 1);
  return out;
}

export interface AfilhadoStats {
  total: number;
  ativos: number;
  /** Override total estimado a receber este mês (€). */
  estimatedMonthly: number;
  /** Por nível: contagem + override. */
  byLevel: { level: number; count: number; pct: number; override: number }[];
}

export function afilhadoStats(root: AfilhadoNode): AfilhadoStats {
  const flat = flattenAfilhados(root);
  const maxDepth = maxOverrideDepth();
  const byLevel = Array.from({ length: maxDepth }, (_, i) => {
    const level = i + 1;
    const rows = flat.filter((f) => f.level === level);
    return {
      level,
      count: rows.length,
      pct: DEFAULT_SPLIT.overrideTiers[i] ?? 0,
      override: rows.reduce((s, r) => s + r.override, 0),
    };
  });
  return {
    total: flat.length,
    ativos: flat.filter((f) => f.active).length,
    estimatedMonthly: flat.reduce((s, f) => s + f.override, 0),
    byLevel,
  };
}

/**
 * Cadeia de padrinhos (upline) de um membro na árvore demo, do padrinho direto
 * para cima: [{id,name} nível 1, nível 2, …]. Vazio se não encontrado.
 */
export function uplineOf(root: AfilhadoNode, targetId: string): { id: string; name: string }[] {
  const path: AfilhadoNode[] = [];
  const find = (node: AfilhadoNode): boolean => {
    if (node.id === targetId) return true;
    for (const c of node.children) {
      path.push(node);
      if (find(c)) return true;
      path.pop();
    }
    return false;
  };
  if (!find(root)) return [];
  // `path` = ancestrais da raiz até ao pai direto; inverter para pai→cima.
  return path
    .reverse()
    .map((n) => ({ id: n.id, name: n.name }));
}
