const fs = require("fs");
const path = require("path");

const USERS_FILE = path.join(__dirname, "users.json");

function normalizeUser(user) {
	return {
		...user,
		email: user.email || "",
		phoneNum: user.phoneNum || user.phone || "",
		progress: user.progress || {}
	};
}

function getUsers() {
	try {
		const data = fs.readFileSync(USERS_FILE, "utf-8");
		const parsed = data ? JSON.parse(data) : [];

		if (!Array.isArray(parsed)) {
			return [];
		}

		return parsed.map(normalizeUser);
	} catch {
		return [];
	}
}

function saveUsers(users) {
	fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function getUserById(userId, users = getUsers()) {
	return users.find((user) => Number(user.id) === Number(userId));
}

function getUserByUsername(username, users = getUsers()) {
	return users.find((user) => user.username === username);
}

function addUser(userPayload) {
	const users = getUsers();
	const newUser = {
		id: users.length + 1,
		...userPayload
	};

	users.push(newUser);
	saveUsers(users);

	return newUser;
}

function updateUser(userId, updater) {
	const users = getUsers();
	const userIndex = users.findIndex((user) => Number(user.id) === Number(userId));

	if (userIndex === -1) {
		return null;
	}

	const currentUser = users[userIndex];
	const updatedUser = typeof updater === "function" ? updater(currentUser) : currentUser;
	users[userIndex] = updatedUser;
	saveUsers(users);

	return users[userIndex];
}

module.exports = {
	getUsers,
	saveUsers,
	getUserById,
	getUserByUsername,
	addUser,
	updateUser
};
