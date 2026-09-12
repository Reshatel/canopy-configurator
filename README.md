# Конфігуратор навісу

Параметричний 3D-конфігуратор дерев'яного навісу: розміри задаються в панелі, конструкція
збирається з окремих деталей під заданий габарит.

**Демо:** https://canopy-configurator-sable.vercel.app

## Запуск локально

```bash
git clone https://github.com/Reshatel/canopy-configurator.git
cd canopy-configurator
npm start
```

Відкрити http://localhost:5173

Залежностей і кроку збірки немає, `npm install` не потрібен. Підійде будь-який статичний сервер
із кореня проєкту, наприклад `python3 -m http.server 5173`. Потрібен саме HTTP — через `file://`
браузер блокує ES-модулі.

## Стек

Three.js r180 без 3D-фреймворків, ES-модулі через `importmap`, UI на звичайному DOM.
