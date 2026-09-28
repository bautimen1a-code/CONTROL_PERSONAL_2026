// ============ CONFIGURACIÓN ============
const ES_MOVIL = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const CONFIG_FOTOS = {
    calidad: 0.35,
    anchoMaximo: 480,
    altoMaximo: 480,
    formato: 'image/jpeg'
};

let pantallaActual = 'login';
let modoFullscreen = false;
let carpetaHandle = null;
let stream = null;
let fotoCapturada = null;
let fotoEditCapturada = null;
let fotoControlCapturada = null;

// ============ FECHAS Y HORAS ============
function obtenerFechaActual() {
    const ahora = new Date();
    return ahora.toISOString().split('T')[0];
}

function obtenerHoraActual() {
    const ahora = new Date();
    return ahora.toTimeString().split(' ')[0];
}

function obtenerFechaHoraActual() {
    return {
        fecha: obtenerFechaActual(),
        hora: obtenerHoraActual()
    };
}

// ============ NAVEGACIÓN ============
function volverAlInicio() {
    if (currentUser) {
        renderizarDashboard();
    } else {
        mostrarPantalla('login');
    }
}

function crearEncabezadoModulo(titulo, subtitulo = '') {
    return `
        <div class="module-header">
            <div>
                <h2>${titulo}</h2>
                ${subtitulo ? `<p class="subtitle">${subtitulo}</p>` : ''}
            </div>
            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                <button class="btn-home" onclick="toggleFullscreen()" title="Pantalla completa">
                    ${modoFullscreen ? '📱' : '🖥️'}
                </button>
                <button class="btn-home" onclick="volverAlInicio()">
                    🏠 Inicio
                </button>
            </div>
        </div>
    `;
}

// ============ FULLSCREEN ============
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log('Error fullscreen:', err);
        });
        modoFullscreen = true;
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
            modoFullscreen = false;
        }
    }
}

// ============ BOTÓN ATRÁS ============
function initBackButtonHandler() {
    if (window.history && window.history.pushState) {
        window.history.pushState(null, '', window.location.href);
        
        window.addEventListener('popstate', async (e) => {
            if (pantallaActual !== 'login' && currentUser) {
                if (confirm('⚠️ ¿Seguro que quieres salir?\nLos datos están guardados.')) {
                    await backupAutomatico(true);
                    await logout();
                    mostrarPantalla('login');
                } else {
                    window.history.pushState(null, '', window.location.href);
                }
            }
        });
    }
}

// ============ SONIDOS ============
const SONIDOS = {
    entrada: { frecuencia: 880, duracion: 300, tipo: 'sine', label: 'Entrada' },
    salida: { frecuencia: 440, duracion: 300, tipo: 'sine', label: 'Salida' },
    error: { frecuencia: 220, duracion: 500, tipo: 'sawtooth', label: 'Error' }
};

function reproducirSonido(tipo) {
    try {
        const config = SONIDOS[tipo];
        if (!config) return;
        
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.frequency.value = config.frecuencia;
        oscillator.type = config.tipo;
        gainNode.gain.value = 0.3;
        
        oscillator.start();
        setTimeout(() => {
            oscillator.stop();
            audioCtx.close();
        }, config.duracion);
        
        console.log(`🔊 Sonido: ${config.label}`);
    } catch (error) {
        console.log('Sonido no disponible:', error);
    }
}

// ============ IMÁGENES ============
function comprimirImagenOptimizada(file, maxWidth = 480, maxHeight = 480, calidad = 0.35) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > height && width > maxWidth) {
                    height = height * (maxWidth / width);
                    width = maxWidth;
                } else if (height > maxHeight) {
                    width = width * (maxHeight / height);
                    height = maxHeight;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                resolve(canvas.toDataURL('image/jpeg', calidad));
            };
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function initLazyLoading() {
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const src = img.dataset.src;
                    if (src) {
                        img.src = src;
                        img.classList.remove('lazy');
                        img.classList.add('loaded');
                        observer.unobserve(img);
                    }
                }
            });
        }, { rootMargin: '100px', threshold: 0.1 });
        
        document.querySelectorAll('img.lazy').forEach(img => observer.observe(img));
        return observer;
    }
    return null;
}

// ============ VIRTUAL SCROLL ============
function renderVirtualScroll(container, items, renderItem, itemHeight = 70) {
    if (!container) return;
    
    const totalHeight = items.length * itemHeight;
    const containerHeight = container.clientHeight || 400;
    const startIndex = Math.floor(container.scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 2;
    
    container.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.style.height = totalHeight + 'px';
    wrapper.style.position = 'relative';
    
    const endIndex = Math.min(startIndex + visibleCount, items.length);
    for (let i = startIndex; i < endIndex; i++) {
        const item = items[i];
        const element = renderItem(item, i);
        element.style.position = 'absolute';
        element.style.top = (i * itemHeight) + 'px';
        element.style.left = '0';
        element.style.right = '0';
        element.style.height = itemHeight + 'px';
        wrapper.appendChild(element);
    }
    
    container.appendChild(wrapper);
    
    let timeout;
    container.addEventListener('scroll', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            renderVirtualScroll(container, items, renderItem, itemHeight);
        }, 50);
    });
}

// ============ OBSERVACIONES ============
async function contarObservacionesPendientes() {
    try {
        const observaciones = await getAllObservaciones();
        const pendientes = observaciones.filter(o => o.estado === 'PENDIENTE');
        return pendientes.length;
    } catch (error) {
        console.error('Error contar obs:', error);
        return 0;
    }
}

// ============ PROCESAR CAMBIO DE DÍA ============
async function procesarCambioDia() {
    try {
        const fechaActual = obtenerFechaActual();
        const fechaProcesamiento = await getConfig('fecha_procesamiento_dia');
        
        if (fechaProcesamiento !== fechaActual) {
            console.log(`🔄 Procesando cambio día: ${fechaProcesamiento} → ${fechaActual}`);
            
            const fichajes = await getAllFichajes();
            const empleadosDentro = new Map();
            
            fichajes.forEach(f => {
                if (f.tipo === 'ENTRADA') {
                    empleadosDentro.set(f.empleado_id, {
                        nombre: f.nombre_empleado,
                        cedula: f.cedula_empleado,
                        fecha: f.fecha,
                        hora: f.hora
                    });
                } else if (f.tipo === 'SALIDA') {
                    empleadosDentro.delete(f.empleado_id);
                }
            });
            
            let observacionesCreadas = 0;
            for (const [empleadoId, data] of empleadosDentro) {
                await addObservacion({
                    empleado_id: empleadoId,
                    nombre_empleado: data.nombre,
                    cedula_empleado: data.cedula,
                    fecha: fechaProcesamiento || data.fecha,
                    motivo: 'No registró salida',
                    estado: 'PENDIENTE',
                    hora_entrada: data.hora,
                    fecha_creacion: fechaActual
                });
                observacionesCreadas++;
                
                await addFichaje({
                    empleado_id: empleadoId,
                    nombre_empleado: data.nombre,
                    cedula_empleado: data.cedula,
                    fecha: fechaProcesamiento || data.fecha,
                    hora: '23:59:59',
                    tipo: 'SALIDA',
                    estado_salida: 'FORZADA',
                    operador_id: 'sistema',
                    nombre_operador: 'SISTEMA'
                });
            }
            
            await setConfig('fecha_procesamiento_dia', fechaActual);
            await setConfig('ultimo_reinicio_dentro', fechaActual);
            
            if (observacionesCreadas > 0 && currentUser) {
                mostrarNotificacion(`📋 ${observacionesCreadas} personas sin registrar salida`);
            }
        }
    } catch (error) {
        console.error('❌ Error procesarCambioDia:', error);
    }
}

// ============ BACKUP AUTOMÁTICO ============
async function backupAutomatico(force = false) {
    try {
        const personal = await getAllEmpleados();
        if (personal.length === 0) return;
        
        const fecha = obtenerFechaActual();
        const ultimoBackup = await getConfig('ultimo_backup');
        
        if (!force && ultimoBackup === fecha) return;
        
        const fichajes = await getAllFichajes();
        const operadores = await getAllOperadores();
        const auditoria = await getAllAuditoria();
        const observaciones = await getAllObservaciones();
        
        const respaldo = {
            version: '1.0',
            fecha_exportacion: obtenerFechaHoraActual(),
            total_registros: {
                personal: personal.length,
                fichajes: fichajes.length,
                operadores: operadores.length,
                auditoria: auditoria.length,
                observaciones: observaciones.length
            },
            personal, fichajes, operadores, auditoria, observaciones,
            tipo: force ? 'backup_forzado' : 'backup_automatico'
        };
        
        await setConfig('backup_automatico', JSON.stringify(respaldo));
        await setConfig('ultimo_backup', fecha);
        await setConfig('ultimo_backup_hora', obtenerHoraActual());
        
        const tamañoKB = Math.round(JSON.stringify(respaldo).length / 1024);
        
        if (currentUser) {
            mostrarNotificacion(`💾 Backup ${force ? 'forzado' : 'auto'}: ${tamañoKB} KB`);
        }
    } catch (error) {
        console.error('❌ Error backup:', error);
    }
}

function iniciarBackupsAutomaticos() {
    setTimeout(() => backupAutomatico(true), 3000);
    setInterval(() => backupAutomatico(false), 12 * 60 * 60 * 1000);
    window.addEventListener('beforeunload', () => backupAutomatico(true));
    console.log('🔄 Backup automático activado');
}

// ============ EXPORTAR EXCEL ============
function exportarExcel(datos, nombreArchivo, tipo = 'xlsx') {
    try {
        if (typeof XLSX === 'undefined') {
            alert('❌ Librería XLSX no cargada');
            return;
        }
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(datos);
        XLSX.utils.book_append_sheet(wb, ws, 'Datos');
        
        if (tipo === 'xlsx') {
            XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
        } else {
            XLSX.writeFile(wb, `${nombreArchivo}.csv`, { bookType: 'csv' });
        }
    } catch (error) {
        console.error('❌ Error Excel:', error);
        alert('Error al exportar.');
    }
}

// ============ EXPORTAR PERSONAL ============
async function exportarPersonalConFotos() {
    try {
        const personal = await getAllEmpleados();
        if (personal.length === 0) {
            alert('No hay personal para exportar');
            return;
        }
        
        const datosExcel = personal.map(p => ({
            'ID': p.id,
            'Nombre': p.nombre,
            'Cédula': p.cedula,
            'RFID': p.rfid || 'Sin asignar',
            'ID Interno': p.id_interno || '',
            'Fecha Registro': p.fecha_creacion || '',
            'Tiene Foto': p.foto ? 'Sí' : 'No'
        }));
        
        exportarExcel(datosExcel, `personal_${obtenerFechaActual()}`, 'xlsx');
        
        await addAuditoria({
            operador_id: currentUser.id,
            nombre_operador: currentUser.nombre,
            rol: currentUser.rol,
            fecha: obtenerFechaActual(),
            hora: obtenerHoraActual(),
            accion: 'Exportar personal',
            detalle: `Exportó ${personal.length} personas`
        });
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// ============ CARPETA ============
async function configurarCarpeta() {
    try {
        if (ES_MOVIL) {
            alert('ℹ️ En móvil, las fotos se guardan en IndexedDB');
            await setConfig('carpeta_fotos', 'INDEXEDDB_MOBILE');
            await setConfig('carpeta_handle', JSON.stringify({
                name: 'INDEXEDDB_MOBILE',
                type: 'mobile'
            }));
            return;
        }
        
        if ('showDirectoryPicker' in window) {
            try {
                const dirHandle = await window.showDirectoryPicker();
                carpetaHandle = dirHandle;
                await setConfig('carpeta_handle', JSON.stringify({
                    name: dirHandle.name,
                    id: dirHandle.id || Date.now().toString()
                }));
                await setConfig('carpeta_fotos', dirHandle.name);
                alert(`✅ Carpeta: ${dirHandle.name}`);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Error carpeta:', err);
                }
            }
        } else {
            const carpetaActual = await getConfig('carpeta_fotos') || 'fotos_personal';
            const nuevaCarpeta = prompt('Nombre de carpeta:', carpetaActual);
            if (nuevaCarpeta && nuevaCarpeta.trim()) {
                await setConfig('carpeta_fotos', nuevaCarpeta.trim());
                alert('✅ Carpeta configurada');
            }
        }
    } catch (error) {
        console.error('Error carpeta:', error);
    }
}

async function cargarCarpetaGuardada() {
    try {
        const carpetaGuardada = await getConfig('carpeta_handle');
        if (carpetaGuardada) {
            const data = JSON.parse(carpetaGuardada);
            if (data.type === 'mobile') {
                console.log('📱 Modo móvil activo');
                return true;
            }
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
}

async function eliminarFotoAntigua(idInterno) {
    if (!idInterno) return false;
    try {
        if (ES_MOVIL) return true;
        if (carpetaHandle) {
            try {
                await carpetaHandle.removeEntry(`${idInterno}.jpg`);
                return true;
            } catch (err) {
                if (err.name === 'NotFoundError') return true;
                return false;
            }
        }
        return false;
    } catch (error) {
        return false;
    }
}

async function guardarFotoComoArchivo(fotoBase64, idInterno) {
    try {
        if (ES_MOVIL) return true;
        
        if (!carpetaHandle) {
            const carpetaGuardada = await getConfig('carpeta_handle');
            if (carpetaGuardada) {
                const data = JSON.parse(carpetaGuardada);
                if (data.type === 'mobile') return true;
                if ('showDirectoryPicker' in window) {
                    try {
                        carpetaHandle = await window.showDirectoryPicker();
                        await setConfig('carpeta_handle', JSON.stringify({
                            name: carpetaHandle.name,
                            id: carpetaHandle.id || Date.now().toString()
                        }));
                    } catch (err) {
                        if (err.name !== 'AbortError') console.error(err);
                        return false;
                    }
                } else {
                    const link = document.createElement('a');
                    link.href = fotoBase64;
                    link.download = `${idInterno}.jpg`;
                    link.click();
                    return true;
                }
            } else {
                return true;
            }
        }

        const response = await fetch(fotoBase64);
        const blob = await response.blob();
        
        if (carpetaHandle) {
            try {
                const fileHandle = await carpetaHandle.getFileHandle(`${idInterno}.jpg`, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                return true;
            } catch (err) {
                return false;
            }
        }
        return true;
    } catch (error) {
        return false;
    }
}

// ============ CÁMARA ============
function abrirCamara() {
    if (ES_MOVIL) {
        abrirCamaraMovil('preview-foto', (foto) => { fotoCapturada = foto; });
    } else {
        abrirCamaraPC();
    }
}

function abrirCamaraMovil(previewId, callback) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const foto = await comprimirImagenOptimizada(file, 
                CONFIG_FOTOS.anchoMaximo, CONFIG_FOTOS.altoMaximo, CONFIG_FOTOS.calidad);
            callback(foto);
            
            const preview = document.getElementById(previewId);
            if (preview) {
                preview.innerHTML = `
                    <img src="${foto}" style="max-width: 200px; max-height: 200px; border-radius: 8px; border: 2px solid #b8b39a;">
                    <button onclick="document.getElementById('${previewId}').innerHTML = ''; ${previewId === 'preview-foto' ? 'fotoCapturada = null' : previewId === 'preview-foto-edit' ? 'fotoEditCapturada = null' : 'fotoControlCapturada = null'};" style="display: block; margin: 10px auto; background: #a83232; color: white; border: none; padding: 8px 15px; border-radius: 8px; cursor: pointer;">🗑️ Eliminar foto</button>
                `;
            }
        } catch (error) {
            console.error('Error foto:', error);
            alert('Error al capturar foto');
        }
    };
    input.click();
}

function abrirCamaraPC() {
    const modal = document.createElement('div');
    modal.id = 'modal-camara';
    modal.innerHTML = `
        <div style="position: absolute; top: 20px; left: 20px; display: flex; gap: 15px; z-index: 1001;">
            <button onclick="cerrarCamaraPC()" style="background: rgba(168,50,50,0.9); border: none; color: white; padding: 15px 25px; border-radius: 8px; font-size: 18px; cursor: pointer; font-weight: 600;">❌ Cancelar</button>
            <button onclick="capturarFotoPC()" style="background: rgba(77,124,58,0.9); border: none; color: white; padding: 15px 25px; border-radius: 8px; font-size: 18px; cursor: pointer; font-weight: 600;">📸 Capturar</button>
        </div>
        <video id="video-camara" autoplay playsinline style="max-width: 100%; max-height: 100%; object-fit: contain;"></video>
        <canvas id="canvas-camara" style="display: none;"></canvas>
    `;
    document.body.appendChild(modal);
    
    navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
    })
    .then(s => {
        stream = s;
        document.getElementById('video-camara').srcObject = s;
    })
    .catch(err => {
        alert('Error cámara: ' + err.message);
        cerrarCamaraPC();
    });
}

function capturarFotoPC() {
    const video = document.getElementById('video-camara');
    const canvas = document.getElementById('canvas-camara');
    const context = canvas.getContext('2d');
    
    canvas.width = CONFIG_FOTOS.anchoMaximo;
    canvas.height = CONFIG_FOTOS.altoMaximo;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    fotoCapturada = canvas.toDataURL(CONFIG_FOTOS.formato, CONFIG_FOTOS.calidad);
    
    const preview = document.getElementById('preview-foto');
    if (preview) {
        preview.innerHTML = `
            <img src="${fotoCapturada}" style="max-width: 200px; max-height: 200px; border-radius: 8px; border: 2px solid #b8b39a;">
            <button onclick="fotoCapturada = null; document.getElementById('preview-foto').innerHTML = '';" style="display: block; margin: 10px auto; background: #a83232; color: white; border: none; padding: 8px 15px; border-radius: 8px; cursor: pointer;">🗑️ Eliminar foto</button>
        `;
    }
    cerrarCamaraPC();
}

function cerrarCamaraPC() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    const modal = document.getElementById('modal-camara');
    if (modal) modal.remove();
}

// ============ CÁMARA EDITAR ============
function abrirCamaraEdit() {
    if (ES_MOVIL) {
        abrirCamaraMovil('preview-foto-edit', (foto) => { fotoEditCapturada = foto; });
    } else {
        abrirCamaraEditPC();
    }
}

function abrirCamaraEditPC() {
    const modal = document.createElement('div');
    modal.id = 'modal-camara-edit';
    modal.innerHTML = `
        <div style="position: absolute; top: 20px; left: 20px; display: flex; gap: 15px; z-index: 1001;">
            <button onclick="cerrarCamaraEditPC()" style="background: rgba(168,50,50,0.9); border: none; color: white; padding: 15px 25px; border-radius: 8px; font-size: 18px; cursor: pointer; font-weight: 600;">❌ Cancelar</button>
            <button onclick="capturarFotoEditPC()" style="background: rgba(77,124,58,0.9); border: none; color: white; padding: 15px 25px; border-radius: 8px; font-size: 18px; cursor: pointer; font-weight: 600;">📸 Capturar</button>
        </div>
        <video id="video-camara-edit" autoplay playsinline style="max-width: 100%; max-height: 100%; object-fit: contain;"></video>
        <canvas id="canvas-camara-edit" style="display: none;"></canvas>
    `;
    document.body.appendChild(modal);
    
    navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
    })
    .then(s => {
        stream = s;
        document.getElementById('video-camara-edit').srcObject = s;
    })
    .catch(err => {
        alert('Error cámara: ' + err.message);
        cerrarCamaraEditPC();
    });
}

function capturarFotoEditPC() {
    const video = document.getElementById('video-camara-edit');
    const canvas = document.getElementById('canvas-camara-edit');
    const context = canvas.getContext('2d');
    
    canvas.width = CONFIG_FOTOS.anchoMaximo;
    canvas.height = CONFIG_FOTOS.altoMaximo;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    fotoEditCapturada = canvas.toDataURL(CONFIG_FOTOS.formato, CONFIG_FOTOS.calidad);
    
    const preview = document.getElementById('preview-foto-edit');
    if (preview) {
        preview.innerHTML = `
            <img src="${fotoEditCapturada}" style="max-width: 200px; max-height: 200px; border-radius: 8px; border: 2px solid #b8b39a;">
            <button onclick="fotoEditCapturada = null; document.getElementById('preview-foto-edit').innerHTML = '';" style="display: block; margin: 10px auto; background: #a83232; color: white; border: none; padding: 8px 15px; border-radius: 8px; cursor: pointer;">🗑️ Eliminar foto</button>
        `;
    }
    cerrarCamaraEditPC();
}

function cerrarCamaraEditPC() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    const modal = document.getElementById('modal-camara-edit');
    if (modal) modal.remove();
}

// ============ CÁMARA CONTROL ============
function abrirCamaraControl() {
    if (ES_MOVIL) {
        abrirCamaraMovil('preview-foto-control', (foto) => { fotoControlCapturada = foto; });
    } else {
        abrirCamaraControlPC();
    }
}

function abrirCamaraControlPC() {
    const modal = document.createElement('div');
    modal.id = 'modal-camara-control';
    modal.innerHTML = `
        <div style="position: absolute; top: 20px; left: 20px; display: flex; gap: 15px; z-index: 1001;">
            <button onclick="cerrarCamaraControl()" style="background: rgba(168,50,50,0.9); border: none; color: white; padding: 15px 25px; border-radius: 8px; font-size: 18px; cursor: pointer; font-weight: 600;">❌ Cancelar</button>
            <button onclick="capturarFotoControl()" style="background: rgba(77,124,58,0.9); border: none; color: white; padding: 15px 25px; border-radius: 8px; font-size: 18px; cursor: pointer; font-weight: 600;">📸 Capturar</button>
        </div>
        <video id="video-camara-control" autoplay playsinline style="max-width: 100%; max-height: 100%; object-fit: contain;"></video>
        <canvas id="canvas-camara-control" style="display: none;"></canvas>
    `;
    document.body.appendChild(modal);
    
    navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
    })
    .then(s => {
        stream = s;
        document.getElementById('video-camara-control').srcObject = s;
    })
    .catch(err => {
        alert('Error cámara: ' + err.message);
        cerrarCamaraControl();
    });
}

function capturarFotoControl() {
    const video = document.getElementById('video-camara-control');
    const canvas = document.getElementById('canvas-camara-control');
    const context = canvas.getContext('2d');
    
    canvas.width = CONFIG_FOTOS.anchoMaximo;
    canvas.height = CONFIG_FOTOS.altoMaximo;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    fotoControlCapturada = canvas.toDataURL(CONFIG_FOTOS.formato, CONFIG_FOTOS.calidad);
    
    const preview = document.getElementById('preview-foto-control');
    if (preview) {
        preview.innerHTML = `
            <img src="${fotoControlCapturada}" style="max-width: 200px; max-height: 200px; border-radius: 8px; border: 2px solid #b8b39a;">
            <button onclick="fotoControlCapturada = null; document.getElementById('preview-foto-control').innerHTML = '';" style="display: block; margin: 10px auto; background: #a83232; color: white; border: none; padding: 8px 15px; border-radius: 8px; cursor: pointer;">🗑️ Eliminar foto</button>
        `;
    }
    cerrarCamaraControl();
}

function cerrarCamaraControl() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    const modal = document.getElementById('modal-camara-control');
    if (modal) modal.remove();
}

// ============ NOTIFICACIONES ============
function mostrarNotificacion(mensaje, tipo = 'success') {
    const colores = {
        success: '#4d7c3a',
        warning: '#c9922e',
        error: '#a83232',
        info: '#2a6a8a'
    };
    
    const iconos = {
        success: '✅',
        warning: '⚠️',
        error: '❌',
        info: 'ℹ️'
    };
    
    const notificacion = document.createElement('div');
    notificacion.className = 'notification';
    notificacion.style.background = colores[tipo] || colores.success;
    notificacion.innerHTML = `${iconos[tipo] || 'ℹ️'} ${mensaje}`;
    document.body.appendChild(notificacion);
    
    setTimeout(() => {
        notificacion.style.opacity = '0';
        notificacion.style.transition = 'opacity 0.5s';
        setTimeout(() => notificacion.remove(), 500);
    }, 2000);
}

// ============ INICIALIZACIÓN ============
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🚀 Iniciando aplicación...');
        console.log(ES_MOVIL ? '📱 Modo móvil' : '💻 Modo PC');
        
        await initDB();
        console.log('✅ DB lista');
        
        await cargarCarpetaGuardada();
        await inicializarAdmin();
        await procesarCambioDia();
        
        initRFID(async (codigo) => {
            if (pantallaActual === 'control') {
                await manejarRFID(codigo);
            }
        });
        
        document.getElementById('btn-login').addEventListener('click', manejarLogin);
        document.getElementById('btn-logout').addEventListener('click', manejarLogout);
        
        setInterval(actualizarReloj, 1000);
        actualizarReloj();
        
        iniciarBackupsAutomaticos();
        initBackButtonHandler();
        
        mostrarPantalla('login');
        console.log('✅ Aplicación lista');
    } catch (error) {
        console.error('❌ Error init:', error);
        alert('Error al iniciar. Revisa consola.');
    }
});

// ============ PANTALLAS ============
function mostrarPantalla(pantalla) {
    pantallaActual = pantalla;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    
    if (pantalla === 'login') {
        document.getElementById('login-screen').classList.add('active');
    } else if (pantalla === 'main') {
        document.getElementById('main-screen').classList.add('active');
        actualizarInfoUsuario();
        renderizarDashboard().catch(err => {
            console.error('❌ Dashboard error:', err);
            document.getElementById('main-content').innerHTML = 
                '<div style="padding:20px;color:red;">Error al cargar dashboard</div>';
        });
    }
}

function actualizarInfoUsuario() {
    if (currentUser) {
        document.getElementById('current-user-name').textContent = currentUser.nombre;
        document.getElementById('current-user-role').textContent = currentUser.rol === 'admin' ? '🔐 Administrador' : '🔑 Operador';
    }
}

// ============ LOGIN ============
async function manejarLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        alert('Ingrese usuario y contraseña');
        return;
    }
    
    try {
        await login(username, password);
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        mostrarPantalla('main');
    } catch (error) {
        alert('❌ ' + error.message);
    }
}

async function manejarLogout() {
    await backupAutomatico(true);
    await logout();
    mostrarPantalla('login');
}

// ============ RELOJ ============
function actualizarReloj() {
    const fecha = obtenerFechaActual();
    const hora = obtenerHoraActual();
    
    const fechaFormateada = fecha ? fecha.split('-').reverse().join('/') : '--/--/----';
    const horaFormateada = hora || '--:--:--';
    
    const ld = document.getElementById('login-date');
    const lt = document.getElementById('login-time');
    const md = document.getElementById('main-date');
    const mt = document.getElementById('main-time');
    
    if (ld) ld.textContent = `📅 ${fechaFormateada}`;
    if (lt) lt.textContent = `🕐 ${horaFormateada}`;
    if (md) md.textContent = `📅 ${fechaFormateada}`;
    if (mt) mt.textContent = `🕐 ${horaFormateada}`;
}

// ============ DASHBOARD ============
async function renderizarDashboard() {
    const contenido = document.getElementById('main-content');
    
    try {
        const fichajes = await getAllFichajes();
        const personal = await getAllEmpleados();
        const observaciones = await getAllObservaciones();
        const pendientes = observaciones.filter(o => o.estado === 'PENDIENTE');
        const pendientesCount = pendientes.length;
        
        const fechaActual = obtenerFechaActual();
        const fichajesHoy = fichajes.filter(f => f.fecha === fechaActual);
        const entradasHoy = fichajesHoy.filter(f => f.tipo === 'ENTRADA').length;
        const salidasHoy = fichajesHoy.filter(f => f.tipo === 'SALIDA').length;
        const dentro = calcularEmpleadosDentro(fichajes);
        
        let modulosHTML = '';
        
        if (tienePermiso('control_asistencia')) {
            modulosHTML += `
                <div class="module-card" onclick="mostrarControl()">
                    <div class="icon">⏱️</div>
                    <div class="label">Control</div>
                    ${pendientesCount > 0 ? `<div style="font-size: 11px; color: #a83232; margin-top: 4px; background: #fde8e8; padding: 2px 8px; border-radius: 10px;">⚠️ ${pendientesCount} observados</div>` : ''}
                </div>
            `;
        }
        
        if (tienePermiso('ver_dentro')) {
            modulosHTML += `
                <div class="module-card" onclick="mostrarDentro()">
                    <div class="icon">🟢</div>
                    <div class="label">Dentro</div>
                </div>
            `;
        }
        
        if (tienePermiso('ver_reportes')) {
            modulosHTML += `
                <div class="module-card" onclick="mostrarReportes()">
                    <div class="icon">📊</div>
                    <div class="label">Reportes</div>
                </div>
            `;
        }
        
        if (tienePermiso('ver_personal')) {
            modulosHTML += `
                <div class="module-card" onclick="mostrarPersonal()">
                    <div class="icon">👤</div>
                    <div class="label">Personal</div>
                </div>
            `;
        }
        
        if (tienePermiso('ver_observados')) {
            modulosHTML += `
                <div class="module-card" onclick="mostrarObservados()">
                    <div class="icon">⚠️</div>
                    <div class="label">Observados</div>
                    ${pendientesCount > 0 ? `<div style="font-size: 11px; color: #a83232; margin-top: 4px; background: #fde8e8; padding: 2px 8px; border-radius: 10px;">${pendientesCount} pendientes</div>` : ''}
                </div>
            `;
        }
        
        if (currentUser.rol === 'admin' || tienePermiso('gestionar_operadores')) {
            modulosHTML += `
                <div class="module-card" onclick="mostrarSeguridad()">
                    <div class="icon">🔐</div>
                    <div class="label">Seguridad</div>
                </div>
            `;
        }
        
        if (currentUser.rol === 'admin') {
            modulosHTML += `
                <div class="module-card" onclick="configurarCarpeta()">
                    <div class="icon">📁</div>
                    <div class="label">Carpeta</div>
                </div>
            `;
        }
        
        contenido.innerHTML = `
            <div style="display: flex; justify-content: flex-end; padding: 10px 20px; gap: 10px;">
                <button class="btn-home" onclick="toggleFullscreen()">
                    ${modoFullscreen ? '📱 Modo App' : '🖥️ Pantalla Completa'}
                </button>
            </div>
            
            ${pendientesCount > 0 ? `
                <div class="alert-observados">
                    <span class="icon">⚠️</span>
                    <div>
                        <span class="title">${pendientesCount} personas observadas</span>
                        <span class="subtitle">Informe al administrador</span>
                    </div>
                    <button class="btn-view" onclick="mostrarObservados()">Ver</button>
                </div>
            ` : ''}
            
            <div class="dashboard-grid">
                ${modulosHTML}
            </div>
            
            <div class="dashboard-summary">
                <h3>📊 Resumen del día: ${fechaActual}</h3>
                <div class="summary-grid">
                    <div class="summary-item">
                        <div class="value ent">${entradasHoy}</div>
                        <div class="label">✅ Entradas</div>
                    </div>
                    <div class="summary-item">
                        <div class="value sal">${salidasHoy}</div>
                        <div class="label">❌ Salidas</div>
                    </div>
                    <div class="summary-item">
                        <div class="value dentro">${dentro}</div>
                        <div class="label">🟢 Dentro</div>
                    </div>
                    <div class="summary-item">
                        <div class="value" style="color:#a83232;">${pendientesCount}</div>
                        <div class="label">⚠️ Observados</div>
                    </div>
                    <div class="summary-item">
                        <div class="value">${personal.length}</div>
                        <div class="label">👥 Personal</div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('❌ Error dashboard:', error);
        contenido.innerHTML = `
            <div style="padding:20px;color:red;">
                <h3>Error dashboard</h3>
                <p>${error.message}</p>
                <button onclick="renderizarDashboard()">Reintentar</button>
            </div>
        `;
    }
}

// ============ MÓDULO CONTROL ============
async function mostrarControl() {
    const contenido = document.getElementById('main-content');
    
    const pendientesCount = await contarObservacionesPendientes();
    
    contenido.innerHTML = `
        ${crearEncabezadoModulo('⏱️ Control', 'Registro de entrada/salida')}
        
        ${pendientesCount > 0 ? `
            <div class="alert-observados" style="margin: 0 20px 10px;">
                <span class="icon">⚠️</span>
                <div>
                    <span class="title">${pendientesCount} observados</span>
                    <span class="subtitle">Informe al administrador</span>
                </div>
                <button class="btn-view" onclick="mostrarObservados()">Ver</button>
            </div>
        ` : ''}
        
        <div style="padding: 0 20px;">
            <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
                <button class="btn-success" onclick="nuevoPersonalDesdeControl()" style="width: auto; padding: 14px 25px; font-size: 18px;">
                    ➕ Nuevo
                </button>
            </div>
            <div class="search-bar" style="margin: 0;">
                <input type="text" id="busqueda-control" placeholder="Pase tarjeta RFID o busque..." autocomplete="off">
            </div>
            <div id="resultado-busqueda"></div>
            <div class="list-container" id="lista-resultados"></div>
        </div>
    `;
    
    const input = document.getElementById('busqueda-control');
    if (input) input.focus();
    
    if (input) {
        input.addEventListener('input', async (e) => {
            const termino = input.value.trim();
            
            if (termino.length === 0) {
                document.getElementById('lista-resultados').innerHTML = '';
                return;
            }
            
            try {
                const personal = await getAllEmpleados();
                const coincidenciaExacta = personal.find(e => e.rfid === termino);
                
                if (coincidenciaExacta) {
                    await mostrarConfirmacionFichaje(coincidenciaExacta.id);
                    input.value = '';
                    document.getElementById('lista-resultados').innerHTML = '';
                    return;
                }
                
                if (termino.length >= 2) {
                    const filtrados = personal.filter(e => 
                        e.nombre.toLowerCase().includes(termino.toLowerCase()) ||
                        e.cedula.includes(termino)
                    );
                    renderizarResultadosBusqueda(filtrados, termino);
                } else {
                    document.getElementById('lista-resultados').innerHTML = '';
                }
            } catch (error) {
                console.error('❌ Error búsqueda:', error);
            }
        });
        
        input.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                const termino = input.value.trim();
                if (termino.length === 0) return;
                
                try {
                    const personal = await getAllEmpleados();
                    const coincidenciaExacta = personal.find(e => e.rfid === termino);
                    if (coincidenciaExacta) {
                        e.preventDefault();
                        await mostrarConfirmacionFichaje(coincidenciaExacta.id);
                        input.value = '';
                        document.getElementById('lista-resultados').innerHTML = '';
                        return;
                    }
                    
                    const filtrados = personal.filter(e => 
                        e.nombre.toLowerCase().includes(termino.toLowerCase()) ||
                        e.cedula.includes(termino)
                    );
                    
                    if (filtrados.length === 1) {
                        e.preventDefault();
                        await mostrarConfirmacionFichaje(filtrados[0].id);
                        input.value = '';
                        document.getElementById('lista-resultados').innerHTML = '';
                    } else if (filtrados.length > 1) {
                        renderizarResultadosBusqueda(filtrados, termino);
                    } else {
                        document.getElementById('lista-resultados').innerHTML = `
                            <div class="list-item" style="color: #5a6048;">
                                No se encontraron resultados para "${termino}"
                            </div>
                        `;
                    }
                } catch (error) {
                    console.error('❌ Error Enter:', error);
                }
            }
        });
    }
}

function renderizarResultadosBusqueda(personal, termino = '') {
    const lista = document.getElementById('lista-resultados');
    
    if (personal.length === 0) {
        lista.innerHTML = `
            <div class="list-item" style="color: #5a6048;">
                No se encontraron resultados para "${termino}"
            </div>
        `;
        return;
    }
    
    renderVirtualScroll(lista, personal, (item, index) => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.onclick = () => mostrarConfirmacionFichaje(item.id);
        
        const rfidMatch = termino && item.rfid && item.rfid.includes(termino);
        
        div.innerHTML = `
            <div class="avatar">${item.foto ? `<img src="${item.foto}" loading="lazy">` : item.nombre.charAt(0)}</div>
            <div class="info">
                <div class="name">${item.nombre} ${rfidMatch ? '🔍' : ''}</div>
                <div class="detail">
                    CI: ${item.cedula} 
                    ${item.rfid ? `| RFID: ${rfidMatch ? `<span style="background: #fef3c7; padding: 0 4px; border-radius: 3px;">${item.rfid}</span>` : item.rfid}` : '| RFID: Sin asignar'}
                </div>
            </div>
        `;
        return div;
    }, 75);
}

// ============ NUEVO PERSONAL DESDE CONTROL ============
function nuevoPersonalDesdeControl() {
    const contenido = document.getElementById('main-content');
    fotoControlCapturada = null;
    
    contenido.innerHTML = `
        ${crearEncabezadoModulo('➕ Nuevo Personal', 'Complete los datos')}
        <div style="padding: 0 20px 20px;">
            <div style="margin-top: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 700;">Nombre:</label>
                <input type="text" id="emp-nombre-control" style="width: 100%; padding: 12px; border: 2px solid #b8b39a; border-radius: 8px; font-size: 16px; margin-bottom: 15px; background: #f5f2e4;">
                
                <label style="display: block; margin-bottom: 5px; font-weight: 700;">Cédula:</label>
                <input type="text" id="emp-cedula-control" style="width: 100%; padding: 12px; border: 2px solid #b8b39a; border-radius: 8px; font-size: 16px; margin-bottom: 15px; background: #f5f2e4;">
                
                <label style="display: block; margin-bottom: 5px; font-weight: 700;">RFID (opcional):</label>
                <input type="text" id="emp-rfid-control" style="width: 100%; padding: 12px; border: 2px solid #b8b39a; border-radius: 8px; font-size: 16px; margin-bottom: 15px; background: #f5f2e4;" placeholder="Pase la tarjeta RFID">
                
                <label style="display: block; margin-bottom: 5px; font-weight: 700;">Foto:</label>
                <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <button class="btn-primary" onclick="abrirCamaraControl()" style="width: auto; padding: 12px 20px;">📷 Capturar</button>
                </div>
                <div id="preview-foto-control" style="text-align: center; margin-bottom: 20px;"></div>
                
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="btn-success" onclick="guardarNuevoPersonalControl()" style="flex: 1; min-width: 120px;">💾 Guardar</button>
                    <button class="btn-cancel" onclick="mostrarControl()" style="flex: 1; min-width: 120px;">❌ Cancelar</button>
                </div>
            </div>
        </div>
    `;
}

async function guardarNuevoPersonalControl() {
    try {
        const nombre = document.getElementById('emp-nombre-control').value.trim();
        const cedula = document.getElementById('emp-cedula-control').value.trim();
        const rfid = document.getElementById('emp-rfid-control').value.trim();
        
        if (!nombre || !cedula) {
            alert('Nombre y Cédula son obligatorios');
            return;
        }
        
        const personal = await getAllEmpleados();
        if (personal.find(e => e.cedula === cedula)) {
            alert('Ya existe una persona con esta cédula');
            return;
        }
        
        const idInterno = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        
        const empleado = {
            id: `emp-${Date.now()}`,
            nombre, cedula,
            rfid: rfid || null,
            foto: fotoControlCapturada || null,
            id_interno: idInterno,
            fecha_creacion: obtenerFechaActual()
        };
        
        await addEmpleado(empleado);
        
        if (fotoControlCapturada) {
            await guardarFotoComoArchivo(fotoControlCapturada, idInterno);
        }
        
        await addAuditoria({
            operador_id: currentUser.id,
            nombre_operador: currentUser.nombre,
            rol: currentUser.rol,
            fecha: obtenerFechaActual(),
            hora: obtenerHoraActual(),
            accion: 'Crear personal',
            detalle: `Creó personal ${nombre}`
        });
        
        await backupAutomatico(true);
        
        fotoControlCapturada = null;
        mostrarNotificacion(`✅ Personal creado: ${nombre}`);
        mostrarControl();
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Error al guardar.');
    }
}

async function manejarRFID(codigo) {
    try {
        const empleado = await buscarPorRFID(codigo);
        if (empleado) {
            await mostrarConfirmacionFichaje(empleado.id);
        } else {
            reproducirSonido('error');
            alert(`⚠️ Tarjeta RFID ${codigo} no asignada`);
            await addAuditoria({
                operador_id: currentUser.id,
                nombre_operador: currentUser.nombre,
                rol: currentUser.rol,
                fecha: obtenerFechaActual(),
                hora: obtenerHoraActual(),
                accion: 'RFID no registrado',
                detalle: `Intento con tarjeta: ${codigo}`
            }).catch(e => console.warn(e));
        }
    } catch (error) {
        console.error('❌ Error RFID:', error);
    }
}

// ============ CONFIRMACIÓN FICHAJE ============
async function mostrarConfirmacionFichaje(empleadoId) {
    try {
        const empleado = await getEmpleado(empleadoId);
        if (!empleado) {
            alert('Personal no encontrado');
            return;
        }
        
        const fichajes = await getFichajesByEmpleado(empleadoId);
        fichajes.sort((a, b) => b.id - a.id);
        const ultimoFichaje = fichajes[0];
        const estaDentro = ultimoFichaje && ultimoFichaje.tipo === 'ENTRADA';
        
        const modalExistente = document.getElementById('modal-fichaje');
        if (modalExistente) modalExistente.remove();
        
        const modal = document.createElement('div');
        modal.id = 'modal-fichaje';
        modal.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(42,47,34,0.95);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;
        
        modal.innerHTML = `
            <div style="position: absolute; top: 30px; left: 0; right: 0; display: flex; justify-content: space-between; padding: 0 20px; z-index: 10000; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; gap: 15px;">
                    <button onclick="cerrarModalFichaje()" style="background: rgba(168,50,50,0.9); border: none; color: white; padding: 15px 25px; border-radius: 8px; font-size: 18px; cursor: pointer; font-weight: 600; min-height: 50px;">❌ Cancelar</button>
                    ${estaDentro 
                        ? `<button onclick="confirmarFichajeConMotivo('${empleadoId}', 'SALIDA')" style="background: rgba(168,50,50,0.9); border: none; color: white; padding: 15px 25px; border-radius: 8px; font-size: 18px; cursor: pointer; font-weight: 600; min-height: 50px;">🔴 SALIR</button>`
                        : `<button onclick="confirmarFichajeConMotivo('${empleadoId}', 'ENTRADA')" style="background: rgba(77,124,58,0.9); border: none; color: white; padding: 15px 25px; border-radius: 8px; font-size: 18px; cursor: pointer; font-weight: 600; min-height: 50px;">🟢 ENTRAR</button>`
                    }
                </div>
                <div style="display: flex; gap: 10px; align-items: center; background: rgba(0,0,0,0.5); padding: 10px 20px; border-radius: 10px;">
                    <span style="color: white; font-weight: 600;">${estaDentro ? '🟢 DENTRO' : '⚪ FUERA'}</span>
                </div>
            </div>
            
            <div style="display: flex; flex-direction: column; align-items: center; max-width: 800px; width: 100%;">
                <div style="width: 100%; max-width: 500px; aspect-ratio: 1/1; border-radius: 20px; overflow: hidden; background: #4a5c3a; box-shadow: 0 20px 60px rgba(0,0,0,0.6); border: 4px solid #d4c88a;">
                    ${empleado.foto 
                        ? `<img src="${empleado.foto}" style="width: 100%; height: 100%; object-fit: cover;">`
                        : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 120px; background: linear-gradient(135deg, #4a5c3a, #2e3a25); color: #f0ecd8;">${empleado.nombre.charAt(0)}</div>`
                    }
                </div>
                <div style="margin-top: 30px; text-align: center; color: white; width: 100%; max-width: 500px;">
                    <h2 style="font-size: 32px; margin-bottom: 5px;">${empleado.nombre}</h2>
                    <p style="font-size: 18px; opacity: 0.9;">CI: ${empleado.cedula}</p>
                    <p style="font-size: 16px; opacity: 0.7; margin-top: 10px;">
                        ${ultimoFichaje ? `Último: ${ultimoFichaje.fecha} ${ultimoFichaje.hora} - ${ultimoFichaje.tipo}` : 'Sin fichajes'}
                    </p>
                    
                    <div style="margin-top: 20px; text-align: left;">
                        <label style="color: white; font-size: 14px; opacity: 0.9; display: block; margin-bottom: 5px;">📝 Motivo (opcional):</label>
                        <input type="text" id="motivo-fichaje" placeholder="Ingrese motivo..." style="width: 100%; padding: 12px; border-radius: 8px; font-size: 16px; background: rgba(255,255,255,0.95); color: #2a2f22; outline: none; border: 2px solid #d4c88a;">
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        setTimeout(() => {
            const motivoInput = document.getElementById('motivo-fichaje');
            if (motivoInput) motivoInput.focus();
        }, 100);
    } catch (error) {
        console.error('❌ Error confirmación:', error);
        alert('Error al mostrar confirmación.');
    }
}

function cerrarModalFichaje() {
    const modal = document.getElementById('modal-fichaje');
    if (modal) modal.remove();
    
    const input = document.getElementById('busqueda-control');
    if (input) {
        input.value = '';
        const event = new Event('input', { bubbles: true });
        input.dispatchEvent(event);
    }
    const lista = document.getElementById('lista-resultados');
    if (lista) lista.innerHTML = '';
}

async function confirmarFichajeConMotivo(empleadoId, tipo) {
    try {
        const empleado = await getEmpleado(empleadoId);
        const { fecha, hora } = obtenerFechaHoraActual();
        const motivoInput = document.getElementById('motivo-fichaje');
        const motivo = motivoInput ? motivoInput.value.trim() : '';
        
        const fichaje = {
            empleado_id: empleadoId,
            nombre_empleado: empleado.nombre,
            cedula_empleado: empleado.cedula,
            fecha, hora, tipo,
            motivo: motivo || null,
            operador_id: currentUser.id,
            nombre_operador: currentUser.nombre
        };
        
        await addFichaje(fichaje);
        await addAuditoria({
            operador_id: currentUser.id,
            nombre_operador: currentUser.nombre,
            rol: currentUser.rol,
            fecha, hora,
            accion: 'Fichaje',
            detalle: `${tipo} de ${empleado.nombre}${motivo ? ` - ${motivo}` : ''}`
        });
        
        await backupAutomatico(true);
        
        cerrarModalFichaje();
        
        if (tipo === 'ENTRADA') {
            reproducirSonido('entrada');
        } else {
            reproducirSonido('salida');
        }
        
        mostrarNotificacion(`✅ ${tipo}: ${empleado.nombre}`);
        mostrarControl();
    } catch (error) {
        console.error('❌ Error fichaje:', error);
        reproducirSonido('error');
        alert('Error al registrar.');
    }
}

// ============ MÓDULO DENTRO ============
async function mostrarDentro() {
    const contenido = document.getElementById('main-content');
    try {
        const fichajes = await getAllFichajes();
        const dentro = await calcularEmpleadosDentroLista(fichajes);
        
        contenido.innerHTML = `
            ${crearEncabezadoModulo('🟢 Personal Dentro', `Total: ${dentro.length}`)}
            <div style="padding: 0 20px;">
                <div class="search-bar" style="margin: 0 0 15px 0;">
                    <input type="text" id="busqueda-dentro" placeholder="Filtrar..." autocomplete="off">
                </div>
                <div class="list-container" id="lista-dentro">
                    ${dentro.map(e => `
                        <div class="list-item">
                            <div class="avatar">${e.foto ? `<img src="${e.foto}" loading="lazy">` : e.nombre.charAt(0)}</div>
                            <div class="info">
                                <div class="name">${e.nombre}</div>
                                <div class="detail">CI: ${e.cedula} | Entrada: ${e.horaEntrada}</div>
                            </div>
                        </div>
                    `).join('') || '<div class="list-item">No hay personal dentro</div>'}
                </div>
                <div style="margin-top: 15px;">
                    <button class="btn-primary" onclick="mostrarDentro()">🔄 Actualizar</button>
                </div>
            </div>
        `;
        
        const input = document.getElementById('busqueda-dentro');
        if (input) {
            input.addEventListener('input', (e) => {
                const filtro = e.target.value.toLowerCase();
                document.querySelectorAll('#lista-dentro .list-item').forEach(item => {
                    item.style.display = item.textContent.toLowerCase().includes(filtro) ? 'flex' : 'none';
                });
            });
        }
    } catch (error) {
        console.error('❌ Error dentro:', error);
    }
}

// ============ MÓDULO REPORTES ============
async function mostrarReportes() {
    const contenido = document.getElementById('main-content');
    try {
        const personal = await getAllEmpleados();
        
        contenido.innerHTML = `
            ${crearEncabezadoModulo('📊 Reportes', 'Historial de fichajes')}
            <div style="padding: 0 20px;">
                <div class="filters" style="margin: 0 0 15px 0;">
                    <select id="filtro-periodo" onchange="toggleFechasPersonalizadas()">
                        <option value="dia">📅 Día</option>
                        <option value="semana">📅 Semana</option>
                        <option value="mes">📅 Mes</option>
                        <option value="personalizado">📅 Personalizado</option>
                        <option value="todos">📅 Todos</option>
                    </select>
                    <div id="fechas-personalizadas" style="display: none; flex: 2; gap: 10px; flex-wrap: wrap; width: 100%;">
                        <input type="date" id="filtro-fecha-inicio" style="flex: 1; min-width: 120px;">
                        <label style="display: flex; align-items: center;">a</label>
                        <input type="date" id="filtro-fecha-fin" style="flex: 1; min-width: 120px;">
                    </div>
                    <select id="filtro-empleado" style="flex: 1; min-width: 120px;">
                        <option value="todos">Todo el personal</option>
                        ${personal.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('')}
                    </select>
                    <input type="text" id="filtro-busqueda" placeholder="🔍 Buscar..." style="flex: 2; min-width: 200px;">
                    <button class="btn-primary" onclick="aplicarFiltrosReportes()" style="width: auto; padding: 12px 20px;">🔄 Aplicar</button>
                    <button class="btn-primary" onclick="imprimirReporte()" style="width: auto; padding: 12px 20px; background: #7a4a9a;">🖨️ Imprimir</button>
                </div>
                <div id="resultado-reportes" style="overflow-x: auto;"></div>
            </div>
        `;
        
        const hoy = obtenerFechaActual();
        document.getElementById('filtro-fecha-inicio').value = hoy;
        document.getElementById('filtro-fecha-fin').value = hoy;
        
        document.getElementById('filtro-busqueda').addEventListener('input', aplicarFiltrosReportes);
        await aplicarFiltrosReportes();
    } catch (error) {
        console.error('❌ Error reportes:', error);
    }
}

function toggleFechasPersonalizadas() {
    const periodo = document.getElementById('filtro-periodo').value;
    const fechasDiv = document.getElementById('fechas-personalizadas');
    
    if (periodo === 'personalizado') {
        fechasDiv.style.display = 'flex';
        fechasDiv.style.flexWrap = 'wrap';
        fechasDiv.style.width = '100%';
        fechasDiv.style.gap = '10px';
    } else {
        fechasDiv.style.display = 'none';
    }
}

async function aplicarFiltrosReportes() {
    try {
        const periodo = document.getElementById('filtro-periodo').value;
        const empleadoId = document.getElementById('filtro-empleado').value;
        const busqueda = document.getElementById('filtro-busqueda').value.toLowerCase();
        const fechaActual = obtenerFechaActual();
        
        let fichajes = await getAllFichajes();
        fichajes.sort((a, b) => a.id - b.id);
        
        let fechaInicioMostrar = '';
        let fechaFinMostrar = '';
        
        if (periodo === 'dia') {
            fichajes = fichajes.filter(f => f.fecha === fechaActual);
            fechaInicioMostrar = fechaActual;
            fechaFinMostrar = fechaActual;
        } else if (periodo === 'semana') {
            const semana = obtenerSemana(fechaActual);
            fichajes = fichajes.filter(f => f.fecha >= semana.inicio && f.fecha <= semana.fin);
            fechaInicioMostrar = semana.inicio;
            fechaFinMostrar = semana.fin;
        } else if (periodo === 'mes') {
            const mes = fechaActual.substring(0, 7);
            fichajes = fichajes.filter(f => f.fecha.startsWith(mes));
            fechaInicioMostrar = mes + '-01';
            fechaFinMostrar = mes + '-31';
        } else if (periodo === 'personalizado') {
            const fi = document.getElementById('filtro-fecha-inicio').value;
            const ff = document.getElementById('filtro-fecha-fin').value;
            fechaInicioMostrar = fi;
            fechaFinMostrar = ff;
            if (fi && ff) {
                fichajes = fichajes.filter(f => f.fecha >= fi && f.fecha <= ff);
            }
        } else {
            fechaInicioMostrar = 'Todos los registros';
            fechaFinMostrar = 'Todos los registros';
        }
        
        if (empleadoId !== 'todos') {
            fichajes = fichajes.filter(f => f.empleado_id === empleadoId);
        }
        
        if (busqueda) {
            fichajes = fichajes.filter(f => 
                f.nombre_empleado.toLowerCase().includes(busqueda) ||
                f.cedula_empleado.includes(busqueda)
            );
        }
        
        const agrupados = {};
        fichajes.forEach(f => {
            const key = `${f.empleado_id}_${f.fecha}`;
            if (!agrupados[key]) {
                agrupados[key] = {
                    empleado_id: f.empleado_id,
                    nombre_empleado: f.nombre_empleado,
                    cedula_empleado: f.cedula_empleado,
                    fecha: f.fecha,
                    registros: []
                };
            }
            agrupados[key].registros.push({
                hora: f.hora,
                tipo: f.tipo,
                operador: f.nombre_operador,
                motivo: f.motivo || null,
                estado_salida: f.estado_salida || null
            });
        });
        
        const resultado = document.getElementById('resultado-reportes');
        
        if (Object.keys(agrupados).length === 0) {
            resultado.innerHTML = '<div class="list-item">No hay registros</div>';
            return;
        }
        
        let tablaHTML = `
            <div style="overflow-x: auto; margin: 15px 0;">
                <table>
                    <thead>
                        <tr>
                            <th>Personal</th>
                            <th>Cédula</th>
                            <th>Fecha</th>
                            <th>Hora Entrada</th>
                            <th>Motivo Entrada</th>
                            <th>Operador Entrada</th>
                            <th>Hora Salida</th>
                            <th>Motivo Salida</th>
                            <th>Operador Salida</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        const keys = Object.keys(agrupados).sort();
        keys.forEach(key => {
            const item = agrupados[key];
            item.registros.sort((a, b) => a.hora.localeCompare(b.hora));
            
            const entradas = item.registros.filter(r => r.tipo === 'ENTRADA');
            const salidas = item.registros.filter(r => r.tipo === 'SALIDA');
            const maxRows = Math.max(entradas.length, salidas.length);
            
            for (let i = 0; i < maxRows; i++) {
                const entrada = entradas[i] || { hora: '', operador: '', motivo: '' };
                const salida = salidas[i] || { hora: '', operador: '', motivo: '', estado_salida: '' };
                
                const estadoSalida = salida.estado_salida === 'FORZADA' ? 
                    '<span class="estado-forzada">🟡 FORZADA</span>' : '';
                
                tablaHTML += `
                    <tr>
                        ${i === 0 ? `
                            <td rowspan="${maxRows}" style="font-weight: 700;">${item.nombre_empleado}</td>
                            <td rowspan="${maxRows}">${item.cedula_empleado}</td>
                            <td rowspan="${maxRows}">${item.fecha}</td>
                        ` : ''}
                        <td style="color: #3a7a3a;">${entrada.hora || '-'}</td>
                        <td style="font-size: 12px; color: #5a6048;">${entrada.motivo || '-'}</td>
                        <td>${entrada.operador || '-'}</td>
                        <td style="color: #a83232;">${salida.hora || '-'}</td>
                        <td style="font-size: 12px; color: #5a6048;">${salida.motivo || '-'}</td>
                        <td>${salida.operador || '-'}</td>
                        <td>${estadoSalida}</td>
                    </tr>
                `;
            }
        });
        
        tablaHTML += `
                    </tbody>
                </table>
            </div>
            <div style="padding: 0 20px 20px; text-align: center;">
                Mostrando ${Object.keys(agrupados).length} registros
            </div>
            <div style="padding: 0 20px 20px; display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="btn-primary" onclick="exportarReportesExcel()" style="width: auto; padding: 12px 20px;">📊 Excel</button>
                <button class="btn-primary" onclick="exportarReportesCSV()" style="width: auto; padding: 12px 20px;">📄 CSV</button>
            </div>
        `;
        
        resultado.innerHTML = tablaHTML;
        
        // Guardar info de fechas para la impresión
        window._ultimoReporteFechas = { inicio: fechaInicioMostrar, fin: fechaFinMostrar };
        
    } catch (error) {
        console.error('❌ Error filtros:', error);
    }
}

async function exportarReportesExcel() {
    try {
        const fichajes = await getAllFichajes();
        const datos = fichajes.map(f => ({
            Fecha: f.fecha,
            Hora: f.hora,
            Personal: f.nombre_empleado,
            Cedula: f.cedula_empleado,
            Tipo: f.tipo,
            Motivo: f.motivo || '',
            Operador: f.nombre_operador,
            Estado: f.estado_salida || 'NORMAL'
        }));
        exportarExcel(datos, `reporte_${obtenerFechaActual()}`, 'xlsx');
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

async function exportarReportesCSV() {
    try {
        const fichajes = await getAllFichajes();
        const datos = fichajes.map(f => ({
            Fecha: f.fecha,
            Hora: f.hora,
            Personal: f.nombre_empleado,
            Cedula: f.cedula_empleado,
            Tipo: f.tipo,
            Motivo: f.motivo || '',
            Operador: f.nombre_operador,
            Estado: f.estado_salida || 'NORMAL'
        }));
        exportarExcel(datos, `reporte_${obtenerFechaActual()}`, 'csv');
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

function imprimirReporte() {
    const contenido = document.getElementById('resultado-reportes');
    const tablaHTML = contenido.querySelector('table')?.outerHTML || contenido.innerHTML;
    const fechas = window._ultimoReporteFechas || { inicio: '', fin: '' };
    
    imprimirConFirmas(
        tablaHTML, 
        'CONTROL DE INGRESO Y SALIDA DE PERSONAL AJENO',
        fechas.inicio,
        fechas.fin
    );
}

// ============ MÓDULO PERSONAL ============
async function mostrarPersonal() {
    const contenido = document.getElementById('main-content');
    try {
        const personal = await getAllEmpleados();
        const esAdmin = currentUser.rol === 'admin';
        
        contenido.innerHTML = `
            ${crearEncabezadoModulo('👤 Gestión de Personal', `${personal.length} registrados`)}
            <div style="padding: 0 20px;">
                <div class="search-bar" style="margin: 0 0 15px 0;">
                    <input type="text" id="busqueda-personal" placeholder="Buscar..." autocomplete="off">
                </div>
                <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
                    <button class="btn-success" onclick="nuevoPersonal()" style="width: auto; padding: 14px 25px; font-size: 18px;">➕ Nuevo</button>
                    ${tienePermiso('importar_csv') ? `<button class="btn-primary" onclick="importarCSV()" style="width: auto; padding: 12px 20px;">📥 Importar CSV</button>` : ''}
                    ${esAdmin ? `<button class="btn-primary" onclick="exportarPersonalConFotos()" style="width: auto; padding: 12px 20px; background: #7a4a9a;">📊 Excel</button>` : ''}
                </div>
                <div class="list-container" id="lista-personal">
                    ${personal.map(e => `
                        <div class="list-item" onclick="${esAdmin ? `editarPersonal('${e.id}')` : `verPersonal('${e.id}')`}">
                            <div class="avatar">${e.foto ? `<img src="${e.foto}" loading="lazy">` : e.nombre.charAt(0)}</div>
                            <div class="info">
                                <div class="name">${e.nombre}</div>
                                <div class="detail">CI: ${e.cedula} | RFID: ${e.rfid || 'Sin asignar'}</div>
                            </div>
                        </div>
                    `).join('') || '<div class="list-item">No hay personal</div>'}
                </div>
            </div>
        `;
        
        const input = document.getElementById('busqueda-personal');
        if (input) {
            input.addEventListener('input', (e) => {
                const filtro = e.target.value.toLowerCase();
                document.querySelectorAll('#lista-personal .list-item').forEach(item => {
                    item.style.display = item.textContent.toLowerCase().includes(filtro) ? 'flex' : 'none';
                });
            });
        }
    } catch (error) {
        console.error('❌ Error personal:', error);
    }
}

async function verPersonal(empleadoId) {
    try {
        const empleado = await getEmpleado(empleadoId);
        const contenido = document.getElementById('main-content');
        
        contenido.innerHTML = `
            ${crearEncabezadoModulo('👤 Ver Personal', `Datos de ${empleado.nombre}`)}
            <div style="padding: 0 20px 20px;">
                <div style="text-align: center; margin: 20px 0;">
                    <div class="confirm-avatar">
                        ${empleado.foto ? `<img src="${empleado.foto}">` : empleado.nombre.charAt(0)}
                    </div>
                    <h2 style="margin-top: 15px;">${empleado.nombre}</h2>
                    <p style="color: #5a6048;">CI: ${empleado.cedula}</p>
                    <p style="color: #5a6048;">RFID: ${empleado.rfid || 'Sin asignar'}</p>
                    <p style="color: #5a6048; font-size: 14px;">Registrado: ${empleado.fecha_creacion || 'N/A'}</p>
                </div>
                <button class="btn-cancel" onclick="mostrarPersonal()" style="width: 100%;">← Volver</button>
            </div>
        `;
    } catch (error) {
        console.error('❌ Error ver personal:', error);
    }
}

function nuevoPersonal() {
    const contenido = document.getElementById('main-content');
    fotoCapturada = null;
    
    contenido.innerHTML = `
        ${crearEncabezadoModulo('➕ Nuevo Personal', 'Complete los datos')}
        <div style="padding: 0 20px 20px;">
            <div style="margin-top: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 700;">Nombre:</label>
                <input type="text" id="emp-nombre" style="width: 100%; padding: 12px; border: 2px solid #b8b39a; border-radius: 8px; font-size: 16px; margin-bottom: 15px; background: #f5f2e4;">
                
                <label style="display: block; margin-bottom: 5px; font-weight: 700;">Cédula:</label>
                <input type="text" id="emp-cedula" style="width: 100%; padding: 12px; border: 2px solid #b8b39a; border-radius: 8px; font-size: 16px; margin-bottom: 15px; background: #f5f2e4;">
                
                <label style="display: block; margin-bottom: 5px; font-weight: 700;">RFID (opcional):</label>
                <input type="text" id="emp-rfid" style="width: 100%; padding: 12px; border: 2px solid #b8b39a; border-radius: 8px; font-size: 16px; margin-bottom: 15px; background: #f5f2e4;" placeholder="Pase la tarjeta RFID">
                
                <label style="display: block; margin-bottom: 5px; font-weight: 700;">Foto:</label>
                <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <button class="btn-primary" onclick="abrirCamara()" style="width: auto; padding: 12px 20px;">📷 Capturar</button>
                </div>
                <div id="preview-foto" style="text-align: center; margin-bottom: 20px;"></div>
                
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="btn-success" onclick="guardarNuevoPersonal()" style="flex: 1; min-width: 120px;">💾 Guardar</button>
                    <button class="btn-cancel" onclick="mostrarPersonal()" style="flex: 1; min-width: 120px;">❌ Cancelar</button>
                </div>
            </div>
        </div>
    `;
}

async function guardarNuevoPersonal() {
    try {
        const nombre = document.getElementById('emp-nombre').value.trim();
        const cedula = document.getElementById('emp-cedula').value.trim();
        const rfid = document.getElementById('emp-rfid').value.trim();
        
        if (!nombre || !cedula) {
            alert('Nombre y Cédula son obligatorios');
            return;
        }
        
        const personal = await getAllEmpleados();
        if (personal.find(e => e.cedula === cedula)) {
            alert('Ya existe una persona con esta cédula');
            return;
        }
        
        const idInterno = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        
        const empleado = {
            id: `emp-${Date.now()}`,
            nombre, cedula,
            rfid: rfid || null,
            foto: fotoCapturada || null,
            id_interno: idInterno,
            fecha_creacion: obtenerFechaActual()
        };
        
        await addEmpleado(empleado);
        
        if (fotoCapturada) {
            await guardarFotoComoArchivo(fotoCapturada, idInterno);
        }
        
        await addAuditoria({
            operador_id: currentUser.id,
            nombre_operador: currentUser.nombre,
            rol: currentUser.rol,
            fecha: obtenerFechaActual(),
            hora: obtenerHoraActual(),
            accion: 'Crear personal',
            detalle: `Creó ${nombre}`
        });
        
        await backupAutomatico(true);
        
        fotoCapturada = null;
        mostrarNotificacion(`✅ Personal creado: ${nombre}`);
        mostrarPersonal();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

async function editarPersonal(empleadoId) {
    if (currentUser.rol !== 'admin') {
        alert('Solo administradores pueden editar');
        return;
    }
    
    try {
        const empleado = await getEmpleado(empleadoId);
        const contenido = document.getElementById('main-content');
        fotoEditCapturada = null;
        
        contenido.innerHTML = `
            ${crearEncabezadoModulo('✏️ Editar Personal', `Editando: ${empleado.nombre}`)}
            <div style="padding: 0 20px 20px;">
                <div style="text-align: center; margin: 20px 0;">
                    <div class="confirm-avatar">
                        ${empleado.foto ? `<img src="${empleado.foto}">` : empleado.nombre.charAt(0)}
                    </div>
                </div>
                <div style="margin-top: 20px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 700;">Nombre:</label>
                    <input type="text" id="edit-nombre" value="${empleado.nombre}" style="width: 100%; padding: 12px; border: 2px solid #b8b39a; border-radius: 8px; font-size: 16px; margin-bottom: 15px; background: #f5f2e4;">
                    
                    <label style="display: block; margin-bottom: 5px; font-weight: 700;">Cédula:</label>
                    <input type="text" id="edit-cedula" value="${empleado.cedula}" style="width: 100%; padding: 12px; border: 2px solid #b8b39a; border-radius: 8px; font-size: 16px; margin-bottom: 15px; background: #f5f2e4;">
                    
                    <label style="display: block; margin-bottom: 5px; font-weight: 700;">RFID:</label>
                    <input type="text" id="edit-rfid" value="${empleado.rfid || ''}" style="width: 100%; padding: 12px; border: 2px solid #b8b39a; border-radius: 8px; font-size: 16px; margin-bottom: 15px; background: #f5f2e4;" placeholder="Pase RFID">
                    
                    <label style="display: block; margin-bottom: 5px; font-weight: 700;">Foto:</label>
                    <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                        <button class="btn-primary" onclick="abrirCamaraEdit()" style="width: auto; padding: 12px 20px;">📷 Capturar</button>
                    </div>
                    <div id="preview-foto-edit" style="text-align: center; margin-bottom: 20px;">
                        ${empleado.foto ? `<img src="${empleado.foto}" style="max-width: 200px; max-height: 200px; border-radius: 8px; border: 2px solid #b8b39a;">` : ''}
                    </div>
                    
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button class="btn-success" onclick="guardarEdicionPersonal('${empleadoId}')" style="flex: 1; min-width: 100px;">💾 Guardar</button>
                        <button class="btn-danger" onclick="eliminarPersonal('${empleadoId}')" style="flex: 1; min-width: 100px;">🗑️ Eliminar</button>
                        <button class="btn-cancel" onclick="mostrarPersonal()" style="flex: 1; min-width: 100px;">❌ Cancelar</button>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('❌ Error editar:', error);
    }
}

async function guardarEdicionPersonal(empleadoId) {
    try {
        const empleado = await getEmpleado(empleadoId);
        const nombre = document.getElementById('edit-nombre').value.trim();
        const cedula = document.getElementById('edit-cedula').value.trim();
        const rfid = document.getElementById('edit-rfid').value.trim();
        
        if (!nombre || !cedula) {
            alert('Nombre y Cédula son obligatorios');
            return;
        }
        
        const idInternoAntiguo = empleado.id_interno;
        
        empleado.nombre = nombre;
        empleado.cedula = cedula;
        empleado.rfid = rfid || null;
        
        if (fotoEditCapturada) {
            if (idInternoAntiguo) {
                await eliminarFotoAntigua(idInternoAntiguo);
            }
            
            const nuevoIdInterno = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
            empleado.foto = fotoEditCapturada;
            empleado.id_interno = nuevoIdInterno;
            await guardarFotoComoArchivo(fotoEditCapturada, nuevoIdInterno);
            fotoEditCapturada = null;
        }
        
        await updateEmpleado(empleado);
        await addAuditoria({
            operador_id: currentUser.id,
            nombre_operador: currentUser.nombre,
            rol: currentUser.rol,
            fecha: obtenerFechaActual(),
            hora: obtenerHoraActual(),
            accion: 'Editar personal',
            detalle: `Editó ${nombre}`
        });
        
        await backupAutomatico(true);
        
        mostrarNotificacion(`✅ Actualizado: ${nombre}`);
        mostrarPersonal();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

async function eliminarPersonal(empleadoId) {
    if (currentUser.rol !== 'admin') {
        alert('Solo administradores pueden eliminar');
        return;
    }
    
    if (!confirm('¿Eliminar esta persona? No se puede deshacer.')) return;
    
    try {
        const empleado = await getEmpleado(empleadoId);
        
        if (empleado.id_interno) {
            await eliminarFotoAntigua(empleado.id_interno);
        }
        
        await deleteEmpleado(empleadoId);
        await addAuditoria({
            operador_id: currentUser.id,
            nombre_operador: currentUser.nombre,
            rol: currentUser.rol,
            fecha: obtenerFechaActual(),
            hora: obtenerHoraActual(),
            accion: 'Eliminar personal',
            detalle: `Eliminó ${empleado.nombre}`
        });
        
        await backupAutomatico(true);
        
        mostrarNotificacion(`✅ Eliminado: ${empleado.nombre}`);
        mostrarPersonal();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// ============ MÓDULO OBSERVADOS ============
async function mostrarObservados() {
    const contenido = document.getElementById('main-content');
    try {
        const observaciones = await getAllObservaciones();
        const pendientes = observaciones.filter(o => o.estado === 'PENDIENTE');
        const resueltos = observaciones.filter(o => o.estado === 'RESUELTA');
        
        const operadores = await getAllOperadores();
        
        contenido.innerHTML = `
            ${crearEncabezadoModulo('⚠️ Personal Observado', `${pendientes.length} pendientes, ${resueltos.length} resueltos`)}
            <div style="padding: 0 20px;">
                <div class="filters" style="margin: 0 0 15px 0;">
                    <select id="filtro-observados-estado" style="flex: 1; min-width: 100px;">
                        <option value="todos">📋 Todos</option>
                        <option value="PENDIENTE">⚠️ Pendientes</option>
                        <option value="RESUELTA">✅ Resueltos</option>
                    </select>
                    <input type="date" id="filtro-observados-fecha-inicio" style="flex: 1; min-width: 120px;">
                    <label style="display: flex; align-items: center;">a</label>
                    <input type="date" id="filtro-observados-fecha-fin" style="flex: 1; min-width: 120px;">
                    <select id="filtro-observados-operador" style="flex: 1; min-width: 120px;">
                        <option value="todos">👤 Todos</option>
                        ${operadores.map(o => `<option value="${o.nombre}">${o.nombre}</option>`).join('')}
                    </select>
                    <input type="text" id="filtro-observados-busqueda" placeholder="🔍 Buscar..." style="flex: 2; min-width: 150px;">
                    <button class="btn-primary" onclick="aplicarFiltrosObservados()" style="width: auto; padding: 12px 20px;">🔄 Aplicar</button>
                    <button class="btn-cancel" onclick="limpiarFiltrosObservados()" style="width: auto; padding: 12px 20px;">🗑️ Limpiar</button>
                    <button class="btn-primary" onclick="imprimirObservadosConFiltros()" style="width: auto; padding: 12px 20px; background: #7a4a9a;">🖨️ Imprimir</button>
                </div>
                
                <div class="list-container" id="lista-observados">
                    ${observaciones.length === 0 ? '<div class="list-item">No hay observaciones</div>' : ''}
                </div>
            </div>
        `;
        
        const hoy = obtenerFechaActual();
        const hace7Dias = new Date();
        hace7Dias.setDate(hace7Dias.getDate() - 7);
        const fechaInicio = hace7Dias.toISOString().split('T')[0];
        
        document.getElementById('filtro-observados-fecha-inicio').value = fechaInicio;
        document.getElementById('filtro-observados-fecha-fin').value = hoy;
        
        await renderizarListaObservados(observaciones);
        
        document.getElementById('filtro-observados-busqueda').addEventListener('input', aplicarFiltrosObservados);
        document.getElementById('filtro-observados-estado').addEventListener('change', aplicarFiltrosObservados);
        document.getElementById('filtro-observados-fecha-inicio').addEventListener('change', aplicarFiltrosObservados);
        document.getElementById('filtro-observados-fecha-fin').addEventListener('change', aplicarFiltrosObservados);
        document.getElementById('filtro-observados-operador').addEventListener('change', aplicarFiltrosObservados);
    } catch (error) {
        console.error('❌ Error observados:', error);
    }
}

async function renderizarListaObservados(observaciones) {
    const lista = document.getElementById('lista-observados');
    if (!lista) return;
    
    const ordenadas = [...observaciones].sort((a, b) => {
        if (a.estado === 'PENDIENTE' && b.estado !== 'PENDIENTE') return -1;
        if (a.estado !== 'PENDIENTE' && b.estado === 'PENDIENTE') return 1;
        return b.id - a.id;
    });
    
    if (ordenadas.length === 0) {
        lista.innerHTML = '<div class="list-item">No hay observaciones con estos filtros</div>';
        return;
    }
    
    renderVirtualScroll(lista, ordenadas, (item) => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.onclick = () => verObservacion(item.id);
        
        const estadoClass = item.estado === 'PENDIENTE' ? '⚠️' : '✅';
        const estadoColor = item.estado === 'PENDIENTE' ? '#a83232' : '#4d7c3a';
        
        div.innerHTML = `
            <div class="avatar" style="background: ${item.estado === 'PENDIENTE' ? '#a83232' : '#4d7c3a'};">
                ${item.nombre_empleado ? item.nombre_empleado.charAt(0) : '?'}
            </div>
            <div class="info">
                <div class="name">${estadoClass} ${item.nombre_empleado || 'Desconocido'}</div>
                <div class="detail">
                    CI: ${item.cedula_empleado || 'N/A'} | 
                    Fecha: ${item.fecha || 'N/A'} | 
                    <span style="color: ${estadoColor}; font-weight: 700;">${item.estado}</span>
                    ${item.nota_justificacion ? ` | 📝 ${item.nota_justificacion}` : ''}
                    ${item.resuelto_por ? ` | ✅ ${item.resuelto_por}` : ''}
                </div>
            </div>
        `;
        return div;
    }, 75);
}

async function aplicarFiltrosObservados() {
    try {
        const estado = document.getElementById('filtro-observados-estado').value;
        const fechaInicio = document.getElementById('filtro-observados-fecha-inicio').value;
        const fechaFin = document.getElementById('filtro-observados-fecha-fin').value;
        const operador = document.getElementById('filtro-observados-operador').value.toLowerCase();
        const busqueda = document.getElementById('filtro-observados-busqueda').value.toLowerCase();
        
        let observaciones = await getAllObservaciones();
        
        if (estado !== 'todos') observaciones = observaciones.filter(o => o.estado === estado);
        if (fechaInicio) observaciones = observaciones.filter(o => o.fecha >= fechaInicio);
        if (fechaFin) observaciones = observaciones.filter(o => o.fecha <= fechaFin);
        if (operador !== 'todos') {
            observaciones = observaciones.filter(o => 
                o.resuelto_por && o.resuelto_por.toLowerCase().includes(operador)
            );
        }
        if (busqueda) {
            observaciones = observaciones.filter(o => 
                (o.nombre_empleado && o.nombre_empleado.toLowerCase().includes(busqueda)) ||
                (o.cedula_empleado && o.cedula_empleado.includes(busqueda))
            );
        }
        
        await renderizarListaObservados(observaciones);
    } catch (error) {
        console.error('❌ Error filtros obs:', error);
    }
}

function limpiarFiltrosObservados() {
    document.getElementById('filtro-observados-estado').value = 'todos';
    document.getElementById('filtro-observados-fecha-inicio').value = '';
    document.getElementById('filtro-observados-fecha-fin').value = '';
    document.getElementById('filtro-observados-operador').value = 'todos';
    document.getElementById('filtro-observados-busqueda').value = '';
    aplicarFiltrosObservados();
}

async function imprimirObservadosConFiltros() {
    try {
        const items = document.querySelectorAll('#lista-observados .list-item');
        const itemsVisibles = [];
        
        items.forEach(item => {
            if (item.style.display !== 'none' && !item.textContent.includes('No hay observaciones')) {
                const nombre = item.querySelector('.name')?.textContent || '';
                const detalle = item.querySelector('.detail')?.textContent || '';
                itemsVisibles.push({ nombre, detalle });
            }
        });
        
        if (itemsVisibles.length === 0) {
            alert('No hay registros para imprimir');
            return;
        }
        
        let tablaHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Estado</th>
                        <th>Personal</th>
                        <th>Detalle</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        itemsVisibles.forEach(item => {
            const nombreCompleto = item.nombre || '';
            const detalle = item.detalle || '';
            const estado = nombreCompleto.includes('⚠️') ? 'PENDIENTE' : 'RESUELTA';
            const nombreLimpio = nombreCompleto.replace('⚠️', '').replace('✅', '').trim();
            
            tablaHTML += `
                <tr>
                    <td><span style="color: ${estado === 'PENDIENTE' ? '#a83232' : '#4d7c3a'}; font-weight: 700;">${estado}</span></td>
                    <td>${nombreLimpio}</td>
                    <td>${detalle}</td>
                </tr>
            `;
        });
        
        tablaHTML += `</tbody></table>`;
        
        imprimirConFirmas(tablaHTML, 'REPORTE DE PERSONAL OBSERVADO');
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

async function verObservacion(observacionId) {
    try {
        const observaciones = await getAllObservaciones();
        const observacion = observaciones.find(o => o.id === observacionId);
        const contenido = document.getElementById('main-content');
        const esAdmin = currentUser.rol === 'admin';
        
        contenido.innerHTML = `
            ${crearEncabezadoModulo('⚠️ Detalle Observación', `De ${observacion.nombre_empleado}`)}
            <div style="padding: 0 20px 20px;">
                <div class="confirm-container" style="margin: 20px 0;">
                    <div class="confirm-name">${observacion.nombre_empleado || 'Desconocido'}</div>
                    <div class="confirm-detail">CI: ${observacion.cedula_empleado || 'N/A'}</div>
                    <div class="confirm-status">
                        <div class="status-icon">${observacion.estado === 'PENDIENTE' ? '⚠️' : '✅'}</div>
                        <div class="status-text" style="color: ${observacion.estado === 'PENDIENTE' ? '#a83232' : '#4d7c3a'};">${observacion.estado}</div>
                        <div class="confirm-detail">Fecha: ${observacion.fecha || 'N/A'}</div>
                        ${observacion.hora_entrada ? `<div class="confirm-detail">Hora entrada: ${observacion.hora_entrada}</div>` : ''}
                        ${observacion.nota_justificacion ? `<div class="confirm-detail">📝 ${observacion.nota_justificacion}</div>` : ''}
                        ${observacion.resuelto_por ? `<div class="confirm-detail">Resuelto por: ${observacion.resuelto_por}</div>` : ''}
                    </div>
                    
                    ${observacion.estado === 'PENDIENTE' && esAdmin ? `
                        <div style="margin-top: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 700;">📝 Nota (obligatoria):</label>
                            <textarea id="nota-justificacion" rows="3" style="width: 100%; padding: 12px; border: 2px solid #b8b39a; border-radius: 8px; font-size: 16px; margin-bottom: 15px; background: #f5f2e4;" placeholder="Motivo..."></textarea>
                            <button class="btn-success" onclick="resolverObservacionConNota(${observacion.id})" style="width: 100%;">✔️ RESUELTA</button>
                        </div>
                    ` : ''}
                    
                    ${observacion.estado === 'RESUELTA' ? `
                        <div style="margin-top: 15px; padding: 15px; background: #d8e8d0; border-radius: 8px;">
                            <span style="color: #3a5e2c;">✅ Ya resuelta</span>
                        </div>
                    ` : ''}
                    
                    <button class="btn-cancel" onclick="mostrarObservados()" style="margin-top: 10px;">← Volver</button>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

async function resolverObservacionConNota(observacionId) {
    const nota = document.getElementById('nota-justificacion').value.trim();
    
    if (!nota) {
        alert('⚠️ La nota es obligatoria');
        document.getElementById('nota-justificacion').focus();
        return;
    }
    
    if (!confirm('¿Marcar como resuelta?')) return;
    
    try {
        const observaciones = await getAllObservaciones();
        const observacion = observaciones.find(o => o.id === observacionId);
        
        observacion.estado = 'RESUELTA';
        observacion.nota_justificacion = nota;
        observacion.fecha_resolucion = obtenerFechaHoraActual();
        observacion.resuelto_por = currentUser.nombre;
        
        await updateObservacion(observacion);
        
        await addAuditoria({
            operador_id: currentUser.id,
            nombre_operador: currentUser.nombre,
            rol: currentUser.rol,
            fecha: obtenerFechaActual(),
            hora: obtenerHoraActual(),
            accion: 'Resolver observación',
            detalle: `Resolvió obs de ${observacion.nombre_empleado}: ${nota}`
        });
        
        await backupAutomatico(true);
        
        mostrarNotificacion('✅ Observación resuelta');
        mostrarObservados();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// ============ MÓDULO SEGURIDAD ============
async function mostrarSeguridad() {
    if (currentUser.rol !== 'admin' && !tienePermiso('gestionar_operadores')) {
        alert('Sin permisos');
        return;
    }
    
    const contenido = document.getElementById('main-content');
    try {
        const operadores = await getAllOperadores();
        const auditoria = await getAllAuditoria();
        
        contenido.innerHTML = `
            ${crearEncabezadoModulo('🔐 Seguridad', 'Operadores y auditoría')}
            <div style="padding: 0 20px;">
                <div style="margin-bottom: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="btn-primary" onclick="nuevoOperador()" style="width: auto; padding: 12px 20px;">➕ Nuevo Operador</button>
                    <button class="btn-danger" onclick="solicitarReinicio()" style="width: auto; padding: 12px 20px;">🔄 Reiniciar</button>
                    <button class="btn-primary" onclick="exportarAuditoriaExcel()" style="width: auto; padding: 12px 20px; background: #7a4a9a;">📊 Excel</button>
                    <button class="btn-primary" onclick="exportarAuditoriaCSV()" style="width: auto; padding: 12px 20px; background: #7a4a9a;">📄 CSV</button>
                    <button class="btn-primary" onclick="imprimirAuditoriaConFiltros()" style="width: auto; padding: 12px 20px; background: #7a4a9a;">🖨️ Imprimir</button>
                    ${currentUser.rol === 'admin' ? `<button class="btn-primary" onclick="exportarPersonalConFotos()" style="width: auto; padding: 12px 20px; background: #7a4a9a;">📊 Personal Excel</button>` : ''}
                </div>
                
                <h3 style="margin-bottom: 10px; color: #3a4a2e;">👥 Operadores</h3>
                <div style="overflow-x: auto; margin-bottom: 20px;">
                    <table>
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Usuario</th>
                                <th>Rol</th>
                                <th>Estado</th>
                                <th style="text-align: center;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${operadores.map(o => `
                                <tr>
                                    <td>${o.nombre}</td>
                                    <td>${o.username}</td>
                                    <td>${o.rol === 'admin' ? '⭐ Admin' : '🔑 Operador'}</td>
                                    <td>${o.activo ? '🟢 Activo' : '🔴 Inactivo'}</td>
                                    <td style="text-align: center;">
                                        ${o.username !== 'admin' ? `
                                            <button onclick="editarOperador('${o.id}')" class="btn-action btn-action-edit" title="Editar">✏️</button>
                                            <button onclick="eliminarOperador('${o.id}')" class="btn-action btn-action-delete" title="Eliminar">🗑️</button>
                                            <button onclick="cambiarRol('${o.id}')" class="btn-action btn-action-role" title="Cambiar Rol">🔄</button>
                                        ` : '⚠️ Admin protegido'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <h3 style="margin-bottom: 10px; color: #3a4a2e;">💾 Respaldo</h3>
                <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px;">
                    <button class="btn-primary" onclick="exportarRespaldo()" style="width: auto; padding: 12px 20px;">📥 Exportar Respaldo</button>
                    <button class="btn-primary" onclick="importarRespaldo()" style="width: auto; padding: 12px 20px;">📤 Importar Respaldo</button>
                    <button class="btn-primary" onclick="backupAutomatico(true)" style="width: auto; padding: 12px 20px;">💾 Backup Ahora</button>
                </div>
                
                <h3 style="margin-bottom: 10px; color: #3a4a2e;">📋 Auditoría</h3>
                <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
                    <input type="date" id="filtro-auditoria-fecha-inicio" style="flex: 1; min-width: 120px; padding: 10px; border: 2px solid #b8b39a; border-radius: 8px; background: #f5f2e4;">
                    <input type="date" id="filtro-auditoria-fecha-fin" style="flex: 1; min-width: 120px; padding: 10px; border: 2px solid #b8b39a; border-radius: 8px; background: #f5f2e4;">
                    <select id="filtro-auditoria-operador" style="flex: 1; min-width: 120px; padding: 10px; border: 2px solid #b8b39a; border-radius: 8px; background: #f5f2e4;">
                        <option value="todos">Todos</option>
                        ${operadores.map(o => `<option value="${o.nombre}">${o.nombre}</option>`).join('')}
                    </select>
                    <select id="filtro-auditoria-accion" style="flex: 1; min-width: 120px; padding: 10px; border: 2px solid #b8b39a; border-radius: 8px; background: #f5f2e4;">
                        <option value="todos">Todas</option>
                        <option value="Inicio de sesión">Inicio sesión</option>
                        <option value="Cierre de sesión">Cierre sesión</option>
                        <option value="Fichaje">Fichaje</option>
                        <option value="Crear personal">Crear personal</option>
                        <option value="Editar personal">Editar personal</option>
                        <option value="Eliminar personal">Eliminar personal</option>
                        <option value="Crear operador">Crear operador</option>
                        <option value="Editar operador">Editar operador</option>
                        <option value="Eliminar operador">Eliminar operador</option>
                        <option value="Cambiar rol">Cambiar rol</option>
                        <option value="Exportar respaldo">Exportar respaldo</option>
                        <option value="Importar respaldo">Importar respaldo</option>
                        <option value="Resolver observación">Resolver obs</option>
                    </select>
                    <input type="text" id="filtro-auditoria-busqueda" placeholder="🔍 Buscar..." style="flex: 2; min-width: 150px; padding: 10px; border: 2px solid #b8b39a; border-radius: 8px; background: #f5f2e4;">
                    <button class="btn-primary" onclick="aplicarFiltrosAuditoria()" style="width: auto; padding: 12px 20px;">🔄 Aplicar</button>
                    <button class="btn-cancel" onclick="limpiarFiltrosAuditoria()" style="width: auto; padding: 12px 20px;">🗑️ Limpiar</button>
                </div>
                <div class="list-container" id="lista-auditoria">
                    ${auditoria.slice(-50).reverse().map(a => `
                        <div class="list-item auditoria-item" 
                             data-fecha="${a.fecha}" 
                             data-operador="${(a.nombre_operador || '').toLowerCase()}" 
                             data-accion="${a.accion || ''}"
                             data-detalle="${(a.detalle || '').toLowerCase()}">
                            <div class="info">
                                <div class="name">${a.nombre_operador || 'Sistema'}</div>
                                <div class="detail">${a.fecha} ${a.hora} - ${a.accion}: ${a.detalle}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('❌ Error seguridad:', error);
    }
}

// ============ AUDITORÍA ============
async function aplicarFiltrosAuditoria() {
    const fechaInicio = document.getElementById('filtro-auditoria-fecha-inicio').value;
    const fechaFin = document.getElementById('filtro-auditoria-fecha-fin').value;
    const operador = document.getElementById('filtro-auditoria-operador').value.toLowerCase();
    const accion = document.getElementById('filtro-auditoria-accion').value;
    const busqueda = document.getElementById('filtro-auditoria-busqueda').value.toLowerCase();
    
    const items = document.querySelectorAll('.auditoria-item');
    let visibles = 0;
    
    items.forEach(item => {
        const itemFecha = item.dataset.fecha || '';
        const itemOperador = item.dataset.operador || '';
        const itemAccion = item.dataset.accion || '';
        const itemDetalle = item.dataset.detalle || '';
        
        let mostrar = true;
        if (fechaInicio && itemFecha < fechaInicio) mostrar = false;
        if (fechaFin && itemFecha > fechaFin) mostrar = false;
        if (operador !== 'todos' && !itemOperador.includes(operador)) mostrar = false;
        if (accion !== 'todos' && itemAccion !== accion) mostrar = false;
        if (busqueda && !itemDetalle.includes(busqueda) && !itemOperador.includes(busqueda)) mostrar = false;
        
        item.style.display = mostrar ? 'flex' : 'none';
        if (mostrar) visibles++;
    });
    
    const lista = document.getElementById('lista-auditoria');
    const existing = lista.querySelector('.filtro-contador');
    if (existing) existing.remove();
    
    const contador = document.createElement('div');
    contador.className = 'filtro-contador';
    contador.style.cssText = 'padding: 10px 15px; font-size: 14px; color: #5a6048; background: #ebe7d3; border-bottom: 1px solid #b8b39a;';
    contador.textContent = `📊 Mostrando ${visibles} de ${items.length} registros`;
    lista.prepend(contador);
}

function limpiarFiltrosAuditoria() {
    document.getElementById('filtro-auditoria-fecha-inicio').value = '';
    document.getElementById('filtro-auditoria-fecha-fin').value = '';
    document.getElementById('filtro-auditoria-operador').value = 'todos';
    document.getElementById('filtro-auditoria-accion').value = 'todos';
    document.getElementById('filtro-auditoria-busqueda').value = '';
    
    document.querySelectorAll('.auditoria-item').forEach(item => item.style.display = 'flex');
    
    const lista = document.getElementById('lista-auditoria');
    const existing = lista.querySelector('.filtro-contador');
    if (existing) existing.remove();
}

async function exportarAuditoriaExcel() {
    try {
        const auditoria = await getAllAuditoria();
        const datos = auditoria.map(a => ({
            Fecha: a.fecha,
            Hora: a.hora,
            Operador: a.nombre_operador || 'Sistema',
            Rol: a.rol || 'operador',
            Accion: a.accion,
            Detalle: a.detalle
        }));
        exportarExcel(datos, `auditoria_${obtenerFechaActual()}`, 'xlsx');
        
        await addAuditoria({
            operador_id: currentUser.id,
            nombre_operador: currentUser.nombre,
            rol: currentUser.rol,
            fecha: obtenerFechaActual(),
            hora: obtenerHoraActual(),
            accion: 'Exportar auditoría',
            detalle: 'Exportó auditoría Excel'
        });
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

async function exportarAuditoriaCSV() {
    try {
        const auditoria = await getAllAuditoria();
        const datos = auditoria.map(a => ({
            Fecha: a.fecha,
            Hora: a.hora,
            Operador: a.nombre_operador || 'Sistema',
            Rol: a.rol || 'operador',
            Accion: a.accion,
            Detalle: a.detalle
        }));
        exportarExcel(datos, `auditoria_${obtenerFechaActual()}`, 'csv');
        
        await addAuditoria({
            operador_id: currentUser.id,
            nombre_operador: currentUser.nombre,
            rol: currentUser.rol,
            fecha: obtenerFechaActual(),
            hora: obtenerHoraActual(),
            accion: 'Exportar auditoría',
            detalle: 'Exportó auditoría CSV'
        });
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

async function imprimirAuditoriaConFiltros() {
    try {
        const items = document.querySelectorAll('.auditoria-item');
        const itemsVisibles = [];
        
        items.forEach(item => {
            if (item.style.display !== 'none') {
                const nombre = item.querySelector('.name')?.textContent || 'Sistema';
                const detalle = item.querySelector('.detail')?.textContent || '';
                itemsVisibles.push({ nombre, detalle });
            }
        });
        
        if (itemsVisibles.length === 0) {
            alert('No hay registros para imprimir');
            return;
        }
        
        let tablaHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Operador</th>
                        <th>Detalle</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        itemsVisibles.forEach(item => {
            const partes = item.detalle.split(' - ');
            const fechaHora = partes[0] || '';
            const accionDetalle = partes.slice(1).join(' - ') || '';
            tablaHTML += `
                <tr>
                    <td>${item.nombre}</td>
                    <td>${fechaHora} - ${accionDetalle}</td>
                </tr>
            `;
        });
        
        tablaHTML += `</tbody></table>`;
        
        imprimirConFirmas(tablaHTML, 'REPORTE DE AUDITORÍA DEL SISTEMA');
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// ============ OPERADORES CRUD ============
async function editarOperador(operadorId) {
    const operadores = await getAllOperadores();
    const operador = operadores.find(o => o.id === operadorId);
    
    if (!operador) {
        alert('Operador no encontrado');
        return;
    }
    
    const contenido = document.getElementById('main-content');
    contenido.innerHTML = `
        ${crearEncabezadoModulo('✏️ Editar Operador', `Editando: ${operador.nombre}`)}
        <div style="padding: 0 20px 20px;">
            <div style="margin-top: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 700;">Nombre:</label>
                <input type="text" id="edit-op-nombre" value="${operador.nombre}" style="width: 100%; padding: 12px; margin-bottom: 15px; border: 2px solid #b8b39a; border-radius: 8px; font-size: 16px; background: #f5f2e4;">
                
                <label style="display: block; margin-bottom: 5px; font-weight: 700;">Usuario:</label>
                <input type="text" id="edit-op-username" value="${operador.username}" style="width: 100%; padding: 12px; margin-bottom: 15px; border: 2px solid #b8b39a; border-radius: 8px; font-size: 16px; background: #f5f2e4;">
                
                <label style="display: block; margin-bottom: 5px; font-weight: 700;">Nueva Contraseña (blanco = mantener):</label>
                <input type="password" id="edit-op-password" style="width: 100%; padding: 12px; margin-bottom: 15px; border: 2px solid #b8b39a; border-radius: 8px; font-size: 16px; background: #f5f2e4;">
                
                <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                    <input type="checkbox" id="edit-op-activo" ${operador.activo ? 'checked' : ''}>
                    Activo
                </label>
                
                <div style="display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap;">
                    <button class="btn-success" onclick="guardarEdicionOperador('${operadorId}')" style="flex: 1; min-width: 120px;">💾 Guardar</button>
                    <button class="btn-cancel" onclick="mostrarSeguridad()" style="flex: 1; min-width: 120px;">❌ Cancelar</button>
                </div>
            </div>
        </div>
    `;
}

async function guardarEdicionOperador(operadorId) {
    try {
        const operadores = await getAllOperadores();
        const operador = operadores.find(o => o.id === operadorId);
        
        if (!operador) {
            alert('Operador no encontrado');
            return;
        }
        
        const nombre = document.getElementById('edit-op-nombre').value.trim();
        const username = document.getElementById('edit-op-username').value.trim();
        const password = document.getElementById('edit-op-password').value;
        const activo = document.getElementById('edit-op-activo').checked;
        
        if (!nombre || !username) {
            alert('Nombre y usuario son obligatorios');
            return;
        }
        
        operador.nombre = nombre;
        operador.username = username;
        if (password) operador.password = password;
        operador.activo = activo;
        
        await addOperador(operador);
        await addAuditoria({
            operador_id: currentUser.id,
            nombre_operador: currentUser.nombre,
            rol: currentUser.rol,
            fecha: obtenerFechaActual(),
            hora: obtenerHoraActual(),
            accion: 'Editar operador',
            detalle: `Editó ${nombre}`
        });
        
        await backupAutomatico(true);
        
        mostrarNotificacion(`✅ Actualizado: ${nombre}`);
        mostrarSeguridad();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

async function eliminarOperador(operadorId) {
    if (!confirm('¿Eliminar este operador?')) return;
    
    try {
        if (operadorId === 'admin-001') {
            alert('No se puede eliminar al admin principal');
            return;
        }
        
        const operadores = await getAllOperadores();
        const operador = operadores.find(o => o.id === operadorId);
        
        await deleteOperador(operadorId);
        await addAuditoria({
            operador_id: currentUser.id,
            nombre_operador: currentUser.nombre,
            rol: currentUser.rol,
            fecha: obtenerFechaActual(),
            hora: obtenerHoraActual(),
            accion: 'Eliminar operador',
            detalle: `Eliminó ${operador ? operador.nombre : operadorId}`
        });
        
        await backupAutomatico(true);
        
        mostrarNotificacion('✅ Operador eliminado');
        mostrarSeguridad();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

async function cambiarRol(operadorId) {
    try {
        const operadores = await getAllOperadores();
        const operador = operadores.find(o => o.id === operadorId);
        
        if (!operador) {
            alert('Operador no encontrado');
            return;
        }
        
        if (operadorId === 'admin-001') {
            alert('No se puede cambiar el rol del admin principal');
            return;
        }
        
        const nuevoRol = operador.rol === 'admin' ? 'operador' : 'admin';
        if (!confirm(`¿Cambiar rol de ${operador.nombre} a ${nuevoRol}?`)) return;
        
        operador.rol = nuevoRol;
        await addOperador(operador);
        
        await addAuditoria({
            operador_id: currentUser.id,
            nombre_operador: currentUser.nombre,
            rol: currentUser.rol,
            fecha: obtenerFechaActual(),
            hora: obtenerHoraActual(),
            accion: 'Cambiar rol',
            detalle: `${operador.nombre} → ${nuevoRol}`
        });
        
        await backupAutomatico(true);
        
        mostrarNotificacion(`✅ Rol actualizado: ${nuevoRol}`);
        mostrarSeguridad();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

function nuevoOperador() {
    const contenido = document.getElementById('main-content');
    
    contenido.innerHTML = `
        ${crearEncabezadoModulo('➕ Nuevo Operador', 'Configure el operador')}
        <div style="padding: 0 20px 20px;">
            <div style="margin-top: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 700;">Nombre:</label>
                <input type="text" id="op-nombre" style="width: 100%; padding: 12px; margin-bottom: 15px; border: 2px solid #b8b39a; border-radius: 8px; font-size: 16px; background: #f5f2e4;">
                
                <label style="display: block; margin-bottom: 5px; font-weight: 700;">Usuario:</label>
                <input type="text" id="op-username" style="width: 100%; padding: 12px; margin-bottom: 15px; border: 2px solid #b8b39a; border-radius: 8px; font-size: 16px; background: #f5f2e4;">
                
                <label style="display: block; margin-bottom: 5px; font-weight: 700;">Contraseña:</label>
                <input type="password" id="op-password" style="width: 100%; padding: 12px; margin-bottom: 15px; border: 2px solid #b8b39a; border-radius: 8px; font-size: 16px; background: #f5f2e4;">
                
                <h3 style="margin: 20px 0 10px; color: #3a4a2e;">Permisos:</h3>
                <div id="permisos-container" style="background: #ebe7d3; padding: 15px; border-radius: 8px;">
                    ${renderizarPermisosCheckbox()}
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap;">
                    <button class="btn-success" onclick="guardarNuevoOperador()" style="flex: 1; min-width: 120px;">💾 Guardar</button>
                    <button class="btn-cancel" onclick="mostrarSeguridad()" style="flex: 1; min-width: 120px;">❌ Cancelar</button>
                </div>
            </div>
        </div>
    `;
}

function renderizarPermisosCheckbox() {
    const permisos = [
        { clave: 'control_asistencia', label: 'Control de Asistencia' },
        { clave: 'ver_dentro', label: 'Ver módulo Dentro' },
        { clave: 'ver_reportes', label: 'Ver Reportes' },
        { clave: 'ver_personal', label: 'Ver/Editar Personal' },
        { clave: 'ver_observados', label: 'Ver Personal Observado' },
        { clave: 'resolver_observaciones', label: 'Resolver observaciones' },
        { clave: 'importar_csv', label: 'Importar CSV' },
        { clave: 'exportar_respaldo', label: 'Exportar respaldo' },
        { clave: 'gestionar_operadores', label: 'Gestionar operadores' },
        { clave: 'ver_auditoria', label: 'Ver auditoría' }
    ];
    
    return permisos.map(p => `
        <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <input type="checkbox" id="perm-${p.clave}" checked>
            ${p.label}
        </label>
    `).join('');
}

async function guardarNuevoOperador() {
    try {
        const nombre = document.getElementById('op-nombre').value.trim();
        const username = document.getElementById('op-username').value.trim();
        const password = document.getElementById('op-password').value;
        
        if (!nombre || !username || !password) {
            alert('Todos los campos son obligatorios');
            return;
        }
        
        const permisos = {};
        document.querySelectorAll('#permisos-container input[type="checkbox"]').forEach(cb => {
            const clave = cb.id.replace('perm-', '');
            permisos[clave] = cb.checked;
        });
        
        const operador = {
            id: `op-${Date.now()}`,
            nombre, username, password,
            rol: 'operador',
            permisos,
            activo: true
        };
        
        await addOperador(operador);
        await addAuditoria({
            operador_id: currentUser.id,
            nombre_operador: currentUser.nombre,
            rol: currentUser.rol,
            fecha: obtenerFechaActual(),
            hora: obtenerHoraActual(),
            accion: 'Crear operador',
            detalle: `Creó ${nombre}`
        });
        
        await backupAutomatico(true);
        
        mostrarNotificacion(`✅ Operador creado: ${nombre}`);
        mostrarSeguridad();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// ============ IMPORTAR RESPALDO ============
async function importarRespaldo() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const respaldo = JSON.parse(e.target.result);
                
                if (!respaldo.version) {
                    alert('❌ Archivo no válido');
                    return;
                }
                
                const totalPersonal = respaldo.personal?.length || 0;
                const totalFichajes = respaldo.fichajes?.length || 0;
                const totalOperadores = respaldo.operadores?.length || 0;
                const totalAuditoria = respaldo.auditoria?.length || 0;
                const totalObservaciones = respaldo.observaciones?.length || 0;
                const fechaExportacion = respaldo.fecha_exportacion?.fecha || 'desconocida';
                
                const confirmar = confirm(
                    `⚠️ ¿Restaurar respaldo?\n\n` +
                    `📅 Exportado: ${fechaExportacion}\n` +
                    `👤 Personal: ${totalPersonal}\n` +
                    `📋 Fichajes: ${totalFichajes}\n` +
                    `🔐 Operadores: ${totalOperadores}\n` +
                    `📝 Auditoría: ${totalAuditoria}\n` +
                    `⚠️ Observaciones: ${totalObservaciones}\n\n` +
                    `⚠️ Los datos actuales serán SOBRESCRITOS`
                );
                
                if (!confirmar) return;
                if (!confirm('⚠️ ¿Estás SEGURO?')) return;
                
                const tx = db.transaction(
                    ['empleados', 'fichajes', 'operadores', 'sesiones', 'auditoria', 'observaciones'], 
                    'readwrite'
                );
                
                const stores = ['empleados', 'fichajes', 'operadores', 'sesiones', 'auditoria', 'observaciones'];
                stores.forEach(storeName => {
                    const store = tx.objectStore(storeName);
                    store.clear();
                });
                
                await new Promise((resolve, reject) => {
                    tx.oncomplete = resolve;
                    tx.onerror = reject;
                });
                
                let importados = {};
                
                if (respaldo.operadores?.length > 0) {
                    for (const op of respaldo.operadores) {
                        await addOperador(op);
                    }
                    importados.operadores = respaldo.operadores.length;
                }
                
                if (respaldo.personal?.length > 0) {
                    for (const emp of respaldo.personal) {
                        await addEmpleado(emp);
                    }
                    importados.personal = respaldo.personal.length;
                }
                
                if (respaldo.fichajes?.length > 0) {
                    for (const f of respaldo.fichajes) {
                        await addFichaje(f);
                    }
                    importados.fichajes = respaldo.fichajes.length;
                }
                
                if (respaldo.auditoria?.length > 0) {
                    for (const a of respaldo.auditoria) {
                        await addAuditoria(a);
                    }
                    importados.auditoria = respaldo.auditoria.length;
                }
                
                if (respaldo.observaciones?.length > 0) {
                    for (const obs of respaldo.observaciones) {
                        await addObservacion(obs);
                    }
                    importados.observaciones = respaldo.observaciones.length;
                }
                
                await addAuditoria({
                    operador_id: currentUser?.id || 'sistema',
                    nombre_operador: currentUser?.nombre || 'SISTEMA',
                    rol: currentUser?.rol || 'admin',
                    fecha: obtenerFechaActual(),
                    hora: obtenerHoraActual(),
                    accion: 'Importar respaldo',
                    detalle: `Importó respaldo: ${importados.personal || 0} personal`
                });
                
                alert(
                    `✅ Respaldo importado\n\n` +
                    `👤 Personal: ${importados.personal || 0}\n` +
                    `📋 Fichajes: ${importados.fichajes || 0}\n` +
                    `🔐 Operadores: ${importados.operadores || 0}\n` +
                    `📝 Auditoría: ${importados.auditoria || 0}\n` +
                    `⚠️ Observaciones: ${importados.observaciones || 0}`
                );
                
                mostrarSeguridad();
            } catch (error) {
                console.error('❌ Error:', error);
                alert('❌ Error al importar. Verifique el archivo.');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

// ============ REINICIO ============
function solicitarReinicio() {
    const modal = document.createElement('div');
    modal.className = 'modal-confirm';
    modal.innerHTML = `
        <div class="modal-confirm-content">
            <h3 style="margin-bottom: 15px; color: #a83232;">⚠️ Reiniciar Sistema</h3>
            <p style="margin-bottom: 15px; color: #5a6048;">Ingrese contraseña de administrador</p>
            <input type="password" id="password-reinicio" placeholder="Contraseña admin" style="margin-bottom: 15px;">
            <div style="display: flex; gap: 10px;">
                <button onclick="confirmarReinicio()" style="flex: 1; background: #a83232; color: white; border: none; padding: 12px; border-radius: 8px; font-size: 16px; cursor: pointer; font-weight: 700;">🔄 Reiniciar</button>
                <button onclick="this.closest('.modal-confirm').remove()" style="flex: 1; background: #ebe7d3; color: #2a2f22; border: none; padding: 12px; border-radius: 8px; font-size: 16px; cursor: pointer; font-weight: 700;">❌ Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    setTimeout(() => {
        document.getElementById('password-reinicio').focus();
    }, 100);
    
    document.getElementById('password-reinicio').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') confirmarReinicio();
    });
}

async function confirmarReinicio() {
    const password = document.getElementById('password-reinicio').value;
    const modal = document.querySelector('.modal-confirm');
    
    if (!password) {
        alert('Ingrese la contraseña');
        return;
    }
    
    const admin = await getOperadorByUsername('admin');
    if (!admin || admin.password !== password) {
        alert('❌ Contraseña incorrecta');
        document.getElementById('password-reinicio').value = '';
        document.getElementById('password-reinicio').focus();
        return;
    }
    
    modal.remove();
    
    if (!confirm('⚠️ ¿Reiniciar el sistema? ELIMINARÁ TODOS los datos.')) return;
    if (!confirm('⚠️ ÚLTIMA ADVERTENCIA: IRREVERSIBLE. ¿Continuar?')) return;
    
    await reiniciarSistema();
}

async function reiniciarSistema() {
    try {
        const admin = await getOperadorByUsername('admin');
        
        const tx = db.transaction(['empleados', 'fichajes', 'operadores', 'sesiones', 'auditoria', 'observaciones', 'configuracion'], 'readwrite');
        
        ['empleados', 'fichajes', 'operadores', 'sesiones', 'auditoria', 'observaciones', 'configuracion'].forEach(storeName => {
            tx.objectStore(storeName).clear();
        });
        
        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = reject;
        });
        
        if (admin) {
            await addOperador(admin);
        } else {
            await inicializarAdmin();
        }
        
        alert('✅ Sistema reiniciado');
        currentUser = null;
        currentSession = null;
        mostrarPantalla('login');
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// ============ AUXILIARES ============
function calcularEmpleadosDentro(fichajes) {
    const dentro = new Set();
    fichajes.forEach(f => {
        if (f.tipo === 'ENTRADA') dentro.add(f.empleado_id);
        else if (f.tipo === 'SALIDA') dentro.delete(f.empleado_id);
    });
    return dentro.size;
}

async function calcularEmpleadosDentroLista(fichajes) {
    const personal = await getAllEmpleados();
    const dentro = new Map();
    fichajes.sort((a, b) => a.id - b.id);
    fichajes.forEach(f => {
        if (f.tipo === 'ENTRADA') dentro.set(f.empleado_id, { horaEntrada: f.hora });
        else if (f.tipo === 'SALIDA') dentro.delete(f.empleado_id);
    });
    return personal.filter(e => dentro.has(e.id)).map(e => ({
        ...e,
        horaEntrada: dentro.get(e.id).horaEntrada
    }));
}

function obtenerSemana(fecha) {
    const d = new Date(fecha);
    const dia = d.getDay() || 7;
    const diff = d.getDate() - dia + 1;
    const inicio = new Date(d.setDate(diff));
    const fin = new Date(d.setDate(diff + 6));
    return {
        inicio: inicio.toISOString().split('T')[0],
        fin: fin.toISOString().split('T')[0]
    };
}

// ============ EXPORTAR RESPALDO ============
async function exportarRespaldo() {
    try {
        const personal = await getAllEmpleados();
        const fichajes = await getAllFichajes();
        const operadores = await getAllOperadores();
        const auditoria = await getAllAuditoria();
        const observaciones = await getAllObservaciones();
        
        const respaldo = {
            version: '1.0',
            fecha_exportacion: obtenerFechaHoraActual(),
            total_registros: {
                personal: personal.length,
                fichajes: fichajes.length,
                operadores: operadores.length,
                auditoria: auditoria.length,
                observaciones: observaciones.length
            },
            personal, fichajes, operadores, auditoria, observaciones,
            tipo: 'respaldo_completo'
        };
        
        const json = JSON.stringify(respaldo, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `respaldo_completo_${obtenerFechaActual()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        await addAuditoria({
            operador_id: currentUser.id,
            nombre_operador: currentUser.nombre,
            rol: currentUser.rol,
            fecha: obtenerFechaActual(),
            hora: obtenerHoraActual(),
            accion: 'Exportar respaldo',
            detalle: `Exportó respaldo completo`
        });
        
        mostrarNotificacion(`✅ Respaldo exportado`);
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

async function importarCSV() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const texto = e.target.result;
                const lineas = texto.split('\n');
                let importados = 0, actualizados = 0, errores = 0;
                
                for (let i = 1; i < lineas.length; i++) {
                    const linea = lineas[i].trim();
                    if (!linea) continue;
                    const partes = linea.split(',');
                    if (partes.length < 2) { errores++; continue; }
                    const nombre = partes[0].trim();
                    const cedula = partes[1].trim();
                    if (!nombre || !cedula) { errores++; continue; }
                    
                    const personal = await getAllEmpleados();
                    const existente = personal.find(e => e.cedula === cedula);
                    if (existente) {
                        existente.nombre = nombre;
                        await updateEmpleado(existente);
                        actualizados++;
                    } else {
                        await addEmpleado({
                            id: `emp-${Date.now()}-${i}`,
                            nombre, cedula,
                            rfid: null, foto: null,
                            fecha_creacion: obtenerFechaActual()
                        });
                        importados++;
                    }
                }
                
                alert(`📥 Importación:\n✅ ${importados} importados\n🔄 ${actualizados} actualizados\n⚠️ ${errores} errores`);
                mostrarPersonal();
            } catch (error) {
                console.error('❌ Error:', error);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// ============ IMPRIMIR CON FIRMAS ============
function imprimirConFirmas(contenidoHTML, titulo = 'Reporte', fechaInicio = '', fechaFin = '') {
    const ventana = window.open('', '_blank');
    
    let bloqueFechas = '';
    if (fechaInicio || fechaFin) {
        bloqueFechas = `
            <div class="print-rango-fechas">
                <strong>RANGO DEL REPORTE:</strong> 
                DESDE: ${fechaInicio || 'N/A'} 
                &nbsp;&nbsp;|&nbsp;&nbsp; 
                HASTA: ${fechaFin || 'N/A'}
            </div>
        `;
    }
    
    ventana.document.write(`
        <html>
            <head>
                <title>${titulo}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: Arial, Helvetica, sans-serif; 
                        padding: 15px; 
                        font-size: 8pt;
                        color: #000;
                    }
                    h1 { font-size: 12pt; text-align: center; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; }
                    .subtitulo-print { text-align: center; font-size: 9pt; color: #333; margin-bottom: 8px; }
                    .fecha { text-align: right; font-size: 7pt; color: #555; margin-bottom: 8px; }
                    
                    .print-rango-fechas {
                        text-align: center;
                        font-size: 9pt;
                        margin-bottom: 10px;
                        padding: 6px;
                        border: 1px solid #000;
                        background: #f0f0f0;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        font-size: 7pt;
                        margin: 5px 0;
                        border: 1px solid #000;
                    }
                    th { 
                        background: #4a5c3a; 
                        color: white; 
                        padding: 4px 4px; 
                        text-align: left; 
                        font-size: 7pt;
                        font-weight: bold;
                        border: 0.5px solid #000;
                        text-transform: uppercase;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    td { 
                        padding: 3px 4px; 
                        font-size: 7pt; 
                        border: 0.5px solid #999; 
                        line-height: 1.2;
                    }
                    tr:nth-child(even) { 
                        background: #f5f5f0;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    
                    .firmas-container {
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 1px solid #000;
                        display: flex;
                        justify-content: space-around;
                        width: 100%;
                    }
                    .firma-item {
                        text-align: center;
                        width: 40%;
                    }
                    .firma-item .linea-firma {
                        border-bottom: 1px solid #000;
                        width: 100%;
                        height: 40px;
                        margin-bottom: 5px;
                    }
                    .firma-item .nombre-firma {
                        font-size: 8pt;
                        font-weight: bold;
                    }
                    .firma-item .cargo-firma {
                        font-size: 7pt;
                        color: #555;
                    }
                    
                    @page {
                        size: Letter;
                        margin: 15mm 12mm 20mm 12mm;
                    }
                    
                    /* OCULTAR BOTONES EN LA IMPRESIÓN */
                    @media print {
                        .btn-print, .btn-close, button {
                            display: none !important;
                        }
                        body { margin: 0; padding: 10px; }
                    }
                    
                    .btn-print, .btn-close {
                        display: inline-block;
                        padding: 8px 20px;
                        margin: 10px 5px 0 0;
                        cursor: pointer;
                        background: #4a5c3a;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 12px;
                    }
                    
                    .btn-close {
                        background: #a83232;
                    }
                </style>
            </head>
            <body>
                <h1>${titulo}</h1>
                <div class="fecha">Fecha de impresión: ${obtenerFechaActual()} ${obtenerHoraActual()}</div>
                ${bloqueFechas}
                ${contenidoHTML}
                
                <div class="firmas-container">
                    <div class="firma-item">
                        <div class="linea-firma"></div>
                        <div class="nombre-firma">_________________________</div>
                        <div class="cargo-firma">Nombre y Firma</div>
                    </div>
                    <div class="firma-item">
                        <div class="linea-firma"></div>
                        <div class="nombre-firma">_________________________</div>
                        <div class="cargo-firma">Nombre y Firma</div>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 10px; font-size: 6pt; color: #999;">
                    Documento generado automáticamente - Control de Personal
                </div>
                
                <div style="text-align: center;">
                    <button class="btn-print" onclick="window.print()">🖨️ Imprimir</button>
                    <button class="btn-close" onclick="window.close()">❌ Cerrar</button>
                </div>
            </body>
        </html>
    `);
    ventana.document.close();
}

// ============ EXPORTAR GLOBALES ============
window.volverAlInicio = volverAlInicio;
window.toggleFullscreen = toggleFullscreen;
window.configurarCarpeta = configurarCarpeta;
window.mostrarControl = mostrarControl;
window.mostrarDentro = mostrarDentro;
window.mostrarReportes = mostrarReportes;
window.mostrarPersonal = mostrarPersonal;
window.mostrarObservados = mostrarObservados;
window.mostrarSeguridad = mostrarSeguridad;
window.mostrarConfirmacionFichaje = mostrarConfirmacionFichaje;
window.cerrarModalFichaje = cerrarModalFichaje;
window.confirmarFichajeConMotivo = confirmarFichajeConMotivo;
window.nuevoPersonal = nuevoPersonal;
window.guardarNuevoPersonal = guardarNuevoPersonal;
window.editarPersonal = editarPersonal;
window.verPersonal = verPersonal;
window.guardarEdicionPersonal = guardarEdicionPersonal;
window.eliminarPersonal = eliminarPersonal;
window.verObservacion = verObservacion;
window.resolverObservacionConNota = resolverObservacionConNota;
window.nuevoOperador = nuevoOperador;
window.guardarNuevoOperador = guardarNuevoOperador;
window.editarOperador = editarOperador;
window.guardarEdicionOperador = guardarEdicionOperador;
window.eliminarOperador = eliminarOperador;
window.cambiarRol = cambiarRol;
window.solicitarReinicio = solicitarReinicio;
window.confirmarReinicio = confirmarReinicio;
window.exportarRespaldo = exportarRespaldo;
window.importarRespaldo = importarRespaldo;
window.importarCSV = importarCSV;
window.aplicarFiltrosReportes = aplicarFiltrosReportes;
window.imprimirReporte = imprimirReporte;
window.exportarReportesExcel = exportarReportesExcel;
window.exportarReportesCSV = exportarReportesCSV;
window.abrirCamara = abrirCamara;
window.cerrarCamaraPC = cerrarCamaraPC;
window.capturarFotoPC = capturarFotoPC;
window.abrirCamaraEdit = abrirCamaraEdit;
window.cerrarCamaraEditPC = cerrarCamaraEditPC;
window.capturarFotoEditPC = capturarFotoEditPC;
window.mostrarNotificacion = mostrarNotificacion;
window.aplicarFiltrosAuditoria = aplicarFiltrosAuditoria;
window.limpiarFiltrosAuditoria = limpiarFiltrosAuditoria;
window.exportarAuditoriaExcel = exportarAuditoriaExcel;
window.exportarAuditoriaCSV = exportarAuditoriaCSV;
window.imprimirAuditoriaConFiltros = imprimirAuditoriaConFiltros;
window.exportarPersonalConFotos = exportarPersonalConFotos;
window.exportarExcel = exportarExcel;
window.reproducirSonido = reproducirSonido;
window.nuevoPersonalDesdeControl = nuevoPersonalDesdeControl;
window.guardarNuevoPersonalControl = guardarNuevoPersonalControl;
window.abrirCamaraControl = abrirCamaraControl;
window.capturarFotoControl = capturarFotoControl;
window.cerrarCamaraControl = cerrarCamaraControl;
window.backupAutomatico = backupAutomatico;
window.toggleFechasPersonalizadas = toggleFechasPersonalizadas;
window.contarObservacionesPendientes = contarObservacionesPendientes;
window.renderizarListaObservados = renderizarListaObservados;
window.aplicarFiltrosObservados = aplicarFiltrosObservados;
window.limpiarFiltrosObservados = limpiarFiltrosObservados;
window.imprimirObservadosConFiltros = imprimirObservadosConFiltros;
window.procesarCambioDia = procesarCambioDia;
window.renderizarResultadosBusqueda = renderizarResultadosBusqueda;
window.imprimirConFirmas = imprimirConFirmas;