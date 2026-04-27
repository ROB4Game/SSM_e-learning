const usernameEl = document.getElementById("username");
const emailEl = document.getElementById("email");
const phoneEl = document.getElementById("phone");
const courseStatusEl = document.getElementById("course-status");
const courseListEl = document.getElementById("course-list");

const serverIP = "0.0.0.0";

function setProfileValues(username, email, phone) {
	usernameEl.textContent = username || "-";
	emailEl.textContent = email || "-";
	phoneEl.textContent = phone || "-";
}

function renderCourses(courses) {
	courseListEl.innerHTML = "";

	if (!Array.isArray(courses) || courses.length === 0) {
		courseStatusEl.textContent = "Nu există cursuri disponibile.";
		return;
	}

	courseStatusEl.textContent = `${courses.length} cursuri încărcate.`;

	courses.forEach((course) => {
		const card = document.createElement("article");
		const title = document.createElement("h3");
		const meta = document.createElement("p");
		const desc = document.createElement("p");

		title.textContent = course.title || course.id || "Curs fără titlu";
		meta.textContent = `Progres: ${course.progress?.completionPercent || 0}% | Module: ${course.progress?.completedModules || 0}/${course.progress?.totalModules || 0}`;
		desc.textContent = course.description || "";

		card.appendChild(title);
		card.appendChild(meta);
		card.appendChild(desc);
		
		// Make card clickable and navigate to course progression page
		card.style.cursor = "pointer";
		card.style.transition = "all 0.2s ease";
		card.onclick = () => {
			window.location.href = `course-view.html?courseId=${course.id}`;
		};
		card.onmouseover = () => {
			card.style.backgroundColor = "#f5f5f5";
			card.style.transform = "translateY(-2px)";
			card.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
		};
		card.onmouseout = () => {
			card.style.backgroundColor = "";
			card.style.transform = "";
			card.style.boxShadow = "";
		};
		
		courseListEl.appendChild(card);
	});
}

async function loadCourses(token) {
	if (!token) {
		courseStatusEl.textContent = "Autentifică-te pentru a vedea datele cursurilor.";
		courseListEl.innerHTML = "";
		return;
	}

	try {
		courseStatusEl.textContent = "Se încarcă cursurile...";
		const res = await fetch(`http://${serverIP}:4000/courses`, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${token}`
			}
		});

		if (!res.ok) {
			if (res.status === 401 || res.status === 403) {
				localStorage.removeItem("token");
			}
			courseStatusEl.textContent = "Nu s-au putut încărca datele cursurilor.";
			courseListEl.innerHTML = "";
			return;
		}

		const data = await res.json();
		renderCourses(data.courses);
	} catch {
		courseStatusEl.textContent = "Server indisponibil pentru încărcarea cursurilor.";
		courseListEl.innerHTML = "";
	}
}

async function loadProfile() {
	const token = localStorage.getItem("token");

	if (!token) {
		setProfileValues("Neautentificat", "", "");
		loadCourses(token);
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
			setProfileValues("Neautentificat", "", "");
			return;
		}

		const data = await res.json();
		setProfileValues(
			data.user?.username,
			data.user?.email,
			data.user?.phoneNum
		);
	} catch {
		setProfileValues("Server indisponibil", "", "");
	}

	loadCourses(token);
}

loadProfile();
