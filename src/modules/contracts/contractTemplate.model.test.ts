import { ContractTemplate } from "./contractTemplate.model";

describe("ContractTemplate model — body fields", () => {
  it("exposes bodyJson, bodyHtml, and isDefault as model attributes", () => {
    const attrs = ContractTemplate.getAttributes();
    expect(attrs.bodyJson).toBeDefined();
    expect(attrs.bodyHtml).toBeDefined();
    expect(attrs.isDefault).toBeDefined();
  });

  it("maps body fields to snake_case columns", () => {
    const attrs = ContractTemplate.getAttributes() as Record<
      string,
      { field?: string }
    >;
    expect(attrs.bodyJson.field).toBe("body_json");
    expect(attrs.bodyHtml.field).toBe("body_html");
    expect(attrs.isDefault.field).toBe("is_default");
  });

  it("defaults isDefault to false", () => {
    const attrs = ContractTemplate.getAttributes() as Record<
      string,
      { defaultValue?: unknown }
    >;
    expect(attrs.isDefault.defaultValue).toBe(false);
  });
});
