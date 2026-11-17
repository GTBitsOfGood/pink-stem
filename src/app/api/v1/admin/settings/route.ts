import { NextRequest, NextResponse } from "next/server";
import SettingsService from "@/services/settings";
import { jsonNoStore } from "@/utils/request";
import { withAuth } from "@/utils/withAuth";

export const GET = withAuth(
  async () => jsonNoStore(await SettingsService.get()),
  { roles: ["admin"] }
);

export const PUT = withAuth(
  async (req: NextRequest) =>
    NextResponse.json(await SettingsService.update(await req.json())),
  { roles: ["admin"] }
);
