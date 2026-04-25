const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt=require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
const SECRET = process.env.SECRET;
if (!SECRET) {
    console.error("Missing SECRET in .env file");
    process.exit(1);
};

//read users
function getUsers() {
    try {
        const data = fs.readFileSync(FILE, "utf-8");
        const parsed = data ? JSON.parse(data) : [];

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.map((user) => ({
            ...user,
            email: user.email || "",
            phoneNum: user.phoneNum || user.phone || ""
        }));
    } catch {
        return [];
    }
}
//save users
function saveUsers(users){
    fs.writeFileSync(FILE,JSON.stringify(users,null,2));
}


//register route
app.post("/register", async(req,res)=>{
    const {username,password,email,phoneNum,phone} = req.body;
    const normalizedUsername = String(username || "").trim();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedPhone = String(phoneNum || phone || "").replace(/\D/g, "");
    const passwordRule = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    const fullPhoneRule = /^\d{8,15}$/;

    if(!normalizedUsername || !password || !normalizedEmail || !normalizedPhone){
        return res.status(400).json({message:"Missing data"});
    }

    if (!passwordRule.test(password)) {
        return res.status(400).json({
            message: "Password must be at least 8 characters and include 1 uppercase letter, 1 number, and 1 special character"
        });
    }

    if (!fullPhoneRule.test(normalizedPhone)) {
        return res.status(400).json({
            message: "Phone number must contain only digits and be 8 to 15 digits including country code"
        });
    }

    const users = getUsers();
    //check if user exists
    if(users.find(u=>u.username === normalizedUsername)){
        return res.status(400).json({message:"User already exists"});
    }

    const hashedPassword = await bcrypt.hash(password,10);
    users.push({
        id: users.length + 1,
        username: normalizedUsername,
        password: hashedPassword,
        email: normalizedEmail,
        phoneNum: normalizedPhone
    });
    saveUsers(users);
    res.json({message:"User registered successfully"});
})
//login route
app.post("/login", async(req,res)=>{
    const {username,password} = req.body;
    
    const users = getUsers();

    const user = users.find(u=>u.username === username);
    if(!user)return res.status(401).json({message:"Invalid credentials"});

    const valid = await bcrypt.compare(password,user.password);
    if(!valid)return res.status(401).json({message:"Invalid credentials"});
    //generate token
    const token = jwt.sign(
        {id:user.id,
        username:user.username
        },SECRET,{expiresIn:'1h'});
    res.json({message:"Login successful", token});
})

function authMiddleware(req,res,next){
    const header = req.headers.authorization;

    if(!header)return res.status(401).json({message:"No token"});

    const token = header.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Malformed token" });

    try{
        const decoded = jwt.verify(token,SECRET);
        req.user = decoded;
        next();
    }catch{
        res.status(403).json({message:"Invalid token"});
    }
}

//dashboard
app.get("/dashboard",authMiddleware,(req,res)=>{
    res.json({message:`Welcome to your dashboard!`, user:req.user});
});

app.get("/profile", authMiddleware, (req, res) => {
    const users = getUsers();
    const user = users.find((u) => Number(u.id) === Number(req.user.id));

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    res.json({
        user: {
            id: user.id,
            username: user.username,
            email: user.email || "",
            phoneNum: user.phoneNum || user.phone || ""
        }
    });
});

app.listen(4000,"0.0.0.0",()=>{
    console.log("Server running on network on port 4000");
})