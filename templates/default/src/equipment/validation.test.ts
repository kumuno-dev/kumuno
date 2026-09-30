import { expect, test } from "vitest";
import { parseEquipment, listQuery } from "./validation";
function form(change: Record<string,string> = {}) { const f = new FormData(); for(const [k,v] of Object.entries({ id: "", name: "PC", category: "端末", purchaseDate: "2026-10-01", purchasePrice: "120000.25", departmentId: "", assignedUserId: "", status: "STORAGE", notes: "", ...change })) f.set(k,v); return f; }
test("価格を文字列で保持し、実在する日付と状態を検査する", () => {
 expect(parseEquipment(form()).purchasePrice).toBe("120000.25");
 const invalid: Record<string,string>[] = [{ purchasePrice: "-1" },{ purchasePrice: "1.001" },{ purchasePrice: "1e5" },{ purchaseDate: "2026-02-30" },{ status: "toString" },{ name: " " },{ assignedUserId: "invalid" }];
 for(const change of invalid) expect(() => parseEquipment(form(change))).toThrow();
});
test("検索と並び順・ページを許可した値へ絞る", () => {
 expect(listQuery({ sort: "DROP TABLE", page: "-1", q: " pc " })).toMatchObject({ sort: "name", page: 1, q: "pc" });
 expect(listQuery({ page: "999999999999", q: ["a","b"] })).toMatchObject({ page: 1, q: "" });
});
