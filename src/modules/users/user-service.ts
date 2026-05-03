import bcrypt from 'bcrypt';
import { UserQueries } from "../../database/queries/user-queries";
import { PublicUser, toPublicUser } from "../../types/auth-dtos";
import { AppError } from "../../utils/app-error";
import { TokenQueries } from '../../database/queries/token-queries';

const userQueries = new UserQueries();
const tokenQueries = new TokenQueries();

class UserService {
  async getUser(id: string): Promise<PublicUser> {
    const user = await userQueries.findUserById(id);
    if (!user) {
      throw new AppError("User not found", 404, true);
    }
    return toPublicUser(user);
  }

  async getAllUsers(): Promise<PublicUser[]> {
    const users = await userQueries.findAllUsers();
    return users.map(toPublicUser);
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const user = await userQueries.findUserById(id);
    if (!user) {
      throw new AppError("User not found", 404, true);
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);

    if (!validPassword) {
      throw new AppError("Invalid Credentials", 401, true);
    }

    if (currentPassword === newPassword) {
      throw new AppError("New password must be different from you current", 401, true);

    }

    const password_hash = await bcrypt.hash(newPassword, 12);
    await userQueries.updatePassword(id, password_hash);
    await tokenQueries.deleteAllUserTokens(id);

  }


}



export { UserService };