import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildWhatsAppShareUrl,
  computeReferralStats,
  conversionRate,
  filterReferralItems,
  formatConversionPercent,
  paginateItems,
  rankDriversByRegistered,
  sortReferralItems,
} from "./compute.ts";
import type { DriverReferralListItem } from "./types.ts";

function item(
  partial: Partial<DriverReferralListItem> & { id: string; name: string },
): DriverReferralListItem {
  return {
    registeredAt: null,
    registeredAtLabel: "—",
    status: "INVITED",
    statusLabel: "Invitado",
    hasFirstService: false,
    firstServiceLabel: "No",
    ...partial,
  };
}

describe("referrals compute", () => {
  it("calcula tasas de conversión", () => {
    assert.equal(conversionRate(25, 100), 0.25);
    assert.equal(conversionRate(0, 0), null);
    assert.equal(formatConversionPercent(0.255), "25.5%");
    assert.equal(formatConversionPercent(null), "—");
  });

  it("normaliza estadísticas", () => {
    const stats = computeReferralStats({
      invited: 10,
      registered: 4,
      beta: 1,
      active: 2,
      firstServiceCompleted: 1,
    });
    assert.deepEqual(stats, {
      invited: 10,
      registered: 4,
      beta: 1,
      active: 2,
      firstServiceCompleted: 1,
    });
  });

  it("filtra, ordena y pagina listados", () => {
    const items = [
      item({
        id: "1",
        name: "Ana",
        status: "ACTIVE",
        statusLabel: "Activo",
        registeredAt: "2026-01-02T00:00:00.000Z",
      }),
      item({
        id: "2",
        name: "Bruno",
        status: "BETA",
        statusLabel: "Beta",
        registeredAt: "2026-01-03T00:00:00.000Z",
      }),
      item({
        id: "3",
        name: "Carla",
        status: "INVITED",
        statusLabel: "Invitado",
        registeredAt: "2026-01-01T00:00:00.000Z",
      }),
    ];

    const filtered = filterReferralItems(items, "bru");
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.name, "Bruno");

    const sorted = sortReferralItems(items, "name_asc");
    assert.deepEqual(
      sorted.map((row) => row.name),
      ["Ana", "Bruno", "Carla"],
    );

    const page = paginateItems(items, 2, 2);
    assert.equal(page.page, 2);
    assert.equal(page.totalPages, 2);
    assert.equal(page.items.length, 1);
    assert.equal(page.items[0]?.name, "Carla");
  });

  it("rankea top conductores por registrados", () => {
    const ranking = rankDriversByRegistered(
      [
        {
          driverId: "a",
          driverName: "A",
          invited: 5,
          registered: 1,
          active: 1,
        },
        {
          driverId: "b",
          driverName: "B",
          invited: 3,
          registered: 3,
          active: 2,
        },
        {
          driverId: "c",
          driverName: "C",
          invited: 0,
          registered: 0,
          active: 0,
        },
      ],
      10,
    );
    assert.equal(ranking.length, 2);
    assert.equal(ranking[0]?.driverId, "b");
    assert.equal(ranking[1]?.driverId, "a");
  });

  it("prepara URL de WhatsApp sin abrirla", () => {
    const url = buildWhatsAppShareUrl("https://whatxia.app/i/ABC", "Luis");
    assert.match(url, /^https:\/\/wa\.me\/\?text=/);
    assert.match(url, /ABC/);
  });
});
