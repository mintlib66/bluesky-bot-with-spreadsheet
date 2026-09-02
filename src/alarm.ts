// Github 액세스 토큰 만료 시 - Gmail 알림 메일 발송

import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER, // yourname@gmail.com
    pass: process.env.GMAIL_APP_PASSWORD, // 앱 비밀번호 (일반 비밀번호 X)
  },
});

const expiry = new Date(process.env.TOKEN_EXPIRY_DATE!); // 예: "2025-12-31"
const daysLeft = Math.ceil(
  (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
);

if (daysLeft <= 14) {
  // 알림 발송
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: process.env.GMAIL_USER,
    subject: "⚠️ GitHub 액세스 토큰 만료 임박",
    text: `토큰 만료까지 ${daysLeft}일 남았습니다. 갱신이 필요합니다.`,
  });
}
