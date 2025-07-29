// --- CONFIGURACIÓN ---
const SUPABASE_URL = 'https://iwoduwilxjburozehzjq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3b2R1d2lseGpidXJvemVoempxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMjY1ODksImV4cCI6MjA2ODgwMjU4OX0.8wdrxV8iUzMVX71y-lu94XAQoLQ6rbQoB1u8LA2b9i0';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- CONSTANTES DEL PROYECTO ---
const ID_EMPLEADO_PENDIENTE = 'f29a57d5-10be-4772-9a20-5f58975a69bc';
const ID_CONSULTORIO_POR_DEFECTO = 4; 

// --- ELEMENTOS DEL DOM ---
const modal = document.getElementById('evento-modal');
const cerrarModalBtn = document.querySelector('.modal-cerrar');
const eventoForm = document.getElementById('evento-form');
const alertaModal = document.getElementById('alerta-modal');
const alertaMensaje = document.getElementById('alerta-mensaje');
const alertaCerrarBtn = document.getElementById('alerta-cerrar-btn');
let calendario;

// --- LÓGICA PRINCIPAL ---
function inicializar() {
    configurarCalendario();
    cargarEventosOcupados();
    configurarEventListeners();
}

function configurarCalendario() {
    const calendarioEl = document.getElementById('calendario');
    calendario = new FullCalendar.Calendar(calendarioEl, {
        initialView: 'timeGridWeek',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'timeGridWeek,timeGridDay' },
        height: 'auto',
        locale: 'es',
        selectable: true,
        slotMinTime: '08:00:00',
        slotMaxTime: '22:00:00',
        slotLabelFormat: { hour: 'numeric', minute: '2-digit', meridiem: 'short' },
        
        // --- LÍNEA AÑADIDA ---
        nowIndicator: true, // Muestra la línea de la hora actual

        select: handleTimeSelect,
        dateClick: handleDateClick,
    });
    calendario.render();
}

// Carga los horarios desde la vista segura y los muestra como "Ocupado"
async function cargarEventosOcupados() {
    const { data, error } = await supabaseClient.from('horarios_publicos').select('fecha_inicio, fecha_fin');
    if (error) {
        console.error("Error cargando horarios:", error);
        return;
    }
    const eventos = data.map(evento => ({
        start: evento.fecha_inicio,
        end: evento.fecha_fin,
        display: 'background', // Muestra el evento como un bloque de fondo
        color: '#ff9f89' // Un color para indicar que está ocupado
    }));
    calendario.removeAllEvents();
    calendario.addEventSource(eventos);
}

function handleDateClick(info) { abrirModal(info.dateStr); }
function handleTimeSelect(info) { abrirModal(info.startStr); }

function abrirModal(fechaInicio) {
    eventoForm.reset();
    const fechaInicioObj = new Date(fechaInicio);
    document.getElementById('fecha_inicio').value = formatarFechaParaInput(fechaInicioObj);
    modal.style.display = 'block';
}

function cerrarModal() { modal.style.display = 'none'; }
function mostrarAlerta(mensaje) { alertaMensaje.textContent = mensaje; alertaModal.style.display = 'block'; }
function cerrarAlerta() { alertaModal.style.display = 'none'; }

async function handleFormSubmit(e) {
    e.preventDefault();
    const nombrePaciente = document.getElementById('nombre_paciente').value;
    const fechaInicio = document.getElementById('fecha_inicio').value;
    const fechaFin = new Date(new Date(fechaInicio).getTime() + 3600000).toISOString();

    if (!nombrePaciente.trim()) {
        mostrarAlerta("Por favor, introduce tu nombre completo.");
        return;
    }
    
    // Validaciones de horario
    if (new Date(fechaInicio).getHours() < 8 || new Date(fechaInicio).getHours() >= 22) {
        mostrarAlerta('Las citas solo pueden agendarse entre las 8:00 AM y las 10:00 PM.');
        return;
    }

    // Comprobar si el horario está ocupado
    try {
        const { count, error } = await supabaseClient.from('reservaciones')
            .select('id', { count: 'exact' })
            .lt('fecha_inicio', fechaFin)
            .gt('fecha_fin', new Date(fechaInicio).toISOString());
        if (error) throw error;
        if (count > 0) {
            mostrarAlerta('Lo sentimos, este horario acaba de ser ocupado. Por favor, selecciona otro.');
            return;
        }
    } catch (error) { mostrarAlerta('Error al verificar disponibilidad: ' + error.message); return; }

    // Si todo está bien, guardamos la cita
    const nuevaCita = {
        titulo: `${nombrePaciente}`,
        id_consultorio: ID_CONSULTORIO_POR_DEFECTO,
        fecha_inicio: new Date(fechaInicio).toISOString(),
        fecha_fin: fechaFin,
        id_empleado: ID_EMPLEADO_PENDIENTE
    };

    const { error: insertError } = await supabaseClient.from('reservaciones').insert(nuevaCita);

    if (insertError) {
        mostrarAlerta("Error al agendar la cita: " + insertError.message);
    } else {
        cerrarModal();
        mostrarAlerta('¡Tu cita ha sido agendada con éxito! Pronto nos pondremos en contacto contigo.');
        cargarEventosOcupados(); // Recarga los horarios
    }
}

function configurarEventListeners() {
    cerrarModalBtn.onclick = cerrarModal;
    alertaCerrarBtn.onclick = cerrarAlerta;
    window.onclick = (event) => {
        if (event.target == modal || event.target == alertaModal) {
            cerrarModal();
            cerrarAlerta();
        }
    };
    eventoForm.onsubmit = handleFormSubmit;
}

function formatarFechaParaInput(fecha) {
    if (!fecha) return '';
    const d = new Date(fecha);
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
}

document.addEventListener('DOMContentLoaded', inicializar);