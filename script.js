// Espera a que todo el contenido de la página esté cargado
document.addEventListener('DOMContentLoaded', () => {

    // Selecciona el formulario usando su ID
    const loginForm = document.getElementById('login-form');

    // Escucha el evento 'submit' (cuando el usuario presiona el botón Entrar)
    loginForm.addEventListener('submit', (event) => {
        
        // Previene el comportamiento por defecto del formulario (que es recargar la página)
        event.preventDefault();

        // Obtiene los valores escritos en los campos de email y contraseña
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // --- SIMULACIÓN DE LÓGICA DE LOGIN ---
        // En el futuro, aquí es donde el código enviaría estos datos al backend para verificarlos.

        // Por ahora, solo mostraremos los datos en la consola para confirmar que los capturamos.
        // Para ver esto: en tu navegador, haz clic derecho -> "Inspeccionar" -> Pestaña "Consola".
        console.log('Intento de inicio de sesión con:');
        console.log('Email:', email);
        console.log('Contraseña:', password);

        // Muestra una alerta simple al usuario para dar retroalimentación.
        alert(`¡Hola! Se intentó iniciar sesión con el email: ${email}`);
        
        // Cuando el login sea real, esta línea te llevaría a la página del calendario.
        // window.location.href = '/calendario.html'; 
    });
});