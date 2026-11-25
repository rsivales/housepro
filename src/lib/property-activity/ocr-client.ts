"use client";

import type { Worker } from "tesseract.js";
function prepareImage(file:File):Promise<HTMLCanvasElement> {
  return createImageBitmap(file).then(bitmap=>{
    try {
      const scale=Math.min(2.5,Math.max(1,1800/Math.max(bitmap.width,bitmap.height)));
      const limit=Math.min(scale,3000/Math.max(bitmap.width,bitmap.height));
      const canvas=document.createElement("canvas");
      canvas.width=Math.round(bitmap.width*limit);canvas.height=Math.round(bitmap.height*limit);
      const context=canvas.getContext("2d",{willReadFrequently:true});
      if(!context)throw new Error("Não foi possível preparar a fotografia.");
      context.fillStyle="#fff";context.fillRect(0,0,canvas.width,canvas.height);
      context.drawImage(bitmap,0,0,canvas.width,canvas.height);
      const pixels=context.getImageData(0,0,canvas.width,canvas.height);
      for(let i=0;i<pixels.data.length;i+=4){
        const grey=.299*pixels.data[i]+.587*pixels.data[i+1]+.114*pixels.data[i+2];
        const value=Math.max(0,Math.min(255,(grey-128)*1.35+145));
        pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;
      }
      context.putImageData(pixels,0,0);
      return canvas;
    }finally{bitmap.close();}
  });
}
export async function readActivityDocument(file:File,onProgress:(message:string)=>void):Promise<string> {
  let worker:Worker|undefined;
  async function recognize(image:File|HTMLCanvasElement) {
    if(!worker) {
      const {createWorker}=await import("tesseract.js");
      worker=await createWorker("por+eng",1,{
        workerPath:"https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js",
        corePath:"https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0",
        langPath:"https://tessdata.projectnaptha.com/4.0.0",
        logger:message=>{if(message.status==="recognizing text")onProgress(`A ler documento: ${Math.round(message.progress*100)}%`);},
      });
    }
    const result=await worker.recognize(image);
    return result.data;
  }
  try {
    if(file.type!=="application/pdf"){
      const original=await recognize(file);
      onProgress("A melhorar a leitura da fotografia…");
      const canvas=await prepareImage(file).catch(()=>null);
      if(!canvas)return original.text;
      try {
        const enhanced=await recognize(canvas);
        // Confidence alone favours short, incomplete readings. Require comparable coverage.
        return enhanced.confidence>original.confidence+5&&enhanced.text.trim().length>=original.text.trim().length*.75
          ?enhanced.text:original.text;
      }finally{canvas.width=0;canvas.height=0;}
    }
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
          pages.push((await recognize(canvas)).text);
          canvas.width=0;canvas.height=0;
        }
        page.cleanup();
      }
      return pages.join("\n\n").slice(0,50000);
    }finally{await task.destroy();}
  }finally{await worker?.terminate();}
}
