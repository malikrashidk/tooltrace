import { MemStorage } from "./mem-storage";
import { DbStorage } from "./db-storage";
import { IStorage } from "./types";

let storage: IStorage;

if (process.env.NODE_ENV === "production" || process.env.DATABASE_URL) {
    storage = new DbStorage();
} else {
    storage = new MemStorage();
}

export { storage, MemStorage, DbStorage };
export type { IStorage };
