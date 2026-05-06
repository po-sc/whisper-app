import { describe, it, expect } from "vitest";
import { T } from "../i18n";

const RU_KEYS = Object.keys(T.ru) as (keyof typeof T.ru)[];

describe("i18n", () => {
  it("EN has every key that RU has", () => {
    const missing = RU_KEYS.filter(k => !(k in T.en));
    expect(missing).toEqual([]);
  });

  it("RU has every key that EN has", () => {
    const missing = (Object.keys(T.en) as (keyof typeof T.en)[]).filter(k => !(k in T.ru));
    expect(missing).toEqual([]);
  });

  it("no key has an empty string value in RU", () => {
    const empty = RU_KEYS.filter(k => {
      const v = T.ru[k];
      return typeof v === "string" && v.trim() === "";
    });
    expect(empty).toEqual([]);
  });

  it("no key has an empty string value in EN", () => {
    const empty = RU_KEYS.filter(k => {
      const v = T.en[k as keyof typeof T.en];
      return typeof v === "string" && v.trim() === "";
    });
    expect(empty).toEqual([]);
  });

  it("langs object has same keys in both locales", () => {
    expect(Object.keys(T.ru.langs).sort()).toEqual(Object.keys(T.en.langs).sort());
  });

  it("formats object has same keys in both locales", () => {
    expect(Object.keys(T.ru.formats).sort()).toEqual(Object.keys(T.en.formats).sort());
  });
});
