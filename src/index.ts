import { OvapiDeparturesCard, OvapiCommuteCard } from "./cards";

declare global {
  interface Window {
    customCards?: {
      type: string;
      name: string;
      description: string;
      preview: boolean;
      documentationURL: string;
    }[];
  }
}

for (const [type, element, name, description] of [
  [
    "ovapi-departures-card",
    OvapiDeparturesCard,
    "OVAPI departures",
    "Upcoming departures with honest freshness and cancellation status.",
  ],
  [
    "ovapi-commute-card",
    OvapiCommuteCard,
    "OVAPI commute",
    "When to leave for your favourite stops, including walking time.",
  ],
] as const) {
  if (!customElements.get(type)) customElements.define(type, element);
  window.customCards ??= [];
  if (!window.customCards.some((card) => card.type === type)) {
    window.customCards.push({
      type,
      name,
      description,
      preview: true,
      documentationURL: "https://github.com/DevSecNinja/lovelace-ovapi",
    });
  }
}
