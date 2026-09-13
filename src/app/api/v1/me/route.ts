import { NextRequest, NextResponse } from "next/server";
import UserService from "@/services/user";
import { withAuth } from "@/utils/withAuth";

export const PATCH = withAuth(async (req: NextRequest, _ctx, actor) =>
  NextResponse.json(await UserService.updateProfile(actor, await req.json()))
);
