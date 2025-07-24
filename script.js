// --- CONFIGURACIÓN DE SUPABASE (LADO DEL CLIENTE) ---
const SUPABASE_URL = 'https://iwoduwilxjburozehzjq.supabase.co'; // Pega tu URL aquí
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3b2R1d2lseGpidXJvemVoempxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMjY1ODksImV4cCI6MjA2ODgwMjU4OX0.8wdrxV8iUzMVX71y-lu94XAQoLQ6rbQoB1u8LA2b9i0'; // Pega tu llave ANON (pública) aquí
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// --- ELEMENTOS DEL DOM ---
const loginForm = document.getElementById('login-form');
const alertaModal = document.getElementById('alerta-modal');
const alertaMensaje = document.getElementById('alerta-mensaje');
const alertaCerrarBtn = document.getElementById('alerta-cerrar-btn');

// --- FUNCIONES ---
function mostrarAlerta(mensaje) {
    alertaMensaje.textContent = mensaje;
    alertaModal.style.display = 'block';
}

function cerrarAlerta() {
    alertaModal.style.display = 'none';
}

// --- LÓGICA DEL LOGIN ---
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        mostrarAlerta(`Error: ${error.message}`);
    } else {
        window.location.href = 'reservas.html';
    }
});

// --- LISTENERS PARA EL MODAL ---
alertaCerrarBtn.onclick = cerrarAlerta;
window.onclick = (event) => {
    if (event.target == alertaModal) {
        cerrarAlerta();
    }
};
