import SettingsService from "@/services/settings";
import { jsonNoStore } from "@/utils/request";
import { withErrorHandler } from "@/utils/withErrorHandler";

export const GET = withErrorHandler(async () =>
  jsonNoStore(await SettingsService.getPublic())
);
