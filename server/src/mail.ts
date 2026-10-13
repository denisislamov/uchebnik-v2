import type { Config, Mailer } from "./config.ts";

export function createMailer(config: Config): Mailer {
  return {
    async sendReset(to, resetUrl) {
      if (
        to !== config.ownerEmail ||
        !resetUrl.startsWith(`${config.webOrigin}/admin/reset#token=`)
      )
        throw new Error("Invalid recovery destination");
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.resendApiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10_000),
        body: JSON.stringify({
          from: config.mailFrom,
          to: [to],
          subject: "Умная Полка — восстановление доступа",
          text: `Чтобы задать новый пароль администратора, откройте ссылку:\n\n${resetUrl}\n\nСсылка действует 30 минут и только один раз. Если вы не запрашивали смену пароля, просто проигнорируйте это письмо.`,
        }),
      });
      if (!response.ok) throw new Error("Recovery email unavailable");
      await response.body?.cancel();
    },
  };
}
