import { z } from "zod";
import {
  dateInputSchema,
  endOfDayInputSchema,
} from "@/utils/validation/common";

export const serviceRecordSchema = z.object({
  periodStart: dateInputSchema,
  periodEnd: endOfDayInputSchema,
});
