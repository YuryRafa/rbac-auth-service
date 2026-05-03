import { PublicUser, UserRecord } from "./auth-dtos";

export interface InterfaceUserRepository {
    findUserByEmail(email: string): Promise<UserRecord | null>;
    findUserById(id: string): Promise<UserRecord | null>;
    insertUser(email: string, passwordHash: string, role?: string): Promise<PublicUser>;
    updatePassword(id: string, passwordHash: string): Promise<void>;
}