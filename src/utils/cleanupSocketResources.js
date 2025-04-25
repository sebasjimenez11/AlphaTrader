// utils/cleanupSocketResources.js
import WebSocket from 'ws';

const cleanupSocketResources = (socket, listenerMap, wsMap) => {
    const socketId = socket?.id;
     if (!socketId) {
        console.warn("cleanupSocketResources: Socket ID no encontrado.");
        return;
     }
    try {
        const eventEmitter = socket?.marketDataAdap?.eventEmitter;

        if (!eventEmitter) {
            console.warn(`[${socketId}] marketDataAdap.eventEmitter no disponible. Saltando limpieza de listeners.`);
        } else {
            // --- Limpiar Listeners ---
            const listenerKeys = [
                `ticker_${socketId}`,
                `klineUpdate_${socketId}`, `klineTick_${socketId}`,
                `shortUpdate_${socketId}`, `shortTick_${socketId}`,
                // *** AÑADIDO: Nuevos listeners para klines de preferencias ***
                `prefKlineUpdate_${socketId}`, `prefKlineTick_${socketId}`
            ];
            const eventNames = {
                 [`ticker_${socketId}`]: "marketDataUpdate",
                 [`klineUpdate_${socketId}`]: "candlestickUpdate",
                 [`klineTick_${socketId}`]: "candlestickTickUpdate",
                 [`shortUpdate_${socketId}`]: "candlestickUpdate",
                 [`shortTick_${socketId}`]: "candlestickTickUpdate",
                 [`prefKlineUpdate_${socketId}`]: "candlestickUpdate",
                 [`prefKlineTick_${socketId}`]: "candlestickTickUpdate"
            };

            listenerKeys.forEach(key => {
                const listener = listenerMap.get(key);
                const eventName = eventNames[key];
                if (listener && eventName) {
                    try { eventEmitter.removeListener(eventName, listener); }
                    catch (listenerError) { console.error(`[${socketId}] Error removiendo listener ${eventName}:`, listenerError); }
                    finally { listenerMap.delete(key); }
                } else if (listenerMap.has(key)) {
                     listenerMap.delete(key);
                }
            });
        }

        if (!wsMap) {
             console.warn(`[${socketId}] wsMap no disponible. Saltando limpieza de WS.`);
        } else {
            // --- Limpiar WebSockets ---
             // *** AÑADIDO: Nueva clave para WS de klines de preferencias ***
            const wsKeys = [`kline_${socketId}`, `short_${socketId}`, `prefKline_${socketId}`];
            wsKeys.forEach(key => {
                const ws = wsMap.get(key);
                if (ws) {
                    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                        try { ws.close(); }
                        catch (wsError) { console.error(`[${socketId}] Error cerrando WS ${key}:`, wsError); }
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