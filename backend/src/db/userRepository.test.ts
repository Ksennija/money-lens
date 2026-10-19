import { prisma } from "./client.js";
import { createUser, findUserByEmail } from "./userRepository.js";

const TEST_EMAIL = "finduser@example.com";
const TEST_PASSWORD_HASH = "hashed-password";

describe("findUserByEmail", () => {
  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns the user with id, email and passwordHash for a registered email", async () => {
    await createUser(TEST_EMAIL, TEST_PASSWORD_HASH);

    const user = await findUserByEmail(TEST_EMAIL);

    expect(user).toEqual({
      id: expect.any(String),
      email: TEST_EMAIL,
      passwordHash: TEST_PASSWORD_HASH,
    });
  });

  it("returns null for an unknown email", async () => {
    const user = await findUserByEmail("unknown@example.com");

    expect(user).toBeNull();
  });
});
