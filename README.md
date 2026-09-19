# HIS Clínica · Control de Citas Médicas

Módulo funcional para agendar, reprogramar y cancelar citas médicas dentro de un Sistema Hospitalario Integrado (HIS).

## Características

- Agenda interactiva con FullCalendar, vistas mensual, semanal y diaria.
- UI hospitalaria responsiva para recepción.
- Alta de citas con paciente, médico, especialidad, horario y notas.
- Reprogramación desde el formulario, arrastrando la cita o redimensionándola.
- Cancelación lógica: la cita se conserva para trazabilidad con su motivo.
- Prevención de cruces de horario para el mismo médico.
- API REST propia y base de datos MySQL en Docker.

## Ejecución manual (sin Docker)

### Requisitos

- PHP 8.2 o superior, con las extensiones `pdo_sqlite` y `sqlite3` habilitadas.
- Composer 2.

En PowerShell, entra en la carpeta del proyecto y ejecuta los siguientes comandos una única vez:

```powershell
composer install
Copy-Item .env.example .env
New-Item -ItemType File -Path database/database.sqlite -Force
php artisan key:generate
php artisan migrate
```

Para iniciar la aplicación:

```powershell
php artisan serve
```

Abre `http://127.0.0.1:8000` en el navegador. Para detener el servidor usa `Ctrl + C` en la terminal.

> Si no tienes Composer instalado globalmente, descárgalo desde `https://getcomposer.org/download/` o ejecuta Composer mediante su archivo `.phar` con `php composer.phar install`.

## Ejecución con Docker

```bash
docker compose up --build
```

Luego abre `http://localhost:8000`. La aplicación ejecuta las migraciones al iniciar. Para detenerla: `docker compose down`. Para eliminar también los datos locales: `docker compose down -v`.

## API REST

| Método | Ruta | Acción |
| --- | --- | --- |
| GET | `/api/appointments` | Lista las citas; acepta `start` y `end`. |
| POST | `/api/appointments` | Agenda una cita. |
| GET | `/api/appointments/{id}` | Consulta una cita. |
| PUT/PATCH | `/api/appointments/{id}` | Edita o reprograma una cita. |
| DELETE | `/api/appointments/{id}` | Cancela una cita; requiere `cancellation_reason`. |

Ejemplo para agendar:

```json
{
  "patient_name": "Ana López",
  "patient_document": "1234567890101",
  "doctor_name": "Carlos Méndez",
  "specialty": "Medicina interna",
  "starts_at": "2026-10-01 09:00:00",
  "ends_at": "2026-10-01 09:30:00",
  "notes": "Primera consulta"
}
```

## Pruebas automatizadas

Con PHP y Composer instalados:

```powershell
php artisan test
```

Las pruebas cubren la creación, la cancelación con trazabilidad y el bloqueo de cancelaciones realizadas por una actualización normal.
