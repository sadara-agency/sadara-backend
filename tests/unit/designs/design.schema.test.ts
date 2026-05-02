import {
  createDesignSchema,
  updateDesignSchema,
  designQuerySchema,
} from "../../../src/modules/designs/design.validation";

const validBody = {
  title: "Match Day vs Al-Nassr",
  type: "Design",
};

describe("Design Schemas", () => {
  describe("createDesignSchema", () => {
    it("accepts the minimal valid payload", () => {
      expect(createDesignSchema.safeParse(validBody).success).toBe(true);
    });

    it("defaults status to Drafting", () => {
      expect(createDesignSchema.parse(validBody).status).toBe("Drafting");
    });

    it("defaults format to square_1080", () => {
      expect(createDesignSchema.parse(validBody).format).toBe("square_1080");
    });

    it("rejects an empty title", () => {
      expect(
        createDesignSchema.safeParse({ ...validBody, title: "" }).success,
      ).toBe(false);
    });

    it("rejects an unknown type", () => {
      expect(
        createDesignSchema.safeParse({ ...validBody, type: "infographic" })
          .success,
      ).toBe(false);
    });

    it("rejects an unknown format", () => {
      expect(
        createDesignSchema.safeParse({ ...validBody, format: "story_9_16" })
          .success,
      ).toBe(false);
    });

    it("rejects a non-uuid playerId", () => {
      expect(
        createDesignSchema.safeParse({ ...validBody, playerId: "not-a-uuid" })
          .success,
      ).toBe(false);
    });

    it("rejects an invalid assetUrl", () => {
      expect(
        createDesignSchema.safeParse({ ...validBody, assetUrl: "not a url" })
          .success,
      ).toBe(false);
    });

    it("caps tags at 20 entries", () => {
      const tooMany = Array.from({ length: 21 }, (_, i) => `tag${i}`);
      expect(
        createDesignSchema.safeParse({ ...validBody, tags: tooMany }).success,
      ).toBe(false);
    });
  });

  describe("updateDesignSchema", () => {
    it("accepts a partial update", () => {
      expect(updateDesignSchema.safeParse({ status: "Approved" }).success).toBe(
        true,
      );
    });

    it("accepts an empty object", () => {
      expect(updateDesignSchema.safeParse({}).success).toBe(true);
    });
  });

  describe("designQuerySchema", () => {
    it("defaults sort to created_at and order to desc", () => {
      const parsed = designQuerySchema.parse({});
      expect(parsed.sort).toBe("created_at");
      expect(parsed.order).toBe("desc");
    });

    it("rejects an unknown sort field", () => {
      expect(designQuerySchema.safeParse({ sort: "rating" }).success).toBe(
        false,
      );
    });

    it("coerces numeric strings for page/limit", () => {
      const parsed = designQuerySchema.parse({ page: "2", limit: "25" });
      expect(parsed.page).toBe(2);
      expect(parsed.limit).toBe(25);
    });

    it("clamps limit to its maximum", () => {
      expect(
        designQuerySchema.safeParse({ limit: 9999 }).success,
      ).toBe(false);
    });
  });
});
