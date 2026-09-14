import { Types, UpdateQuery } from "mongoose";
import dbConnect from "@/db/dbConnect";
import { toDoc } from "@/db/defineModel";
import CertificateModel from "@/db/models/certificate";
import type { Certificate } from "@/types/certificate";
import type { Doc } from "@/types/models";

export default class CertificateDAO {
  static async create(data: Certificate): Promise<Doc<Certificate>> {
    await dbConnect();
    return toDoc<Certificate>(await CertificateModel.create(data));
  }

  static async findById(
    id: string | Types.ObjectId
  ): Promise<Doc<Certificate> | null> {
    await dbConnect();
    if (!Types.ObjectId.isValid(id)) return null;
    return CertificateModel.findById(id).lean<Doc<Certificate>>();
  }

  static async findByCode(
    verificationCode: string
  ): Promise<Doc<Certificate> | null> {
    await dbConnect();
    return CertificateModel.findOne({ verificationCode }).lean<
      Doc<Certificate>
    >();
  }

  static async findByVolunteer(
    volunteerId: string | Types.ObjectId
  ): Promise<Doc<Certificate>[]> {
    await dbConnect();
    return CertificateModel.find({ volunteerId })
      .sort({ issuedAt: -1 })
      .lean<Doc<Certificate>[]>();
  }

  /** Unrevoked certificates that describe hours from a given event. */
  static async findActiveCoveringEvent(
    volunteerId: string | Types.ObjectId,
    eventId: string | Types.ObjectId
  ): Promise<Doc<Certificate>[]> {
    await dbConnect();
    return CertificateModel.find({
      volunteerId,
      revokedAt: null,
      $or: [{ eventId }, { type: "service_record", "items.eventId": eventId }],
    }).lean<Doc<Certificate>[]>();
  }

  static async updateById(
    id: string | Types.ObjectId,
    updates: UpdateQuery<Certificate>
  ): Promise<Doc<Certificate> | null> {
    await dbConnect();
    return CertificateModel.findByIdAndUpdate(id, updates, {
      returnDocument: "after",
    }).lean<Doc<Certificate>>();
  }

  static async count(filter: Record<string, unknown> = {}): Promise<number> {
    await dbConnect();
    return CertificateModel.countDocuments(filter);
  }
}
