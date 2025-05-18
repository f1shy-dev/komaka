interface UserProfile {
  id: number;
  username: string;
  email?: string;
  isActive: boolean;
  roles: Array<string>;
  lastLogin: Date | null;
}

const DEFAULT_ADMIN_USERNAME = "admin_user";

class UserManager {
  private userMap: Map<number, UserProfile>;
  private nextId: number;

  constructor() {
    this.userMap = new Map<number, UserProfile>();
    this.nextId = 1;
    this.addInitialAdmin();
  }

  private addInitialAdmin(): void {
    const adminUser: UserProfile = {
      id: this.nextId++,
      username: DEFAULT_ADMIN_USERNAME,
      isActive: true,
      roles: ["ADMIN", "EDITOR"],
      lastLogin: new Date(),
    };
    this.userMap.set(adminUser.id, adminUser);
    console.log(`Admin user ${adminUser.username} created.`);
  }

  public addUser(
    username: string,
    isActive: boolean,
    roles: string[],
    email?: string
  ): UserProfile {
    if (
      Array.from(this.userMap.values()).some((u) => u.username === username)
    ) {
      throw new Error(`User with username '${username}' already exists.`);
    }
    const newUser: UserProfile = {
      id: this.nextId++,
      username,
      email,
      isActive,
      roles,
      lastLogin: null,
    };
    this.userMap.set(newUser.id, newUser);
    return newUser;
  }

  public getUser(id: number): UserProfile | undefined {
    return this.userMap.get(id);
  }

  public updateUserEmail(id: number, newEmail: string): boolean {
    const user = this.userMap.get(id);
    if (user) {
      user.email = newEmail;
      user.lastLogin = new Date();
      this.userMap.set(id, user);
      return true;
    }
    return false;
  }

  /**
   * This is a JSDoc comment block for the deactivateUser method.
   * It deactivates a user by their ID.
   * We might want to replace this entire block.
   * @param id The ID of the user to deactivate.
   * @returns True if successful, false otherwise.
   */
  public deactivateUser(id: number): boolean {
    const user = this.userMap.get(id);
    if (user) {
      user.isActive = false;
      this.userMap.set(id, user);
      return true;
    }
    return false;
  }

  public listActiveUsers(): UserProfile[] {
    return Array.from(this.userMap.values()).filter((user) => user.isActive);
  }
}

// Example usage:
const userManager = new UserManager();
const user1 = userManager.addUser(
  "john.doe",
  true,
  ["USER"],
  "john.doe@example.com"
);
const user2 = userManager.addUser("jane.smith", false, ["READER"]);

console.log("User 1:", userManager.getUser(user1.id));
console.log("User 2 active?", userManager.getUser(user2.id)?.isActive);

userManager.updateUserEmail(user1.id, "john.d@example.com");
userManager.deactivateUser(user2.id);

console.log("Active users:", userManager.listActiveUsers());

// Final line for testing purposes
