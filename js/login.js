const loginForm = document.querySelector(".login-form");
const usernameInput = document.querySelector("#username");
const passwordInput = document.querySelector("#password");

const statusMessage = document.createElement("p");
statusMessage.className = "login-status";
statusMessage.setAttribute("aria-live", "polite");
loginForm.appendChild(statusMessage);

const serverIP = "0.0.0.0";

loginForm.addEventListener("submit", async function (event) {
  event.preventDefault(); 

  const username = usernameInput.value;
  const password = passwordInput.value;

  try {
    const res = await fetch(`http://${serverIP}:4000/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    console.log(data);

    if (data.token) {
      localStorage.setItem("token", data.token);
      statusMessage.textContent = "Autentificare reușită";
      window.location.href = "profile.html";
    } else {
      statusMessage.textContent = "Autentificare eșuată";
    }

  } catch (err) {
    statusMessage.textContent = "Eroare de server";
  }

});