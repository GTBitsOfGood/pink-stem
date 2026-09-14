import { NextRequest, NextResponse } from "next/server";
import MessageService from "@/services/message";
import { jsonNoStore, queryOf } from "@/utils/request";
import { withAuth } from "@/utils/withAuth";

export const GET = withAuth(async (req: NextRequest, _ctx, actor) =>
  jsonNoStore(await MessageService.listThreads(actor, queryOf(req)))
);

export const POST = withAuth(async (req: NextRequest, _ctx, actor) =>
  NextResponse.json(
    await MessageService.createThread(actor, await req.json()),
    { status: 201 }
  )
);
