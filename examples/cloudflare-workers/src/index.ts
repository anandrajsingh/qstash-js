import { Consumer } from "@upstash/qstash/cloudflare";

export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const c = new Consumer({
      "currentSigningKey": "sig_6TPD6JRa4NLZJ2YwjVWWXCH6K833",
      "nextSigningKey": "sig_5Xm8oz4X8V9LuqeGB6PVxATXYB5z",
    });

    const body = await request.text();

    const isValid = c.verify({
      signature: request.headers.get("Upstash-Signature")!,
      body,
      url: "http://localhost:8787/qstash",
    });
    if (!isValid) {
      return new Response("Invalid signature", { status: 401 });
    }
    console.log("was valid");
    return new Response("Hello World!");
  },
};
