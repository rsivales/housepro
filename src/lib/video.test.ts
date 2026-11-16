import { describe, expect, it } from "vitest";
import { youTubeId } from "./video";

describe("youTubeId", () => {
  const id = "rv9HbYPCm5w";
  it.each([
    `https://youtu.be/${id}`,
    `https://youtu.be/${id}?si=4Duc0VfCTTycJ6ai`,
    `https://www.youtube.com/watch?v=${id}`,
    `https://www.youtube.com/watch?v=${id}&t=12s`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
    `youtu.be/${id}`,
    id,
  ])("reconhece %s", (url) => expect(youTubeId(url)).toBe(id));

  it.each(["https://example.com/testemunho.mp4", "", undefined, "https://youtube.com/watch?v=curto"])(
    "ignora %s",
    (url) => expect(youTubeId(url)).toBeNull(),
  );
});
