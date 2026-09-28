// ============ BASE DE DATOS ============
const DB_NAME = 'ControlPersonalDB';
const DB_VERSION = 1;

let db = null;

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onupgradeneeded = (e) => {
            const database = e.target.result;
            
            if (!database.objectStoreNames.contains('empleados')) {
                const empleadosStore = database.createObjectStore('empleados', { keyPath: 'id' });
                empleadosStore.createIndex('cedula', 'cedula', { unique: true });
                empleadosStore.createIndex('rfid', 'rfid', { unique: true });
                empleadosStore.createIndex('nombre', 'nombre', { unique: false });
            }
            
            if (!database.objectStoreNames.contains('fichajes')) {
                const fichajesStore = database.createObjectStore('fichajes', { keyPath: 'id', autoIncrement: true });
                fichajesStore.createIndex('empleado_id', 'empleado_id', { unique: false });
                fichajesStore.createIndex('fecha', 'fecha', { unique: false });
                fichajesStore.createIndex('tipo', 'tipo', { unique: false });
            }
            
            if (!database.objectStoreNames.contains('operadores')) {
                const operadoresStore = database.createObjectStore('operadores', { keyPath: 'id' });
                operadoresStore.createIndex('username', 'username', { unique: true });
            }
            
            if (!database.objectStoreNames.contains('sesiones')) {
                const sesionesStore = database.createObjectStore('sesiones', { keyPath: 'id', autoIncrement: true });
                sesionesStore.createIndex('operador_id', 'operador_id', { unique: false });
                sesionesStore.createIndex('fecha', 'fecha', { unique: false });
            }
            
            if (!database.objectStoreNames.contains('auditoria')) {
                const auditoriaStore = database.createObjectStore('auditoria', { keyPath: 'id', autoIncrement: true });
                auditoriaStore.createIndex('operador_id', 'operador_id', { unique: false });
                auditoriaStore.createIndex('fecha', 'fecha', { unique: false });
            }
            
            if (!database.objectStoreNames.contains('observaciones')) {
                const observacionesStore = database.createObjectStore('observaciones', { keyPath: 'id', autoIncrement: true });
                observacionesStore.createIndex('empleado_id', 'empleado_id', { unique: false });
                observacionesStore.createIndex('fecha', 'fecha', { unique: false });
                observacionesStore.createIndex('estado', 'estado', { unique: false });
            }
            
            if (!database.objectStoreNames.contains('configuracion')) {
                database.createObjectStore('configuracion', { keyPath: 'clave' });
            }
        };
        
        request.onsuccess = (e) => {
            db = e.target.result;
            console.log('✅ Base de datos iniciada');
            resolve(db);
        };
        
        request.onerror = (e) => {
            console.error('❌ Error DB:', e.target.error);
            reject(e.target.error);
        };
    });
}

function ensureDB() {
    if (!db) throw new Error('Base de datos no inicializada');
    return db;
}

// ============ CRUD EMPLEADOS ============
function addEmpleado(empleado) {
    return new Promise((resolve, reject) => {
        try {
            const tx = ensureDB().transaction('empleados', 'readwrite');
            const store = tx.objectStore('empleados');
            const request = store.add(empleado);
            request.onsuccess = () => resolve(empleado);
            request.onerror = () => reject(request.error);
        } catch (err) { reject(err); }
    });
}

function updateEmpleado(empleado) {
    return new Promise((resolve, reject) => {
        try {
            const tx = ensureDB().transaction('empleados', 'readwrite');
            const store = tx.objectStore('empleados');
            const request = store.put(empleado);
            request.onsuccess = () => resolve(empleado);
            request.onerror = () => reject(request.error);
        } catch (err) { reject(err); }
    });
}

function deleteEmpleado(id) {
    return new Promise((resolve, reject) => {
        try {
            const tx = ensureDB().transaction('empleados', 'readwrite');
            const store = tx.objectStore('empleados');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        } catch (err) { reject(err); }
    });
}

function getEmpleado(id) {
    return new Promise((resolve, reject) => {
        try {
            const tx = ensureDB().transaction('empleados', 'readonly');
            const store = tx.objectStore('empleados');
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        } catch (err) { reject(err); }
    });
}

function getEmpleadoByRFID(rfid) {
    return new Promise((resolve, reject) => {
        try {
            const tx = ensureDB().transaction('empleados', 'readonly');
            const store = tx.objectStore('empleados');
            const index = store.index('rfid');
            const request = index.get(rfid);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        } catch (err) { reject(err); }
    });
}

function getAllEmpleados() {
    return new Promise((resolve, reject) => {
        try {
            const tx = ensureDB().transaction('empleados', 'readonly');
            const store = tx.objectStore('empleados');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        } catch (err) { reject(err); }
    });
}

// ============ CRUD FICHAJES ============
function addFichaje(fichaje) {
    return new Promise((resolve, reject) => {
        try {
            const tx = ensureDB().transaction('fichajes', 'readwrite');
            const store = tx.objectStore('fichajes');
            const request = store.add(fichaje);
            request.onsuccess = () => resolve(fichaje);
            request.onerror = () => reject(request.error);
        } catch (err) { reject(err); }
    });
}

function getFichajesByEmpleado(empleadoId) {
    return new Promise((resolve, reject) => {
        try {
            const tx = ensureDB().transaction('fichajes', 'readonly');
            const store = tx.objectStore('fichajes');
            const index = store.index('empleado_id');
            const request = index.getAll(empleadoId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        } catch (err) { reject(err); }
    });
}

function getFichajesByFecha(fecha) {
    return new Promise((resolve, reject) => {
        try {
            const tx = ensureDB().transaction('fichajes', 'readonly');
            const store = tx.objectStore('fichajes');
            const index = store.index('fecha');
            const request = index.getAll(fecha);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        } catch (err) { reject(err); }
    });
}

function getAllFichajes() {
    return new Promise((resolve, reject) => {
        try {
            const tx = ensureDB().transaction('fichajes', 'readonly');
            const store = tx.objectStore('fichajes');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        } catch (err) { reject(err); }
    });
}

// ============ CRUD OPERADORES ============
function addOperador(operador) {
    return new Promise((resolve, reject) => {
        try {
            const tx = ensureDB().transaction('operadores', 'readwrite');
            const store = tx.objectStore('operadores');
            const request = store.put(operador);
            request.onsuccess = () => resolve(operador);
            request.onerror = () => reject(request.error);
        } catch (err) { reject(err); }
    });
}

function getOperadorByUsername(username) {
    return new Promise((resolve, reject) => {
        try {
            const tx = ensureDB().transaction('operadores', 'readonly');
            const store = tx.objectStore('operadores');
            const index = store.index('username');
            const request = index.get(username);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        } catch (err) { reject(err); }
    });
}

function getAllOperadores() {
    return new Promise((resolve, reject) => {
        try {
            const tx = ensureDB().transaction('operadores', 'readonly');
            const store = tx.objectStore('operadores');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        } catch (err) { reject(err); }
    });
}

function deleteOperador(id) {
    return new Promise((resolve, reject) => {
        try {
            const tx = ensureDB().transaction('operadores', 'readwrite');
            const store = tx.objectStore('operadores');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        } catch (err) { reject(err); }
    });
}

// ============ AUDITORÍA ============
function addAuditoria(registro) {
    return new Promise((resolve, reject) => {
        try {
            const tx = ensureDB().transaction('auditoria', 'readwrite');
            const store = tx.objectStore('auditoria');
            if (!registro.rol) {
                registro.rol = 'operador';
            }
            const request = store.add(registro);
            request.onsuccess = () => resolve(registro);
            request.onerror = () => reject(request.error);
        } catch (err) { reject(err); }
    });
}

function getAllAuditoria() {
    return new Promise((resolve, reject) => {
        try {
            const tx = ensureDB().transaction('auditoria', 'readonly');
            const store = tx.objectStore('auditoria');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        } catch (err) { reject(err); }
    });
}

// ============ OBSERVACIONES ============
function addObservacion(observacion) {
    return new Promise((resolve, reject) => {
        try {
            const tx = ensureDB().transaction('observaciones', 'readwrite');
            const store = tx.objectStore('observaciones');
            const request = store.add(observacion);
            request.onsuccess = () => resolve(observacion);
            request.onerror = () => reject(request.error);
        } catch (err) { reject(err); }
    });
}

function getAllObservaciones() {
    return new Promise((resolve, reject) => {
        try {
            const tx = ensureDB().transaction('observaciones', 'readonly');
            const store = tx.objectStore('observaciones');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        } catch (err) { reject(err); }
    });
}

function updateObservacion(observacion) {
    return new Promise((resolve, reject) => {
        try {
            const tx = ensureDB().transaction('observaciones', 'readwrite');
            const store = tx.objectStore('observaciones');
            const request = store.put(observacion);
            request.onsuccess = () => resolve(observacion);
            request.onerror = () => reject(request.error);
        } catch (err) { reject(err); }
    });
}

// ============ CONFIGURACIÓN ============
function setConfig(clave, valor) {
    return new Promise((resolve, reject) => {
        try {
            const tx = ensureDB().transaction('configuracion', 'readwrite');
            const store = tx.objectStore('configuracion');
            const request = store.put({ clave, valor });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        } catch (err) { reject(err); }
    });
}

function getConfig(clave) {
    return new Promise((resolve, reject) => {
        try {
            const tx = ensureDB().transaction('configuracion', 'readonly');
            const store = tx.objectStore('configuracion');
            const request = store.get(clave);
            request.onsuccess = () => resolve(request.result ? request.result.valor : null);
            request.onerror = () => reject(request.error);
        } catch (err) { reject(err); }
    });
}

// ============ SESIONES ============
function addSesion(sesion) {
    return new Promise((resolve, reject) => {
        try {
            const tx = ensureDB().transaction('sesiones', 'readwrite');
            const store = tx.objectStore('sesiones');
            const request = store.add(sesion);
            request.onsuccess = () => resolve(sesion);
            request.onerror = () => reject(request.error);
        } catch (err) { reject(err); }
    });
}