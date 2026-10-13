"use client";

import { useState, type ReactNode } from "react";
import { Columns2, Columns3 } from "lucide-react";
import styles from "@/app/consultor/[id]/profile.module.css";

export function ConsultantPropertyGrid({ children }: { children: ReactNode }) {
  const [columns, setColumns] = useState<2 | 3>(2);

  return (
    <>
      <div className={styles.gridControls} role="group" aria-label="Disposição dos imóveis">
        <span>Visualização</span>
        {([2, 3] as const).map((count) => {
          const Icon = count === 2 ? Columns2 : Columns3;
          return (
            <button
              key={count}
              type="button"
              aria-label={`Mostrar imóveis em ${count} colunas`}
              title={`${count} colunas`}
              aria-pressed={columns === count}
              onClick={() => setColumns(count)}
            >
              <Icon size={20} aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <div className={`${styles.propertyList} ${columns === 3 ? styles.propertyListThree : ""}`}>
        {children}
      </div>
    </>
  );
}
