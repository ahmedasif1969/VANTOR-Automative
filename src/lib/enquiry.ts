export interface EnquiryData {
  name: string;
  email: string;
  phone: string;
  interest: string;
  date: string;
  message: string;
}
export type EnquiryErrors = Partial<
  Record<"name" | "email" | "interest" | "message", string>
>;

export function validateEnquiry(data: EnquiryData): EnquiryErrors {
  const errors: EnquiryErrors = {};
  if (data.name.trim().length < 2) errors.name = "Please enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()))
    errors.email = "Please enter a valid email address.";
  if (!data.interest.trim())
    errors.interest = "Choose a vehicle or general consultation.";
  if (data.message.trim().length < 10)
    errors.message =
      "Please write at least 10 characters about what you are looking for.";
  return errors;
}

export function prepareEnquiry(data: EnquiryData) {
  return [
    "VANTOR — Private viewing enquiry",
    "",
    `Name: ${data.name.trim()}`,
    `Email: ${data.email.trim()}`,
    `Phone: ${data.phone.trim() || "Not supplied"}`,
    `Vehicle or service: ${data.interest || "General consultation"}`,
    `Preferred date: ${data.date || "Flexible"}`,
    "",
    data.message.trim() ||
      "I would like to discuss the collection and arrange a private viewing.",
  ].join("\n");
}
