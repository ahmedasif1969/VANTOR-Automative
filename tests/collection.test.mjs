import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import ts from "typescript";

const source = await fs.readFile(
  new URL("../src/lib/vehicles.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;
const { vehicles, filterVehicles, recommendVehicle, formatPrice } =
  await import(
    `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
  );

test("six distinct vehicles have local photographs, complete details, and USD prices", async () => {
  assert.ok(vehicles.length >= 6);
  assert.equal(
    new Set(vehicles.map((vehicle) => vehicle.id)).size,
    vehicles.length,
  );
  assert.equal(
    new Set(vehicles.map((vehicle) => vehicle.image)).size,
    vehicles.length,
  );
  for (const vehicle of vehicles) {
    assert.ok(vehicle.year >= 2010 && vehicle.year <= 2026);
    assert.ok(vehicle.price > 0);
    assert.ok(
      vehicle.engine &&
        vehicle.transmission &&
        vehicle.drivetrain &&
        vehicle.description,
    );
    const photo = await fs.readFile(
      new URL("../public" + vehicle.image, import.meta.url),
    );
    assert.ok(photo.length > 1000);
    assert.equal(photo[0], 0xff);
    assert.equal(photo[1], 0xd8);
    assert.match(formatPrice(vehicle.price), /^\$/);
  }
});

test("all required filters select the right vehicles, including a nonempty luxury category", () => {
  assert.equal(
    filterVehicles("All Vehicles", "curated").length,
    vehicles.length,
  );
  for (const category of ["Performance", "Luxury", "Supercars"]) {
    const result = filterVehicles(category, "curated");
    assert.ok(result.length >= 2);
    assert.ok(result.every((vehicle) => vehicle.category === category));
  }
});

test("sort controls order numeric prices and names without mutating curated inventory", () => {
  const original = vehicles.map((vehicle) => vehicle.id);
  for (const category of [
    "All Vehicles",
    "Performance",
    "Luxury",
    "Supercars",
  ]) {
    const asc = filterVehicles(category, "price-asc");
    const desc = filterVehicles(category, "price-desc");
    const names = filterVehicles(category, "name").map(
      (vehicle) => vehicle.name,
    );
    assert.deepEqual(
      asc.map((vehicle) => vehicle.price),
      asc.map((vehicle) => vehicle.price).sort((a, b) => a - b),
    );
    assert.deepEqual(
      desc.map((vehicle) => vehicle.id),
      asc.map((vehicle) => vehicle.id).reverse(),
    );
    assert.deepEqual(
      names,
      [...names].sort((a, b) => a.localeCompare(b)),
    );
  }
  assert.deepEqual(
    vehicles.map((vehicle) => vehicle.id),
    original,
  );
});

test("each discovery preference selects a distinct recommendation from the same inventory", () => {
  const result = ["Performance", "Luxury", "Everyday refinement"].map(
    recommendVehicle,
  );
  assert.equal(new Set(result.map((vehicle) => vehicle.id)).size, 3);
  assert.equal(result[0].category, "Performance");
  assert.equal(result[1].category, "Luxury");
  assert.equal(result[2].id, "s5");
  assert.ok(result.every((vehicle) => vehicles.includes(vehicle)));
});
