const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

// ၁။ Cloudinary Configuration ကို ပိုမိုခိုင်မာအောင် လုပ်ခြင်း
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true // HTTPS သုံးစွဲရန် သေချာစေခြင်း (Security & Time issue အတွက် အထောက်အကူပြုသည်)
});

// ၂။ ချိတ်ဆက်မှု ရှိမရှိ Start-up မှာတင် စစ်ဆေးခြင်း
cloudinary.api.ping()
  .then(res => console.log("✅ Cloudinary Connection: Success"))
  .catch(err => {
    console.error("❌ Cloudinary Config Error:", err.message);
    console.log("💡 Tip: Check your .env file or Computer Date/Time settings.");
  });

// ၃။ Multer Storage သတ်မှတ်ခြင်း
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'tu_project_uploads', // Cloudinary ပေါ်က Folder နာမည်
    resource_type: 'auto',        // Image ရော Video ရော လက်ခံရန်
    allowed_formats: ['jpg', 'png', 'jpeg', 'mp4', 'mov', 'webp'],
    transformation: [{ width: 1000, crop: 'limit' }] // ပုံအရမ်းကြီးနေလျှင် အလိုအလျောက် ချုံ့ရန် (Optional)
  },
});

// ၄။ Upload Middleware
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 } // File size ကို 10MB အထိ ကန့်သတ်ခြင်း
});

module.exports = { cloudinary, upload };