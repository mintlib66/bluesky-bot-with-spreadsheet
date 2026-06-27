import { AppBskyRichtextFacet, BskyAgent, RichText } from "@atproto/api";
import Papa from "papaparse";
import * as cheerio from "cheerio";

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

  console.log("fetch start...");
  const res = await fetch(url);
  console.log("res:", res);

  const csv = await res.text();
  console.log("fetch end...");

  //파싱처리
  const sheetData = Papa.parse(csv, { header: false });
  const dataArray = sheetData.data as string[][];

  if (dataArray.length > 0) {
    dataArray.forEach((row) => {
      const date = row[0];
      const today = new Date().toISOString().split("T")[0];
      if (date == today) {
        console.log("======================================");
        console.log(date, today);
        console.log("======================================");
        post(row[1], row[2]);
      }
    });
  } else {
    console.log("입력 데이터가 없습니다.");
  }

  //날짜에 대응하는 내용 게시하기
  async function post(postText: string, replyText?: string) {
    // 게시글 글자수 제한(300자) 초과 시 연결되는 스레드에 같이 붙여서 넘어간다
    let firstText = postText;
    let overText = "";

    if (postText.length > 300) {
      //엔터 단위로 컷 => 엔터 없으면 글자수 300자에서 자른다.
      const lines = postText.split("\n");
      let cut = "";

      for (const line of lines) {
        // 이 줄을 추가했을 때 300자 초과 여부 확인 (\n 포함)
        const next = cut.length === 0 ? line : cut + "\n" + line;
        if (next.length > 300) break;
        cut = next;
      }

      if (cut.length === 0) {
        // 엔터가 없거나 첫 줄 자체가 300자 초과 → 글자수 기준으로 자름
        cut = postText.slice(0, 300);
      }

      firstText = cut;
      overText = postText.slice(cut.length).trimStart() + "\n\n";
    }

    const richText = new RichText({ text: firstText });
    await richText.detectFacets(agent);

    //첫번째 글 게시
    const res = await agent.post({
      text: richText.text,
      facets: richText.facets,
      createdAt: new Date().toISOString(),
    });
    console.log("게시 완료-- URI: ", res.uri, " / CID: ", res.cid);

    if (replyText) {
      const secText = overText + replyText;
      const richText2 = new RichText({ text: secText });
      await richText2.detectFacets(agent);

      // 임베드할 HTML 데이터 파싱 -> 글 내 최초 링크 기준
      const firstLink = extractFirstLink(richText2);
      console.log("=> link:", firstLink);

      //링크 프리뷰 생성
      const linkEmbedData = firstLink
        ? await getLinkEmbedData(firstLink)
        : undefined;
      console.log("==> embed data:", linkEmbedData);

      //스레드로 연결되는 추가 게시글 게시
      const replyRes = await agent.post({
        text: richText2.text,
        reply: {
          root: { uri: res.uri, cid: res.cid },
          parent: { uri: res.uri, cid: res.cid },
        },
        facets: richText2.facets,
        ...(linkEmbedData && { embed: linkEmbedData }),
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

  // facets에서 첫 번째 링크 URL 추출
  function extractFirstLink(rt: RichText): string | undefined {
    if (!rt.facets) return undefined;

    for (const facet of rt.facets) {
      for (const feature of facet.features) {
        if (AppBskyRichtextFacet.isLink(feature)) {
          return feature.uri;
        }
      }
    }
    return undefined;
  }

  //html 파싱처리 > embed 데이터 리턴
  async function getLinkEmbedData(url: string) {
    const urlRes = await fetch(url);
    const html = await urlRes.text();
    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr("content") ?? $("title").text();
    const desc = $('meta[property="og:description"]').attr("content") ?? "";
    const imageUrl = $('meta[property="og:image"]').attr("content");

    //og 이미지 업로드 후 blob 가져오기
    let thumb;
    if (imageUrl) {
      const imgRes = await fetch(imageUrl);
      const imgBuffer = await imgRes.arrayBuffer();
      const imgBytes = new Uint8Array(imgBuffer);

      const uploaded = await agent.uploadBlob(imgBytes, {
        encoding: imgRes.headers.get("content-type") ?? "image/jpeg",
      });
      thumb = uploaded.data.blob;
    }

    return {
      $type: "app.bsky.embed.external",
      external: {
        uri: url,
        title: title,
        description: desc,
        thumb: thumb ?? undefined,
      },
    };
  }
}

main().catch((err) => {
  console.error("게시에 실패했습니다.");
  console.error(err);
  process.exit(1);
});
