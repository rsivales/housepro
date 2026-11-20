"use client";

import type { Worker } from "tesseract.js";
export async function readActivityDocument(file:File,onProgress:(message:string)=>void):Promise<string> {
  let worker:Worker|undefined;
  async function recognize(image:File|HTMLCanvasElement) {
    if(!worker) {
      const {createWorker}=await import("tesseract.js");
      worker=await createWorker("por",1,{
        workerPath:"https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js",
        corePath:"https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0",
        langPath:"https://tessdata.projectnaptha.com/4.0.0",
        logger:message=>{if(message.status==="recognizing text")onProgress(`A ler documento: ${Math.round(message.progress*100)}%`);},
      });
    }
    const result=await worker.recognize(image);
    return result.data.text;
  }
  try {
    if(file.type!=="application/pdf")return await recognize(file);
    const pdfjs=await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc=`https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())});
    const pdf=await task.promise;
    try {
      if(pdf.numPages>12)throw new Error("Este PDF tem mais de 12 páginas. Carregue uma ficha de cada vez.");
      const pages:string[]=[];
      for(let n=1;n<=pdf.numPages;n++) {
        onProgress(`A ler página ${n} de ${pdf.numPages}…`);
        const page=await pdf.getPage(n);
        const content=await page.getTextContent();
        const extracted=content.items.map(item=>"str" in item?item.str+("hasEOL" in item&&item.hasEOL?"\n":" "):"").join("");
        if(extracted.trim().length>30)pages.push(extracted);
        else {
          const viewport=page.getViewport({scale:2});
          if(viewport.width*viewport.height>18000000)throw new Error("A página é demasiado grande. Utilize uma cópia digitalizada em formato A4.");
          const canvas=document.createElement("canvas");
          canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
          const context=canvas.getContext("2d");
          if(!context)throw new Error("Não foi possível preparar a página para leitura.");
          await page.render({canvas,canvasContext:context,viewport}).promise;
          pages.push(await recognize(canvas));
          canvas.width=0;canvas.height=0;
        }
        page.cleanup();
      }
      return pages.join("\n\n").slice(0,50000);
    }finally{await task.destroy();}
  }finally{await worker?.terminate();}
}
