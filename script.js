const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api' 
    : 'https://tu-showcase-admin.vercel.app/api';
let allProjects = [];
let editMode = false;
let currentEditId = null;

// ၁။ Auth Check
(function() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = 'login.html'; 
    }
})();

// ၂။ UI & Tabs Logic
function openTab(evt, tabName) {
    let tabcontents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabcontents.length; i++) {
        tabcontents[i].classList.remove("active");
    }

    let tablinks = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }

    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");

    if (tabName === 'manage-tab') {
        getProjects();
    }
}

function setRating(n) {
    document.getElementById('ratingValue').value = n;
    for (let i = 1; i <= 5; i++) {
        const star = document.getElementById(`star${i}`);
        if (i <= n) {
            star.style.color = "#ffc107"; 
        } else {
            star.style.color = "#ccc"; 
        }
    }
}

function toggleSettingsMenu() {
    document.getElementById("settingsDropdown").classList.toggle("show");
}

// ၃။ CRUD Logic

async function getProjects() {
    try {
        const res = await fetch(`${API_URL}/projects`);
        allProjects = await res.json();
        displayProjects(allProjects);
    } catch (err) {
        console.error("Error fetching projects:", err);
    }
}

function displayProjects(data) {
    const list = document.getElementById('projectList');
    if (data.length === 0) {
        list.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:20px; color:#888;">No projects found.</td></tr>`;
        return;
    }
    
    list.innerHTML = data.map(item => `
        <tr>
            <td data-label="Major"><span class="badge">${item.major}</span></td>
            <td data-label="Title">
                <b>${item.title}</b><br>
                <small style="color: #666;">Year: ${item.year || 'N/A'} | Rating: ${item.rating || 0}★</small>
            </td>
            <td data-label="Actions">
                <div class="action-btns">
                    <button class="edit-btn" onclick="prepareEdit('${item._id}')">Update</button>
                    <button class="del-btn" onclick="deleteProject('${item._id}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}
async function sendData() {
    const major = document.getElementById('major').value;
    const title = document.getElementById('title').value;
    const year = document.getElementById('academicYear').value;
    const rating = document.getElementById('ratingValue').value;
    const fileInput = document.getElementById('imageFiles');
    
    // YouTube URL ကို ဖတ်ယူခြင်း
    const youtubeInput = document.getElementById('youtubeUrl');
    const youtubeUrl = youtubeInput ? youtubeInput.value.trim() : "";

    // Validation
    if(!major || !title || !rating || !year) {
        Swal.fire('Error!', 'လိုအပ်သော အချက်အလက်များ အကုန်ဖြည့်ပေးပါ!', 'error');
        return;
    }

    // New Project တင်ချိန်မှာ ပုံရော YouTube ရော မပါရင် တားမြစ်ရန်
    // Edit mode မှာတော့ ပုံဟောင်းတွေ ရှိနေနိုင်တဲ့အတွက် oldImageUrls ကိုပါ စစ်ဆေးပေးရမယ်
    if(!editMode && fileInput.files.length === 0 && !youtubeUrl) {
        Swal.fire('Error!', 'အနည်းဆုံး ပုံတစ်ပုံ သို့မဟုတ် YouTube Link တစ်ခု ထည့်ပေးပါ!', 'error');
        return;
    }

    // Edit mode မှာ ပုံအကုန်ဖျက်လိုက်ပြီး အသစ်လည်းမတင်ရင် တားမြစ်ရန်
    if(editMode && oldImageUrls.length === 0 && fileInput.files.length === 0 && !youtubeUrl) {
        Swal.fire('Error!', 'အနည်းဆုံး ပုံတစ်ပုံ သို့မဟုတ် YouTube Link တစ်ခု ကျန်ရှိရပါမည်!', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('major', major);
    formData.append('title', title);
    formData.append('year', year);
    formData.append('rating', rating);
    formData.append('intro', document.getElementById('intro').value);
    formData.append('theory', document.getElementById('theory').value);
    formData.append('con', document.getElementById('con').value);
    formData.append('authors', document.getElementById('authors').value);

    // Aim & Process
    const aimRaw = document.getElementById('aim').value;
    const processRaw = document.getElementById('process').value;
    aimRaw.split(',').map(s => s.trim()).filter(s => s !== "").forEach(val => formData.append('aim', val));
    processRaw.split(',').map(s => s.trim()).filter(s => s !== "").forEach(val => formData.append('process', val));

    // --- ပုံများနှင့် YouTube Link များ စီမံခန့်ခွဲခြင်း ---

    // ၁။ (Edit Mode သာ) UI မှာ ချန်ထားခဲ့တဲ့ ပုံဟောင်း URL String များကို အရင်ထည့်မယ်
    if (editMode && typeof oldImageUrls !== 'undefined' && oldImageUrls.length > 0) {
        oldImageUrls.forEach(url => {
            formData.append('img', url); 
        });
    }

    // ၂။ ပုံအသစ် (Files) ရွေးထားတာရှိရင် ထပ်တိုးထည့်မယ်
    if (fileInput.files.length > 0) {
        for (let i = 0; i < fileInput.files.length; i++) {
            formData.append('img', fileInput.files[i]);
        }
    }

    // ၃။ YouTube Link အသစ် (သို့မဟုတ် Edit ထဲက link) ကို ထည့်မယ်
    if (youtubeUrl) {
        formData.append('img', youtubeUrl); 
    }
    // ---------------------------------------------

    const url = editMode ? `${API_URL}/edit-project/${currentEditId}` : `${API_URL}/add-project`;
    
    Swal.fire({ 
        title: editMode ? 'ပြင်ဆင်နေပါသည်...' : 'တင်နေပါသည်...', 
        allowOutsideClick: false, 
        didOpen: () => { Swal.showLoading() } 
    });

    try {
        const res = await fetch(url, {
            method: editMode ? 'PUT' : 'POST',
            body: formData 
        });
        
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Server Error");
        }

        const result = await res.json();
        await Swal.fire({ 
            icon: 'success', 
            title: 'အောင်မြင်ပါသည်!', 
            text: `${result.data.title} ကို သိမ်းဆည်းပြီးပါပြီ။`,
        });

        resetForm(); // Form ကို ရှင်းမယ် (oldImageUrls ပါ ရှင်းပြီးသားဖြစ်ရမယ်)
        getProjects(); 
        document.getElementById('btn-manage').click();

    } catch (err) {
        console.error("❌ Catch Error:", err);
        Swal.fire('Error', err.message, 'error');
    }
}



function renderImagePreviewItem(url, index) {
    const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
    const previewHtml = isYoutube 
        ? `<div class="youtube-preview-placeholder">▶ YouTube Video</div>`
        : `<img src="${url}" alt="Preview" class="old-img-preview">`;

    return `
        <div class="old-img-item" data-index="${index}">
            ${previewHtml}
            <span class="delete-old-img" onclick="markImageForDeletion(${index})">×</span>
        </div>
    `;
}

// ပုံဟောင်း URL များကို ယာယီသိမ်းထားမည့် array
let oldImageUrls = [];


// script.js ထဲက prepareEdit function ကို အစားထိုးလိုက်ပါ
function prepareEdit(id) {
    const item = allProjects.find(p => p._id === id);
    if(!item) return;

    // Form ထဲ Data ဖြည့်ခြင်း
    document.getElementById('major').value = item.major || '';
    document.getElementById('title').value = item.title || '';
    document.getElementById('academicYear').value = item.year || '2022-23';
    setRating(item.rating || 0);

    // YouTube URL ပြန်ဖြည့်ခြင်း
    const youtubeInput = document.getElementById('youtubeUrl');
    if (youtubeInput) {
        const yLink = item.img ? item.img.find(url => typeof url === 'string' && (url.includes('youtube.com') || url.includes('youtu.be'))) : '';
        youtubeInput.value = yLink || '';
    }

    // --- ဤနေရာသည် အရေးကြီးဆုံးဖြစ်သည် (UI ပုံဟောင်း list ပြရန်) ---
    oldImageUrls = item.img ? [...item.img] : []; // မူရင်း array ကို spread operator နဲ့ copy ယူမယ်
    const oldImgPreviewContainer = document.getElementById('oldImagesPreview');
    if (oldImgPreviewContainer) {
        if (oldImageUrls.length > 0) {
            oldImgPreviewContainer.innerHTML = oldImageUrls
                .map((url, index) => renderImagePreviewItem(url, index))
                .join('');
            oldImgPreviewContainer.style.display = 'flex'; // Container ကို ပြမယ်
        } else {
            oldImgPreviewContainer.innerHTML = '';
            oldImgPreviewContainer.style.display = 'none'; // Container ကို ဖျောက်မယ်
        }
    }
    // -----------------------------------------------------------------

    document.getElementById('intro').value = item.intro || '';
    document.getElementById('aim').value = Array.isArray(item.aim) ? item.aim.join(', ') : '';
    document.getElementById('theory').value = item.theory || '';
    document.getElementById('process').value = Array.isArray(item.process) ? item.process.join(', ') : '';
    document.getElementById('con').value = item.con || '';
    document.getElementById('authors').value = Array.isArray(item.authors) ? item.authors.join(', ') : (item.authors || '');

    editMode = true; 
    currentEditId = id;
    
    document.getElementById('btn-create').click();
    const saveBtn = document.querySelector('.save-btn');
    if(saveBtn) saveBtn.innerText = "Update Project Data";
}
// script.js ထဲမှာ သီးသန့် function အနေနဲ့ ထည့်ပေးပါ
// ပုံဟောင်းကို array ထဲကနေ ဖယ်ရှားပြီး UI မှာပါ ဖျက်မည့် function
function markImageForDeletion(index) {
    // Array ထဲကနေ index အလိုက် ဖယ်ရှားတယ်
    oldImageUrls.splice(index, 1);
    
    // UI Preview ကို ပြန်ပြင်တယ် (re-render)
    const oldImgPreviewContainer = document.getElementById('oldImagesPreview');
    if (oldImgPreviewContainer) {
        if (oldImageUrls.length > 0) {
            oldImgPreviewContainer.innerHTML = oldImageUrls
                .map((url, idx) => renderImagePreviewItem(url, idx))
                .join('');
            oldImgPreviewContainer.style.display = 'flex';
        } else {
            oldImgPreviewContainer.innerHTML = '';
            oldImgPreviewContainer.style.display = 'none';
        }
    }
    console.log("Updated Old Images Array (Not Sent Yet):", oldImageUrls);
}


// script.js ထဲက resetForm function ကို ပြင်ပါ
function resetForm() {
    editMode = false;
    currentEditId = null;
    oldImageUrls = []; // ယာယီ array ကို ရှင်းမယ်

    // UI Preview Container ကို ရှင်းမယ်
    const oldImgPreviewContainer = document.getElementById('oldImagesPreview');
    if (oldImgPreviewContainer) {
        oldImgPreviewContainer.innerHTML = '';
        oldImgPreviewContainer.style.display = 'none';
    }

    // Fields Reset
    const fields = ['major', 'title', 'intro', 'aim', 'theory', 'process', 'con', 'authors', 'academicYear', 'ratingValue', 'youtubeUrl'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            if(id === 'academicYear') el.value = '2022-23';
            else if(id === 'ratingValue') el.value = '0';
            else el.value = '';
        }
    });
    setRating(0); 
    if(document.getElementById('imageFiles')) document.getElementById('imageFiles').value = "";
    document.querySelector('.save-btn').innerText = "Upload to Cloud";
}
// Security & Search functions
async function deleteProject(id) {
    const result = await Swal.fire({
        title: 'ဖျက်မှာ သေချာပါသလား?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'ဖျက်မည်',
    });

    if (result.isConfirmed) {
        try {
            const res = await fetch(`${API_URL}/delete-project/${id}`, { method: 'DELETE' });
            if(res.ok) {
                Swal.fire('Deleted!', 'အောင်မြင်စွာ ဖျက်ပြီးပါပြီ။', 'success');
                getProjects();
            }
        } catch (err) {
            Swal.fire('Error!', 'ဖျက်၍ မရပါ၊ Server ကို စစ်ဆေးပါ။', 'error');
        }
    }
}

function handleLogout() {
    localStorage.removeItem('adminToken');
    window.location.href = 'login.html';
}

async function handlePasswordChange() {
    const oldPassword = document.getElementById('oldPass').value;
    const newPassword = document.getElementById('newPass').value;
    const confirmPass = document.getElementById('confirmPass').value;

    if (!oldPassword || !newPassword || !confirmPass) {
        return Swal.fire('Error', 'အကွက်အားလုံး ဖြည့်ပေးပါ', 'error');
    }
    if (newPassword !== confirmPass) {
        return Swal.fire('Error', 'Password အသစ်နှစ်ခု မတူညီပါ', 'error');
    }

    Swal.fire({ title: 'Updating...', didOpen: () => Swal.showLoading() });

    try {
        const res = await fetch(`${API_URL}/admin/change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', oldPassword, newPassword })
        });
        const data = await res.json();
        if (data.success) {
            Swal.fire('Success', 'Password ပြောင်းလဲပြီးပါပြီ', 'success');
            ['oldPass', 'newPass', 'confirmPass'].forEach(id => document.getElementById(id).value = '');
        } else {
            Swal.fire('Failed', data.message, 'error');
        }
    } catch (err) {
        Swal.fire('Error', 'Server နှင့် ချိတ်ဆက်မရပါ', 'error');
    }
}

function searchProjects(query) {
    const searchTerm = query.toLowerCase().trim();
    const selectedMajor = document.getElementById('majorFilter').value;
    const filtered = allProjects.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchTerm);
        const matchesMajor = (selectedMajor === 'All') || (p.major === selectedMajor);
        return matchesSearch && matchesMajor;
    });
    displayProjects(filtered);
}

function filterByMajor(major) {
    const filtered = (major === 'All') 
        ? allProjects 
        : allProjects.filter(p => p.major === major);
    displayProjects(filtered);
}
