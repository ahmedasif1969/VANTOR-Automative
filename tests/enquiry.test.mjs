import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import ts from "typescript";

const source = await fs.readFile(
  new URL("../src/lib/enquiry.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;
const { prepareEnquiry, validateEnquiry } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

test("enquiry preserves vehicle selection and contact details in a reviewable draft", () => {
  const draft = prepareEnquiry({
    name: " Alex Driver ",
    email: " alex@example.com ",
    phone: "+44 123456789",
    interest: "McLaren 720S",
    date: "2026-11-01",
    message: "Please confirm availability.\nI would like a private viewing.",
  });
  assert.ok(draft.includes("Name: Alex Driver\nEmail: alex@example.com"));
  assert.ok(draft.includes("Vehicle or service: McLaren 720S"));
  assert.ok(draft.includes("Preferred date: 2026-11-01"));
  assert.ok(
    draft.endsWith(
      "Please confirm availability.\nI would like a private viewing.",
    ),
  );
});

test("optional information has usable enquiry defaults", () => {
  const draft = prepareEnquiry({
    name: "Alex",
    email: "alex@example.com",
    phone: "",
    interest: "",
    date: "",
    message: "",
  });
  assert.ok(draft.includes("Phone: Not supplied"));
  assert.ok(draft.includes("Vehicle or service: General consultation"));
  assert.ok(draft.includes("Preferred date: Flexible"));
  assert.ok(draft.includes("arrange a private viewing"));
});

test("blank fields produce actionable errors rather than a false success", () => {
  const errors = validateEnquiry({
    name: "   ",
    email: "",
    interest: "",
    message: "",
    date: "",
    phone: "",
  });
  assert.deepEqual(Object.keys(errors), [
    "name",
    "email",
    "interest",
    "message",
  ]);
  assert.ok(Object.values(errors).every((message) => message.length > 10));
});

test("valid enquiry passes without requiring optional phone or date", () => {
  assert.deepEqual(
    validateEnquiry({
      name: "Alex Driver",
      email: " alex@example.com ",
      interest: "Porsche 911 GT3",
      message: "I would like to discuss this vehicle.",
      date: "",
      phone: "",
    }),
    {},
  );
});

test("invalid email and short message are rejected independently", () => {
  const errors = validateEnquiry({
    name: "Alex Driver",
    email: "alex@",
    interest: "General consultation",
    message: "Hi",
    date: "",
    phone: "",
  });
  assert.deepEqual(Object.keys(errors), ["email", "message"]);
});
