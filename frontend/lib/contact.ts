// "+91-89310 76870" -> "tel:+918931076870", so a tap on the number starts a call.
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;
