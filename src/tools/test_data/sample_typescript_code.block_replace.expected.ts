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
  private users: Map<number, UserProfile>;
  private nextId: number;

  constructor() {
    this.users = new Map<number, UserProfile>();
    this.nextId = 1;
    this.addInitialAdmin();
  }

  private addInitialAdmin(): void {
    // This is a private helper method
    const adminUser: UserProfile = {
      id: this.nextId++, // Pre-increment ID for admin
      username: DEFAULT_ADMIN_USERNAME,
      isActive: true,
      roles: ["ADMIN", "EDITOR"],
      lastLogin: new Date(),
    };
    this.users.set(adminUser.id, adminUser);
    console.log(`Admin user ${adminUser.username} created.`); // Log admin creation
  }

  public addUser(
    username: string,
    isActive: boolean,
    roles: string[],
    email?: string
  ): UserProfile {
    // Check for duplicate username before adding
    if (Array.from(this.users.values()).some((u) => u.username === username)) {
      throw new Error(`User with username '${username}' already exists.`);
    }
    const newUser: UserProfile = {
      id: this.nextId++, // Post-increment for subsequent users
      username,
      email,
      isActive,
      roles,
      lastLogin: null,
    };
    this.users.set(newUser.id, newUser);
    // A comment line for testing replacement
    return newUser;
  }

  public getUser(id: number): UserProfile | undefined {
    // TODO: Implement better error handling if user not found
    return this.users.get(id);
  }

  public updateUserEmail(id: number, newEmail: string): boolean {
    const user = this.users.get(id);
    if (user) {
      user.email = newEmail;
      // Update lastLogin timestamp on email update
      user.lastLogin = new Date();
      this.users.set(id, user);
      return true;
    }
    return false; // User not found
  }

  // THIS ENTIRE JSDOC BLOCK AND METHOD SIGNATURE WAS REPLACED
    const user = this.users.get(id);
    // Another comment inside a method
    if (user) {
      user.isActive = false;
      this.users.set(id, user);
      return true;
    }
    return false;
  }

  public listActiveUsers(): UserProfile[] {
    // Filter for active users and return them
    // This section could be targeted for line range replacement
    // Line X of active users logic
    // Line Y of active users logic
    // Line Z of active users logic
    return Array.from(this.users.values()).filter((user) => user.isActive);
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
userManager.deactivateUser(user2.id); // This user should now be inactive

console.log("Active users:", userManager.listActiveUsers());

// Final line for testing purposes
