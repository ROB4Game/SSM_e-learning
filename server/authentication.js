const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const express = require("express");
const {
    getUsers,
    getUserByUsername,
    addUser
} = require("./userManagement");

const router = express.Router();

router.post("/register", async (req, res) => {
    const { username, password, email, progress, phoneNum, phone } = req.body;
    const normalizedUsername = String(username || "").trim();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedPhone = String(phoneNum || phone || "").replace(/\D/g, "");
    const passwordRule = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    const fullPhoneRule = /^\d{8,15}$/;

    if (!normalizedUsername || !password || !normalizedEmail || !normalizedPhone) {
        return res.status(400).json({ message: "Date lipsă" });
    }

    if (!passwordRule.test(password)) {
        return res.status(400).json({
            message: "Parola trebuie să aibă cel puțin 8 caractere și să includă o literă mare, o cifră și un caracter special"
        });
    }

    if (!fullPhoneRule.test(normalizedPhone)) {
        return res.status(400).json({
            message: "Numărul de telefon trebuie să conțină doar cifre și să aibă între 8 și 15 cifre, inclusiv prefixul de țară"
        });
    }

    if (getUserByUsername(normalizedUsername)) {
        return res.status(400).json({ message: "Utilizatorul există deja" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    addUser({
        username: normalizedUsername,
        password: hashedPassword,
        email: normalizedEmail,
        phoneNum: normalizedPhone
    });

    return res.json({ message: "Utilizator înregistrat cu succes" });
});

router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const user = getUserByUsername(username);

    if (!user) {
        return res.status(401).json({ message: "Credențiale invalide" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
        return res.status(401).json({ message: "Credențiale invalide" });
    }

    const token = jwt.sign(
        {
            id: user.id,
            username: user.username
        },
        process.env.SECRET,
        { expiresIn: "1h" }
    );

    return res.json({ message: "Autentificare reușită", token });
});

module.exports = {
    authRouter: router,
    getUsers
};
