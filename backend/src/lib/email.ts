// ponytail: mock email transport. Prints the message to the server console
// instead of sending it. When SendGrid is added, replace ONLY the body of
// sendEmail() with the API call — every caller stays the same.
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export async function sendEmail(msg: EmailMessage): Promise<void> {
  console.log(
    [
      '',
      '──────────── MOCK EMAIL (dev) ────────────',
      `To:      ${msg.to}`,
      `Subject: ${msg.subject}`,
      '',
      msg.text,
      '──────────────────────────────────────────',
      '',
    ].join('\n'),
  );
}
