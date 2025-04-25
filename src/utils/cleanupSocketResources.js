// utils/cleanupSocketResources.js
import WebSocket from 'ws'; // Necesario para comprobar ws.readyState

const cleanupSocketResources = (socket, listenerMap, wsMap) => {
    const socketId = socket?.id;
     if (!socketId) {
        console.warn("cleanupSocketResources: Socket ID no encontrado.");
        return; // Salir si no hay socketId
     }
    try {
        // Acceder al adaptador adjunto al socket
        const eventEmitter = socket?.marketDataAdap?.eventEmitter;

        if (!eventEmitter) {
            // Loggear advertencia pero continuar para limpiar WS si es posible
            console.warn(`[${socketId}] marketDataAdap.eventEmitter no disponible. Saltando limpieza de listeners.`);
        } else {
            // --- Limpiar Listeners ---
            const listenerKeys = [
                `ticker_${socketId}`,
                `klineUpdate_${socketId}`, `klineTick_${socketId}`,
                `shortUpdate_${socketId}`, `shortTick_${socketId}`
            ];
            const eventNames = {
                 [`ticker_${socketId}`]: "marketDataUpdate",
                 [`klineUpdate_${socketId}`]: "candlestickUpdate",
                 [`klineTick_${socketId}`]: "candlestickTickUpdate",
                 [`shortUpdate_${socketId}`]: "candlestickUpdate",
                 [`shortTick_${socketId}`]: "candlestickTickUpdate"
            };

            listenerKeys.forEach(key => {
                const listener = listenerMap.get(key);
                const eventName = eventNames[key];
                if (listener && eventName) {
                    try {
                        eventEmitter.removeListener(eventName, listener);
                    } catch (listenerError) {
                        console.error(`[${socketId}] Error removiendo listener ${eventName}:`, listenerError);
                    } finally {
                        listenerMap.delete(key);
                    }
                } else if (listenerMap.has(key)) {
                     // Si la clave existe pero no hay listener o eventName, borrarla igual
                     listenerMap.delete(key);
                }
            });
        }

        // Asegurar que wsMap existe
        if (!wsMap) {
             console.warn(`[${socketId}] wsMap no disponible. Saltando limpieza de WS.`);
        } else {
            // --- Limpiar WebSockets ---
            const wsKeys = [`kline_${socketId}`, `short_${socketId}`];
            wsKeys.forEach(key => {
                const ws = wsMap.get(key);
                if (ws) {
                    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                        try { ws.close(); }
                        catch (wsError) { console.error(`[${socketId}] Error cerrando WS ${key}:`, wsError); }
                    } else {
                         // console.warn(`[${socketId}] WS ${key} no estaba abierto/conectando (Estado: ${ws.readyState}).`);
                    }
                    wsMap.delete(key); // Borrar siempre
                }
            });
        }

    } catch (generalError) {
        console.error(`[${socketId}] Error general en cleanupSocketResources utility:`, generalError);
    }
};

export default cleanupSocketResources;