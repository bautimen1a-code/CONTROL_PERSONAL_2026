// ============ AUTENTICACIÓN ============
let currentUser = null;
let currentSession = null;

async function inicializarAdmin() {
    try {
        const adminExistente = await getOperadorByUsername('admin');
        if (!adminExistente) {
            const admin = {
                id: 'admin-001',
                nombre: 'Administrador',
                username: 'admin',
                password: 'admin123',
                rol: 'admin',
                permisos: {
                    control_asistencia: true,
                    ver_dentro: true,
                    ver_reportes: true,
                    ver_personal: true,
                    ver_observados: true,
                    resolver_observaciones: true,
                    importar_csv: true,
                    exportar_respaldo: true,
                    gestionar_operadores: true,
                    ver_auditoria: true
                },
                activo: true
            };
            await addOperador(admin);
            console.log('✅ Administrador creado: admin / admin123');
        } else {
            console.log('✅ Administrador ya existe');
        }
    } catch (error) {
        console.error('❌ Error al inicializar admin:', error);
        throw error;
    }
}

async function login(username, password) {
    try {
        const operador = await getOperadorByUsername(username);
        if (!operador) throw new Error('Usuario no encontrado');
        if (operador.password !== password) throw new Error('Contraseña incorrecta');
        if (!operador.activo) throw new Error('Operador inactivo');

        currentUser = operador;

        currentSession = {
            operador_id: operador.id,
            fecha: obtenerFechaActual(),
            hora_inicio: obtenerHoraActual(),
            hora_fin: null,
            tipo: 'LOGIN'
        };
        try {
            await addSesion(currentSession);
        } catch (e) {
            console.warn('⚠️ No se pudo registrar sesión:', e);
        }

        try {
            await addAuditoria({
                operador_id: operador.id,
                nombre_operador: operador.nombre,
                rol: operador.rol,
                fecha: obtenerFechaActual(),
                hora: obtenerHoraActual(),
                accion: 'Inicio de sesión',
                detalle: `${operador.nombre} inició sesión`
            });
        } catch (e) {
            console.warn('⚠️ No se pudo registrar auditoría:', e);
        }

        console.log(`✅ Login exitoso: ${operador.nombre}`);
        return operador;
    } catch (error) {
        console.error('❌ Error en login:', error);
        throw error;
    }
}

async function logout() {
    if (currentUser && currentSession) {
        currentSession.hora_fin = obtenerHoraActual();
        try {
            await addAuditoria({
                operador_id: currentUser.id,
                nombre_operador: currentUser.nombre,
                rol: currentUser.rol,
                fecha: obtenerFechaActual(),
                hora: obtenerHoraActual(),
                accion: 'Cierre de sesión',
                detalle: `${currentUser.nombre} cerró sesión`
            });
        } catch (e) {
            console.warn('⚠️ No se pudo registrar cierre:', e);
        }
    }
    currentUser = null;
    currentSession = null;
    console.log('👋 Sesión cerrada');
}

function tienePermiso(permiso) {
    if (!currentUser) return false;
    if (currentUser.rol === 'admin') return true;
    return currentUser.permisos && currentUser.permisos[permiso] === true;
}

// ============ FECHA Y HORA (CORREGIDO - LOCAL, NO UTC) ============
// ✅ FIX: Antes usaba toISOString() que convertía a UTC y adelantaba un día
// después de las 20:00 en zonas UTC-4 (Bolivia, Chile, Argentina, etc.)
// Ahora se usa getFullYear/getMonth/getDate que devuelven la fecha LOCAL.

/**
 * Devuelve la fecha actual en formato YYYY-MM-DD usando la zona horaria LOCAL.
 * @returns {string}
 */
function obtenerFechaActual() {
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
}

/**
 * Devuelve la hora actual en formato HH:MM:SS usando la zona horaria LOCAL.
 * @returns {string}
 */
function obtenerHoraActual() {
    const ahora = new Date();
    const horas = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    const segundos = String(ahora.getSeconds()).padStart(2, '0');
    return `${horas}:${minutos}:${segundos}`;
}

/**
 * Devuelve un objeto { fecha, hora } con los valores actuales LOCALES.
 * @returns {{fecha: string, hora: string}}
 */
function obtenerFechaHoraActual() {
    return {
        fecha: obtenerFechaActual(),
        hora: obtenerHoraActual()
    };
}
