import { NextResponse } from "next/server";
import UserService from "@/services/user";
import { withAuth } from "@/utils/withAuth";

export const POST = withAuth(async (_req, _ctx, actor) =>
  NextResponse.json(await UserService.acceptWaiver(actor))
);
