import CertificateService from "@/services/certificate";
import { fileResponse } from "@/utils/request";
import { withAuth } from "@/utils/withAuth";

export const GET = withAuth<{ id: string }>(async (_req, { params }, actor) => {
  const { bytes, filename } = await CertificateService.pdf(actor, params.id);
  return fileResponse(Buffer.from(bytes), filename, "application/pdf");
});
