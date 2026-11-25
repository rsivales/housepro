import {describe,it,expect} from "vitest";
import {slugify} from "./slug";
describe("campaign URLs",()=>{it("normalizes Portuguese titles into safe single-segment slugs",()=>{expect(slugify("Descubra 3 apartamentos à venda em Faro")).toBe("descubra-3-apartamentos-a-venda-em-faro");expect(slugify(" ../Côte d'Azur? ")).toBe("cote-d-azur")});});
