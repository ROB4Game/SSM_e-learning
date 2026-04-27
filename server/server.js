const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authMiddleware = require('./auth');
const { authRouter } = require('./authentication');
const { courseRouter } = require('./course');
const { getUserById } = require('./userManagement');

const app = express();
app.use(cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(authRouter);
app.use(courseRouter);

const SECRET = process.env.SECRET;
if (!SECRET) {
    console.error("Lipsește SECRET în fișierul .env");
    process.exit(1);
};

//dashboard
app.get("/dashboard",authMiddleware,(req,res)=>{
    res.json({message:`Bine ai venit în panoul tău de control!`, user:req.user});
});

app.get("/profile", authMiddleware, (req, res) => {
    const user = getUserById(req.user.id);

    if (!user) {
        return res.status(404).json({ message: "Utilizatorul nu a fost găsit" });
    }

    res.json({
        user: {
            id: user.id,
            username: user.username,
            email: user.email || "",
            phoneNum: user.phoneNum || user.phone || "",
            progress: user.progress || {}
        }
    });
});

app.listen(4000,"0.0.0.0",()=>{
    console.log("Serverul rulează în rețea pe portul 4000");
})