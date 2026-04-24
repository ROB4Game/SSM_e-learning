const loginForm = document.querySelector(".login-form");
const usernameInput = document.querySelector("#username");
const passwordInput = document.querySelector("#password");

const statusMessage = document.createElement("p");
statusMessage.className = "login-status";
statusMessage.setAttribute("aria-live", "polite");
loginForm.appendChild(statusMessage);

let storedLogins = [];

async function loadUsers() {
    try {
        const response = await fetch("../data/users.json");
        if (!response.ok) throw new Error("Failed to load users.json");
        const data = await response.json();
        storedLogins = Array.isArray(data.users) ? data.users : [];
        console.log("Users loaded successfully!");
    } catch (err) {
        console.error(err);
        storedLogins = [];
    }
}

loadUsers();

loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (storedLogins.length === 0) {
        statusMessage.textContent = "User list not loaded. Please try again.";
        statusMessage.style.color = "#b00020";
        return;
    }

    const matchedUser = storedLogins.find(function (user) {
        return user.username === username && user.password === password;
    });

    if (matchedUser) {
        statusMessage.textContent = "Successfully logged in!";
        statusMessage.style.color = "#1f7a1f";
        console.log("Successfully logged in!", matchedUser);
        return;
    }

    statusMessage.textContent = "Invalid username or password.";
    statusMessage.style.color = "#b00020";
});