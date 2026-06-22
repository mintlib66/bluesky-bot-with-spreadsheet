import { BskyAgent, RichText } from "@atproto/api";

async function main() {
  const identifier = process.env.BLUESKY_IDENTIFIER;
  const password = process.env.BLUESKY_APP_PASSWORD;

  if (!identifier || !password) {
    throw new Error("BLUESKY 인증을 위한 환경변수가 필요합니다.");
  }
  const agent = new BskyAgent({
    service: "https://bsky.social",
  });
  await agent.login({
    identifier,
    password,
  });
  console.log("로그인:", identifier);

  const text = `봇 작동 테스트\n실행:${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`;
  const richText = new RichText({ text });
  await richText.detectFacets(agent);

  const res = await agent.post({
    text: richText.text,
    facets: richText.facets,
    createdAt: new Date().toISOString(),
  });
  console.log("게시 완료-- URI: ", res.uri, " / CID: ", res.cid);
}

main().catch((err) => {
  console.error("게시에 실패했습니다.");
  console.error(err);
  process.exit(1);
});
