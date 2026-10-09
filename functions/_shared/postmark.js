export async function postmarkBatchSend(config, emails) {
  const token = String(config.postmarkToken || config.smtpPass || config.smtpUser || "").trim();
  if (!token) throw new Error("Postmark token is not configured");

  const response = await fetch("https://api.postmarkapp.com/email/batch", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": token,
    },
    body: JSON.stringify(emails.map((email) => ({
      From: email.from,
      To: email.to,
      Subject: email.subject,
      TextBody: email.text,
      HtmlBody: email.html,
      ReplyTo: email.replyTo,
      MessageStream: "outbound",
    }))),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.Message || data?.message || `Postmark returned ${response.status}`;
    throw new Error(message);
  }

  if (!Array.isArray(data)) throw new Error("Postmark returned an invalid batch response");
  return data;
}
