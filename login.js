const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api' 
    : 'https://tu-showcase-admin.vercel.app/api';

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    Swal.fire({ title: 'Checking...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const res = await fetch(`${API_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();
        if (data.success) {
            localStorage.setItem('adminToken', data.token);
            Swal.fire('Success', 'Welcome Admin!', 'success').then(() => {
                window.location.href = 'index.html'; // Dashboard ဖိုင်အမည်
            });
        } else {
            Swal.fire('Error', data.message, 'error');
        }
    } catch (err) {
        Swal.fire('Error', 'Server နှင့် ချိတ်ဆက်၍မရပါ', 'error');
    }
});
