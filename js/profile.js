const usernameEl = document.getElementById("username");
const emailEl = document.getElementById("email");
const phoneEl = document.getElementById("phone");

const serverIP = "0.0.0.0";

function setProfileValues(username, email, phone) {
	usernameEl.textContent = username || "-";
	emailEl.textContent = email || "-";
	phoneEl.textContent = phone || "-";
}

async function loadProfile() {
	const token = localStorage.getItem("token");

	if (!token) {
		setProfileValues("Not logged in", "", "");
		return;
	}

	try {
		const res = await fetch(`http://${serverIP}:4000/profile`, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${token}`
			}
		});

		if (!res.ok) {
			if (res.status === 401 || res.status === 403) {
				localStorage.removeItem("token");
			}
			setProfileValues("Not logged in", "", "");
			return;
		}

		const data = await res.json();
		setProfileValues(
			data.user?.username,
			data.user?.email,
			data.user?.phoneNum
		);
	} catch {
		setProfileValues("Server unavailable", "", "");
	}
}

loadProfile();
