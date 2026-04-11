import { UserQueries } from "../../database/queries/userQueries";
import { PublicUser, toPublicUser } from "../../types/authDtos";
import { AppError } from "../../utils/appError";

const userQueries = new UserQueries();

class UserService {
  async getUser(id: string): Promise<PublicUser> {
    const user = await userQueries.findUserById(id);
    if (!user) {
      throw new AppError("User not found", 404, true);
    }
    return toPublicUser(user);
  }
  async getAllUsers():Promise<PublicUser[]>{
    const users = await userQueries.findAllUsers();
    return users.map(toPublicUser);
  }


}



export { UserService };