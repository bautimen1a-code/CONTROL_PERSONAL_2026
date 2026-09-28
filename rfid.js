// ============ CAPTURA RFID HID ============
let rfidBuffer = '';
let lastRfidTime = 0;
let rfidCallback = null;
let rfidTimeout = null;

const RFID_CONFIG = {
    timeout: 2000,
    minLength: 4,
    maxLength: 20,
    delimiter: 'Enter',
    allowAlphanumeric: true
};

function initRFID(callback) {
    rfidCallback = callback;
    
    document.addEventListener('keydown', (e) => {
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
            return;
        }

        const isDelimiter = (e.key === 'Enter' || e.key === 'Tab');
        if (isDelimiter && rfidBuffer.length > 0) {
            e.preventDefault();
            const codigo = rfidBuffer;
            rfidBuffer = '';
            clearTimeout(rfidTimeout);
            if (rfidCallback) {
                rfidCallback(codigo);
            }
            return;
        }

        if (e.key === 'Escape') {
            rfidBuffer = '';
            clearTimeout(rfidTimeout);
            return;
        }

        const isDigit = e.key >= '0' && e.key <= '9';
        const isLetter = RFID_CONFIG.allowAlphanumeric && 
                         ((e.key >= 'a' && e.key <= 'z') || (e.key >= 'A' && e.key <= 'Z'));
        
        if (isDigit || isLetter) {
            e.preventDefault();
            rfidBuffer += e.key;
            lastRfidTime = Date.now();
            clearTimeout(rfidTimeout);
            rfidTimeout = setTimeout(() => {
                if (rfidBuffer.length > 0) {
                    console.warn('⏱️ Timeout, buffer limpiado');
                    rfidBuffer = '';
                }
            }, RFID_CONFIG.timeout);
        }
    });
}

async function buscarPorRFID(codigo) {
    try {
        const empleado = await getEmpleadoByRFID(codigo);
        return empleado;
    } catch (error) {
        console.error('❌ Error buscar RFID:', error);
        return null;
    }
}