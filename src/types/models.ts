import type { Types } from "mongoose";

/** A lean Mongoose document as the server sees it. */
export type Doc<T> = T & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * What a server type looks like once it has crossed the JSON boundary:
 * ObjectIds and Dates become strings, recursively. Client code types API
 * responses as `Serialized<Doc<Event>>` so shapes are declared exactly once.
 */
export type Serialized<T> = T extends Date | Types.ObjectId
  ? string
  : T extends (infer U)[]
    ? Serialized<U>[]
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T;
