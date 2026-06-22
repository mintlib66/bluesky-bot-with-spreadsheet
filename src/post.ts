import { BskyAgent, RichText } from "@atproto/api";
import Papa from "papaparse";

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

  //데이터 불러오기(csv export)
  const sheetId = process.env.SHEET_ID;
  const gid = process.env.SHEET_GID;
  const url =
    `https://docs.google.com/spreadsheets/d/${sheetId}/export?` +
    `format=csv&gid=${gid}`;

  const csv = await fetch(url).then((r) => r.text());

  //파싱처리
  const sheetData = Papa.parse(csv, { header: false });
  // console.log(sheetData);
  const dataArray = sheetData.data as string[][];

  if (dataArray.length > 0) {
    dataArray.forEach((row) => {
      const date = row[0];
      const today = new Date().toISOString().split("T")[0];
      if (date == today) {
        console.log("======================================");
        console.log(date, today);
        console.log(row);
        console.log("======================================");
        post(row[1], row[2]);
      }
    });
  } else {
    console.log("입력 데이터가 없습니다.");
  }

  //게시
  async function post(postText: string, replyText?: string) {
    const text =
      postText +
      `\n\n작동 테스트 실행:${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`;
    const richText = new RichText({ text: text });
    await richText.detectFacets(agent);

    //첫번째 글 게시
    const res = await agent.post({
      text: richText.text,
      facets: richText.facets,
      createdAt: new Date().toISOString(),
    });
    console.log("게시 완료-- URI: ", res.uri, " / CID: ", res.cid);

    if (replyText) {
      const secText =
        replyText +
        `\n\n작동 테스트 실행:${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`;
      const richText2 = new RichText({ text: secText });
      await richText2.detectFacets(agent);

      //스레드로 연결되는 추가 게시글 게시
      const replyRes = await agent.post({
        text: richText2.text,
        reply: {
          root: { uri: res.uri, cid: res.cid },
          parent: { uri: res.uri, cid: res.cid },
        },
        facets: richText2.facets,
        createdAt: new Date().toISOString(),
      });

      console.log(
        "추가 게시 완료-- URI: ",
        replyRes.uri,
        " / CID: ",
        replyRes.cid,
      );
    }
  }
}

main().catch((err) => {
  console.error("게시에 실패했습니다.");
  console.error(err);
  process.exit(1);
});
