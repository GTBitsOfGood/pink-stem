import { NextRequest, NextResponse } from "next/server";
import SignupService from "@/services/signup";
import { withAuth } from "@/utils/withAuth";

export const POST = withAuth(async (req: NextRequest, _ctx, actor) =>
  NextResponse.json(await SignupService.create(actor, await req.json()), {
    status: 201,
  })
);
