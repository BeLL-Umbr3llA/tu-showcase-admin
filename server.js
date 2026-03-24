const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { upload } = require('./cloudinary'); // Cloudinary config
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- MongoDB Atlas Connection ---
const mongoURI = process.env.MONGODB_URI;

mongoose.connect(mongoURI)
    .then(() => {
        console.log("✅ Connected to MongoDB Atlas");
        seedAdmin();
    })
    .catch((err) => console.log("❌ Connection Error: ", err));

// --- Admin Schema & Model ---
const adminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const Admin = mongoose.model('Admin', adminSchema);

async function seedAdmin() {
    const adminExists = await Admin.findOne({ username: 'admin' });
    if (!adminExists) {
        const defaultAdmin = new Admin({ username: 'admin', password: 'admin123' });
        await defaultAdmin.save();
        console.log("🚀 Default Admin Created: admin / admin123");
    }
}

// --- Project Schema & Model ---
const projectSchema = new mongoose.Schema({
    major: String,
    title: String,
    year: String,
    rating: { type: Number, default: 0 },
    intro: String,
    aim: [String],
    theory: String,
    process: [String],
    con: String,
    authors: [String],
    img: [String],
    createdAt: { type: Date, default: Date.now }
});
const Project = mongoose.model('Project', projectSchema);

// --- Admin Auth API ---
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const admin = await Admin.findOne({ username, password });
        if (admin) res.status(200).json({ success: true, token: "admin_token_123" });
        else res.status(401).json({ success: false, message: "Username သို့မဟုတ် Password မှားနေပါသည်" });
    } catch (err) { res.status(500).json({ error: "Server Error" }); }
});

// --- Project CRUD APIs ---

// 1. GET: Data အားလုံးကို ပြန်ယူရန်
app.get('/api/projects', async (req, res) => {
    try {
        const projects = await Project.find().sort({ createdAt: -1 });
        res.json(projects);
    } catch (err) { res.status(500).json({ error: "Internal Server Error" }); }
});

// 2. POST: Project အသစ်ထည့်ရန်
app.post('/api/add-project', (req, res) => {
    upload.array('img', 10)(req, res, async (err) => {
        if (err) {
            return res.status(500).json({ success: false, error: "ပုံတင်ရာတွင် အမှားရှိနေပါသည်", details: err.message });
        }

        try {
            // ၁။ ပုံဖိုင်များရှိလျှင် path ယူမည်
            let imageUrls = req.files ? req.files.map(file => file.path) : [];
            
            // ၂။ YouTube URL (String) ပါလာလျှင် imageUrls array ထဲသို့ ပေါင်းထည့်မည်
            if (req.body.img) {
                if (Array.isArray(req.body.img)) {
                    const links = req.body.img.filter(item => typeof item === 'string');
                    imageUrls = [...imageUrls, ...links];
                } else if (typeof req.body.img === 'string') {
                    imageUrls.push(req.body.img);
                }
            }

            const projectData = {
                major: req.body.major,
                title: req.body.title,
                year: req.body.year || "Not Specified",
                rating: Number(req.body.rating) || 0,
                intro: req.body.intro,
                theory: req.body.theory,
                con: req.body.con,
                img: imageUrls, // ဤနေရာတွင် ပုံရော YouTube ပါ တစ်ခါတည်း ပါသွားပါပြီ
                aim: Array.isArray(req.body.aim) ? req.body.aim : (req.body.aim ? [req.body.aim] : []),
                process: Array.isArray(req.body.process) ? req.body.process : (req.body.process ? [req.body.process] : []),
                authors: Array.isArray(req.body.authors) ? req.body.authors : (req.body.authors ? [req.body.authors] : []),
            };

            const newProject = new Project(projectData);
            await newProject.save();
            res.status(200).json({ success: true, data: newProject });

        } catch (dbErr) {
            res.status(500).json({ success: false, error: "Database Error", details: dbErr.message });
        }
    });
});
app.put('/api/edit-project/:id', (req, res) => {
    upload.array('img', 10)(req, res, async (err) => {
        if (err) return res.status(500).json({ success: false, error: err.message });

        try {
            const existingProject = await Project.findById(req.params.id);
            if (!existingProject) {
                return res.status(404).json({ success: false, error: "Project ရှာမတွေ့ပါ" });
            }

            let finalImages = [];
            
            // ၁။ ပုံဟောင်း URL / YouTube Link များကို စစ်ဆေးယူခြင်း
            if (req.body.img) {
                if (Array.isArray(req.body.img)) {
                    finalImages = req.body.img.filter(item => typeof item === 'string' && item.trim() !== "");
                } else if (typeof req.body.img === 'string' && req.body.img.trim() !== "") {
                    finalImages.push(req.body.img);
                }
            }

            // ၂။ ပုံအသစ် (Files) များရှိလျှင် ထည့်ပေါင်းခြင်း
            if (req.files && req.files.length > 0) {
                const newFilePaths = req.files.map(file => file.path);
                finalImages = [...finalImages, ...newFilePaths];
            }

            // ၃။ Array ဖြစ်ရမည့် Fields များကို စနစ်တကျ ပြောင်းလဲခြင်း
            const parseToArray = (data) => {
                if (!data) return [];
                if (Array.isArray(data)) return data;
                return data.split(',').map(s => s.trim()).filter(s => s !== "");
            };

            const updateData = {
                major: req.body.major,
                title: req.body.title,
                intro: req.body.intro,
                theory: req.body.theory,
                con: req.body.con,
                year: req.body.year || existingProject.year,
                rating: Number(req.body.rating) || 0,
                img: finalImages, // ပေါင်းစပ်ပြီးသား ပုံများ
                aim: parseToArray(req.body.aim),
                process: parseToArray(req.body.process),
                authors: parseToArray(req.body.authors)
            };

            const updatedProject = await Project.findByIdAndUpdate(
                req.params.id, 
                updateData, 
                { new: true }
            );
            
            res.status(200).json({ success: true, data: updatedProject });

        } catch (dbErr) {
            res.status(500).json({ success: false, error: dbErr.message });
        }
    });
});

// 4. DELETE: Project ဖျက်ရန်
app.delete('/api/delete-project/:id', async (req, res) => {
    try {
        await Project.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "ဖျက်သိမ်းပြီးပါပြီ!" });
    } catch (err) { res.status(500).json({ error: "ဖျက်၍ မရပါ" }); }
});
// server.js ထဲမှာ ရှာပြင်ရန်
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Backend server is running on port ${PORT}`);
});
