const users = new Map(); // userId -> record

async function saveUser(user) {
  // Mock async DB write
  await new Promise((r) => setTimeout(r, 10));
  users.set(user.userId, { ...user, createdAt: Date.now() });
  return users.get(user.userId);
}

async function getUser(userId) {
  await new Promise((r) => setTimeout(r, 5));
  return users.get(userId) || null;
}

module.exports = { saveUser, getUser };

