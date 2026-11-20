import { expect,it } from "vitest";
import { houseproEmail } from "./email-template";
it("brands emails and escapes untrusted lead content",()=>{const html=houseproEmail('<img onerror="bad">','Olá <script>alert(1)</script>\nhttps://housepro.pt/imovel/123',{label:"Ver sugestões",path:"/app/matches"});expect(html).toContain("/brand/housepro-red.png");expect(html).toContain("&lt;script&gt;");expect(html).not.toContain("<script>");expect(html).toContain('href="https://housepro.pt/imovel/123"');expect(html).toContain('href="https://housepro.pt/app/matches"');});
it("does not render external or protocol-relative calls to action",()=>{expect(houseproEmail("Teste","Olá",{label:"BAD",path:"//evil.example"})).not.toContain("BAD");});
