import type { ProposalFormat, ProposalTone } from "@/lib/api";

export const proposalFormats: Array<{ value: ProposalFormat; label: string }> = [
  { value: "telegram", label: "Telegram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" }
];

export const proposalFormatLabels: Record<ProposalFormat, string> = {
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  email: "Email"
};

export const proposalTones: Array<{ value: ProposalTone; label: string }> = [
  { value: "friendly", label: "Дружелюбный" },
  { value: "concise", label: "Короткий" },
  { value: "premium", label: "Премиальный" }
];

export type ProposalFormState = {
  title: string;
  content: string;
  format: ProposalFormat;
};
