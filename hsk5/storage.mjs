let connection;
export function database() {
  if (!connection) connection = new Promise((resolve, reject) => {
    const request = indexedDB.open('hsk5-offline-study', 1);
    request.onupgradeneeded = () => {
      for (const name of ['lessons', 'audio']) request.result.createObjectStore(name, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { connection = null; reject(request.error); };
    request.onblocked = () => reject(new Error('Đóng tab học cũ rồi thử lại.'));
  });
  return connection;
}
export async function operation(store, method, value) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, ['get', 'getAll'].includes(method) ? 'readonly' : 'readwrite');
    const req = tx.objectStore(store)[method](value);
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = tx.onabort = () => reject(tx.error || req.error || new Error('Không lưu được dữ liệu.'));
  });
}
export const get = (store, id) => operation(store, 'get', id);
export const put = (store, row) => operation(store, 'put', row);
export const all = store => operation(store, 'getAll');
export const remove = (store, id) => operation(store, 'delete', id);
export async function restoreBundle(lesson, audio) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['lessons', 'audio'], 'readwrite');
    tx.objectStore('lessons').put(lesson);
    for (const row of audio) tx.objectStore('audio').put(row);
    tx.oncomplete = resolve;
    tx.onerror = tx.onabort = () => reject(tx.error || new Error('Khôi phục thất bại.'));
  });
}
