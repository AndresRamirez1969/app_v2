# Tasker Solutions - Frontend (app_v2)

Frontend oficial de **Tasker Solutions**, desarrollado con **Vue 3 + Vite + Vuetify**.  
Este repositorio consume el API del backend de Tasker Solutions, implementado por separado en **PHP + Laravel**.

---

## Contexto de arquitectura

Tasker Solutions está dividido en dos repositorios principales:

- **Frontend (este repo):** SPA para operación de usuarios, formularios y reportes.
- **Backend (repo separado):** API REST en Laravel, autenticación, reglas de negocio y persistencia.

### Relación frontend-backend

- El frontend envía respuestas de formularios (incluyendo archivos/evidencias) vía `multipart/form-data`.
- El backend responde catálogos, formularios, asignaciones, respuestas y reportes.
- URLs base de API y de archivos se controlan por variables `VITE_*`.

---

## Stack técnico

- **Vue:** 3.x
- **Bundler:** Vite 6
- **UI:** Vuetify 3
- **State management:** Pinia
- **Routing:** Vue Router 4
- **HTTP client:** Axios
- **Forms/validación:** Vee Validate (uso parcial según pantalla)
- **Barcode scanner:** `@zxing/browser` + `@zxing/library`
- **Firma digital:** `@selemondev/vue3-signature-pad`
- **Compresión de imágenes:** `browser-image-compression`

---

## Requisitos

- **Node.js** `>= 20.0.0`
- **Yarn** `>= 1.22.0`

---

## Instalación y ejecución local

yarn install
yarn dev
