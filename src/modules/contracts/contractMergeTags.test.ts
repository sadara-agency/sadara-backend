import { resolveMergeTags, buildTagContext } from "./contractMergeTags";

describe("buildTagContext", () => {
  it("maps player + contract fields and formats dates in Arabic style", () => {
    const ctx = buildTagContext({
      player: {
        firstNameAr: "سعد",
        lastNameAr: "الرويلي",
        nationality: "سعودي",
        nationalId: "1158870459",
        phone: "0556230960",
      },
      contract: {
        startDate: "2026-06-01T12:00:00",
        endDate: "2028-06-01T12:00:00",
        commissionPct: 10,
      },
    });
    expect(ctx["player.name"]).toBe("سعد الرويلي");
    expect(ctx["player.nationalId"]).toBe("1158870459");
    expect(ctx["contract.startDate"]).toBe("01 / 06 / 2026م");
    expect(ctx["contract.duration"]).toBe("سنتان (24 شهرًا)");
    expect(ctx["commission.pct"]).toBe("10");
  });
});

describe("resolveMergeTags", () => {
  const data = { "player.name": "سعد الرويلي", "commission.pct": "10" };

  it("replaces known tags with escaped values", () => {
    expect(resolveMergeTags("<p>{{player.name}}</p>", data)).toBe(
      "<p>سعد الرويلي</p>",
    );
  });

  it("handles inner whitespace and dotted keys", () => {
    expect(resolveMergeTags("<p>{{ commission.pct }}%</p>", data)).toBe(
      "<p>10%</p>",
    );
  });

  it("leaves unknown tags visible", () => {
    expect(resolveMergeTags("<p>{{unknown.tag}}</p>", data)).toBe(
      "<p>{{unknown.tag}}</p>",
    );
  });

  it("renders a blank span for empty-string values", () => {
    expect(
      resolveMergeTags("<p>{{player.name}}</p>", { "player.name": "" }),
    ).toBe('<p><span class="blank"></span></p>');
  });
});
