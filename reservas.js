// --- CONFIGURACIÓN ---
const SUPABASE_URL = 'https://iwoduwilxjburozehzjq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3b2R1d2lseGpidXJvemVoempxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMjY1ODksImV4cCI6MjA2ODgwMjU4OX0.8wdrxV8iUzMVX71y-lu94XAQoLQ6rbQoB1u8LA2b9i0';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- VARIABLES GLOBALES ---
let calendario;
let currentUser = null;
let userRole = null;
let idParaEliminar = null;
let vistaActual = 'todos';
let todasLasReservaciones = [];
let todosLosPerfiles = [];

// --- ELEMENTOS DEL DOM ---
const modal = document.getElementById('evento-modal');
const modalTitulo = document.getElementById('modal-titulo');
const cerrarModalBtn = document.querySelector('.modal-cerrar');
const eventoForm = document.getElementById('evento-form');
const eliminarBtn = document.getElementById('eliminar-btn');
const logoutBtn = document.getElementById('logout-btn');
const nombreUsuarioEl = document.getElementById('nombre-usuario');
const toggleViewBtn = document.getElementById('toggle-view-btn');
const nuevaReservaBtn = document.getElementById('nueva-reserva-btn');
const alertaModal = document.getElementById('alerta-modal');
const alertaMensaje = document.getElementById('alerta-mensaje');
const alertaCerrarBtn = document.getElementById('alerta-cerrar-btn');
const confirmarModal = document.getElementById('confirmar-modal');
const confirmarEliminarBtn = document.getElementById('confirmar-eliminar-btn');
const cancelarEliminarBtn = document.getElementById('cancelar-eliminar-btn');

// --- LÓGICA PRINCIPAL ---
async function inicializar() {
    await verificarSesion();
    configurarCalendario();
    await cargarTodasLasReservaciones();
    filtrarYRenderizarEventos();
    configurarEventListeners();
}

async function verificarSesion() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) { window.location.href = 'index.html'; return; }
    currentUser = session.user;

    const { data: profile } = await supabaseClient.from('profiles').select('name, role').eq('id', currentUser.id).single();
    if (profile) {
        userRole = profile.role;
        nombreUsuarioEl.textContent = `${profile.name} (${profile.role})`;
        if (userRole === 'administrador') {
            toggleViewBtn.style.display = 'block';
            const { data: perfiles } = await supabaseClient.from('profiles').select('id, name, role');
            if (perfiles) todosLosPerfiles = perfiles;
        }
    }
}

function configurarCalendario() {
    const calendarioEl = document.getElementById('calendario');
    calendario = new FullCalendar.Calendar(calendarioEl, {
        initialView: 'timeGridWeek',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
        height: 'auto',
        locale: 'es',
        editable: true,
        selectable: true,
        slotMinTime: '08:00:00',
        slotMaxTime: '22:00:00',
        slotLabelFormat: { hour: 'numeric', minute: '2-digit', meridiem: 'short' },
        dateClick: handleDateClick,
        select: handleTimeSelect,
        eventClick: handleEventClick,
        eventDrop: handleEventDrop,
    });
    calendario.render();
}

async function cargarTodasLasReservaciones() {
    const { data, error } = await supabaseClient.from('reservaciones').select(`id, titulo, fecha_inicio, fecha_fin, id_consultorio, id_empleado, oculto, consultorios(nombre), profiles(name, color_evento)`);
    todasLasReservaciones = error ? [] : data;
    if (error) console.error("Error cargando reservaciones:", error);
}

function filtrarYRenderizarEventos() {
    let eventosFiltrados = todasLasReservaciones;
    if (vistaActual === 'propias') {
        eventosFiltrados = todasLasReservaciones.filter(e => e.id_empleado === currentUser.id);
    } else {
        eventosFiltrados = todasLasReservaciones.filter(e => !e.oculto || (e.oculto && e.id_empleado === currentUser.id));
    }
    
    const eventosParaCalendario = eventosFiltrados.map(evento => ({
        id: evento.id,
        title: `${evento.profiles?.name || 'N/A'} - ${evento.titulo} (${evento.consultorios?.nombre || 'N/A'})`,
        start: evento.fecha_inicio,
        end: evento.fecha_fin,
        backgroundColor: evento.profiles?.color_evento || '#808080',
        borderColor: evento.profiles?.color_evento || '#808080',
        extendedProps: { ...evento }
    }));

    calendario.removeAllEvents();
    calendario.addEventSource(eventosParaCalendario);
}

// --- MANEJADORES DE EVENTOS DEL CALENDARIO ---
function handleDateClick(info) { abrirModal(info.dateStr); }
function handleTimeSelect(info) { abrirModal(info.startStr, null, info.endStr); }
function handleEventClick(info) { abrirModal(null, info.event); }
async function handleEventDrop(info) { /* ...código sin cambios... */ }


// --- LÓGICA DE MODALES ---
async function abrirModal(fechaInicio = null, evento = null, fechaFin = null) {
    eventoForm.reset();
    document.getElementById('id_reservacion').value = '';
    eliminarBtn.style.display = 'none';
    const empleadoSelectorDiv = document.getElementById('admin-seleccion-empleado');
    const empleadoSelect = document.getElementById('id_empleado_seleccionado');
    const consultorioSelect = document.getElementById('id_consultorio');
    
    if (userRole === 'administrador') {
        empleadoSelectorDiv.style.display = 'block';
        if (todosLosPerfiles.length > 0) {
            empleadoSelect.innerHTML = '';
            todosLosPerfiles.forEach(p => empleadoSelect.add(new Option(p.name, p.id)));
        }
    } else {
        empleadoSelectorDiv.style.display = 'none';
    }

    if (evento) {
        modalTitulo.textContent = 'Editar Reservación';
        const props = evento.extendedProps;
        document.getElementById('id_reservacion').value = evento.id;
        document.getElementById('titulo').value = props.titulo;
        document.getElementById('fecha_inicio').value = formatarFechaParaInput(evento.start);
        if (userRole === 'administrador') empleadoSelect.value = props.id_empleado;
        document.getElementById('ocultar-reserva-checkbox').checked = props.oculto;
        if (userRole === 'administrador' || currentUser.id === props.id_empleado) {
            eliminarBtn.style.display = 'inline-block';
        }
        // Asegura que la opción Online esté si es necesario
        actualizarCamposAdmin();
        consultorioSelect.value = props.id_consultorio;

    } else {
        modalTitulo.textContent = 'Nueva Reservación';
        const fechaInicioObj = new Date(fechaInicio);
        document.getElementById('fecha_inicio').value = formatarFechaParaInput(fechaInicioObj);
        if (userRole === 'administrador') {
            empleadoSelect.value = currentUser.id;
            consultorioSelect.value = '1'; // Resetea a opción física por defecto
        }
    }
    
    actualizarCamposAdmin(); // Llama a la función para establecer el estado inicial correcto
    modal.style.display = 'block';
}

function cerrarModal() { modal.style.display = 'none'; }
function mostrarAlerta(mensaje) { alertaMensaje.textContent = mensaje; alertaModal.style.display = 'block'; }
function cerrarAlerta() { alertaModal.style.display = 'none'; }

// FUNCIÓN ACTUALIZADA Y RENOMBRADA PARA MANEJAR TODAS LAS REGLAS DE ADMIN
function actualizarCamposAdmin() {
    const empleadoSelect = document.getElementById('id_empleado_seleccionado');
    const consultorioSelect = document.getElementById('id_consultorio');
    const onlineOption = consultorioSelect.querySelector('option[value="4"]');
    const ocultarDiv = document.getElementById('ocultar-reserva-div');
    const ocultarCheckbox = document.getElementById('ocultar-reserva-checkbox');

    if (userRole !== 'administrador') {
        ocultarDiv.style.display = 'none';
        return;
    }

    const empleadoSeleccionadoId = empleadoSelect.value;
    const perfilSeleccionado = todosLosPerfiles.find(p => p.id === empleadoSeleccionadoId);

    // Regla 1: Opción "Online" solo visible para empleados que son admins
    if (perfilSeleccionado && perfilSeleccionado.role === 'administrador') {
        if (!onlineOption) consultorioSelect.add(new Option('Online', '4'));
    } else {
        if (onlineOption) {
            if (consultorioSelect.value === '4') consultorioSelect.value = '1';
            consultorioSelect.removeChild(onlineOption);
        }
    }

    // Regla 2: Visibilidad de "Ocultar"
    const esAdminParaSi = empleadoSeleccionadoId === currentUser.id;
    ocultarDiv.style.display = esAdminParaSi ? 'block' : 'none';

    // NUEVA REGLA 3: Si se elige "Online", se fuerza y bloquea "Ocultar"
    if (consultorioSelect.value === '4') {
        ocultarCheckbox.checked = true;
        ocultarCheckbox.disabled = true; // Bloquea el checkbox
    } else {
        ocultarCheckbox.disabled = false; // Desbloquea el checkbox
        // Si no está bloqueado, su estado depende de si el admin quiere ocultar una cita física
        // No lo desmarcamos automáticamente, para dar flexibilidad.
    }
}


async function handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('id_reservacion').value;
    const fechaInicio = document.getElementById('fecha_inicio').value;
    const fechaFin = new Date(new Date(fechaInicio).getTime() + 3600000).toISOString();
    const idConsultorio = document.getElementById('id_consultorio').value;
    
    if (new Date(fechaInicio).getHours() < 8 || new Date(fechaInicio).getHours() >= 22) { mostrarAlerta('El horario debe ser entre 8 AM y 10 PM.'); return; }

    try {
        let query = supabaseClient.from('reservaciones').select('id', { count: 'exact' }).eq('id_consultorio', idConsultorio)
            .lt('fecha_inicio', fechaFin).gt('fecha_fin', new Date(fechaInicio).toISOString());
        if (id) query = query.neq('id', id);
        const { count, error } = await query;
        if (error) throw error;
        if (count > 0) { mostrarAlerta('Este horario ya está ocupado para este consultorio.'); return; }
    } catch (error) { mostrarAlerta('Error al verificar disponibilidad: ' + error.message); return; }

    let empleadoId = (userRole === 'administrador') ? document.getElementById('id_empleado_seleccionado').value : currentUser.id;
    let esOculto = false;
    if(document.getElementById('ocultar-reserva-div').style.display === 'block'){
        esOculto = document.getElementById('ocultar-reserva-checkbox').checked;
    }
    
    const datosCita = {
        titulo: document.getElementById('titulo').value,
        id_consultorio: idConsultorio,
        fecha_inicio: new Date(fechaInicio).toISOString(),
        fecha_fin: fechaFin,
        id_empleado: empleadoId,
        oculto: esOculto,
    };

    const { error } = id ? await supabaseClient.from('reservaciones').update(datosCita).eq('id', id)
                         : await supabaseClient.from('reservaciones').insert(datosCita);

    if (error) { mostrarAlerta("Error al guardar: " + error.message); }
    else {
        cerrarModal();
        await cargarTodasLasReservaciones();
        filtrarYRenderizarEventos();
    }
}

function handleEliminar() { /* ...código sin cambios... */ }
async function handleLogout(event) { /* ...código sin cambios... */ }

function configurarEventListeners() {
    cerrarModalBtn.onclick = cerrarModal;
    alertaCerrarBtn.onclick = cerrarAlerta;
    cancelarEliminarBtn.onclick = () => { confirmarModal.style.display = 'none'; idParaEliminar = null; };
    confirmarEliminarBtn.onclick = async () => { /* ...código sin cambios... */ };
    window.onclick = (event) => { /* ...código sin cambios... */ };
    eventoForm.onsubmit = handleFormSubmit;
    eliminarBtn.onclick = handleEliminar;
    logoutBtn.addEventListener('click', handleLogout);
    nuevaReservaBtn.onclick = () => abrirModal(new Date());
    toggleViewBtn.onclick = () => { /* ...código sin cambios... */ };
    
    // Asignamos los listeners a los selectores de admin
    const consultorioSelect = document.getElementById('id_consultorio');
    const empleadoSelect = document.getElementById('id_empleado_seleccionado');
    consultorioSelect.addEventListener('change', actualizarCamposAdmin);
    empleadoSelect.addEventListener('change', actualizarCamposAdmin);
}

function formatarFechaParaInput(fecha) { /* ...código sin cambios... */ }
document.addEventListener('DOMContentLoaded', inicializar);
