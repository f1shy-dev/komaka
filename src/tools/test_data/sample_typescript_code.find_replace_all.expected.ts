interface UserProfile {
  id: number;
  username: string;
  email?: string;
  isActive: boolean;
  roles: Array<string>;
  lastLogin: Date | null;
}

const DEFAULT_ADMIN_USERNAME = "admin_USER";

class UserManager {
  private USERs: Map<number, UserProfile>;
  private nextId: number;

  constructor() {
    this.USERs = new Map<number, UserProfile>();
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
    this.USERs.set(adminUser.id, adminUser);
    console.log(`Admin USER ${adminUser.username} created.`); // Log admin creation
  }

  public addUser(
    username: string,
    isActive: boolean,
    roles: string[],
    email?: string
  ): UserProfile {
    // Check for duplicate username before adding
    if (Array.from(this.USERs.values()).some((u) => u.username === username)) {
      throw new Error(`USER with username '${username}' already exists.`);
    }
    const newUser: UserProfile = {
      id: this.nextId++, // Post-increment for subsequent USERs
      username,
      email,
      isActive,
      roles,
      lastLogin: null,
    };
    this.USERs.set(newUser.id, newUser);
    // A comment line for testing replacement
    return newUser;
  }

  public getUser(id: number): UserProfile | undefined {
    // TODO: Implement better error handling if USER not found
    return this.USERs.get(id);
  }

  public updateUserEmail(id: number, newEmail: string): boolean {
    const USER = this.USERs.get(id);
    if (USER) {
      USER.email = newEmail;
      // Update lastLogin timestamp on email update
      USER.lastLogin = new Date();
      this.USERs.set(id, USER);
      return true;
    }
    return false; // USER not found
  }

  /**
   * This is a JSDoc comment block for the deactivateUser method.
   * It deactivates a USER by their ID.
   * We might want to replace this entire block.
   * @param id The ID of the USER to deactivate.
   * @returns True if successful, false otherwise.
   */
  public deactivateUser(id: number): boolean {
    const USER = this.USERs.get(id);
    // Another comment inside a method
    if (USER) {
      USER.isActive = false;
      this.USERs.set(id, USER);
      return true;
    }
    return false;
  }

  public listActiveUsers(): UserProfile[] {
    // Filter for active USERs and return them
    // This section could be targeted for line range replacement
    // Line X of active USERs logic
    // Line Y of active USERs logic
    // Line Z of active USERs logic
    return Array.from(this.USERs.values()).filter((USER) => USER.isActive);
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

console.log("USER 1:", userManager.getUser(user1.id));
console.log("USER 2 active?", userManager.getUser(user2.id)?.isActive);

userManager.updateUserEmail(user1.id, "john.d@example.com");
userManager.deactivateUser(user2.id); // This USER should now be inactive

console.log("Active USERs:", userManager.listActiveUsers());

// Final line for testing purposes
