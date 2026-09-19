const { apiUrl } = window.appointmentsConfig;
const modal = document.getElementById('appointment-modal');
let calendar;

const closeModal = () => modal.classList.remove('open');
const showModal = (title, html) => {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = html;
    modal.classList.add('open');
};
const localDateTime = (date) => {
    const pad = value => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const formDateTime = value => value ? value.replace('Z', '').slice(0, 16) : '';
const request = async (url, method = 'GET', data = null) => {
    const response = await fetch(url, { method, headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: data ? JSON.stringify(data) : null });
    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || 'No fue posible guardar los cambios.');
    }
    return response.status === 204 ? null : response.json();
};
const fields = (appointment = {}) => `<form id="appointment-form"><div class="form-grid">
    <div class="field"><label>Paciente *</label><input required name="patient_name" value="${appointment.patient_name || ''}" maxlength="120"></div>
    <div class="field"><label>Documento</label><input name="patient_document" value="${appointment.patient_document || ''}" maxlength="30"></div>
    <div class="field"><label>Médico *</label><input required name="doctor_name" value="${appointment.doctor_name || ''}" maxlength="120"></div>
    <div class="field"><label>Especialidad *</label><input required name="specialty" value="${appointment.specialty || ''}" maxlength="80"></div>
    <div class="field"><label>Inicio *</label><input required type="datetime-local" name="starts_at" value="${formDateTime(appointment.starts_at)}"></div>
    <div class="field"><label>Fin *</label><input required type="datetime-local" name="ends_at" value="${formDateTime(appointment.ends_at)}"></div>
    <div class="field full"><label>Notas clínicas</label><textarea name="notes" rows="3" maxlength="1000">${appointment.notes || ''}</textarea></div>
    </div><div id="form-error"></div><div class="form-actions">${appointment.id && appointment.status !== 'cancelled' ? '<button type="button" class="danger-btn" id="cancel-appointment">Cancelar cita</button>' : ''}<button type="button" class="secondary-btn" data-close-modal>Volver</button><button class="new-btn">${appointment.id ? 'Guardar cambios' : 'Agendar cita'}</button></div></form>`;
const getFormData = form => Object.fromEntries(new FormData(form).entries());
const editAppointment = appointment => {
    showModal(appointment.id ? 'Editar / reprogramar cita' : 'Agendar nueva cita', fields(appointment));
    document.querySelector('[data-close-modal]').onclick = closeModal;
    document.getElementById('appointment-form').onsubmit = async event => {
        event.preventDefault(); const error = document.getElementById('form-error'); error.innerHTML = '';
        try { await request(appointment.id ? `${apiUrl}/${appointment.id}` : apiUrl, appointment.id ? 'PUT' : 'POST', getFormData(event.currentTarget)); closeModal(); calendar.refetchEvents(); }
        catch (exception) { error.innerHTML = `<div class="error">${exception.message}</div>`; }
    };
    const cancel = document.getElementById('cancel-appointment');
    if (cancel) cancel.onclick = async () => {
        const reason = window.prompt('Indica el motivo de la cancelación:');
        if (!reason) return;
        try { await request(`${apiUrl}/${appointment.id}`, 'DELETE', { cancellation_reason: reason }); closeModal(); calendar.refetchEvents(); }
        catch (exception) { document.getElementById('form-error').innerHTML = `<div class="error">${exception.message}</div>`; }
    };
};
const updateStats = rows => { const now = new Date(), end = new Date(now); end.setDate(now.getDate() + 7); document.getElementById('today-count').textContent = rows.filter(x => new Date(x.starts_at).toDateString() === now.toDateString() && x.status === 'scheduled').length; document.getElementById('week-count').textContent = rows.filter(x => new Date(x.starts_at) >= now && new Date(x.starts_at) <= end && x.status === 'scheduled').length; document.getElementById('cancelled-count').textContent = rows.filter(x => x.status === 'cancelled').length; };
document.querySelector('[data-close-modal]').onclick = closeModal; modal.onclick = event => { if (event.target === modal) closeModal(); };
document.addEventListener('DOMContentLoaded', () => {
    calendar = new FullCalendar.Calendar(document.getElementById('calendar'), { locale: 'es', initialView: 'timeGridWeek', firstDay: 1, height: 'auto', nowIndicator: true, editable: true, slotMinTime: '07:00:00', slotMaxTime: '20:00:00', headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
        events: async (info, success, failure) => { try { const rows = await request(`${apiUrl}?start=${info.startStr}&end=${info.endStr}`); updateStats(rows); document.getElementById('empty-note').style.display = rows.length ? 'none' : 'block'; success(rows.map(a => ({ id: a.id, title: `${a.patient_name} · ${a.doctor_name}`, start: a.starts_at.replace('Z', ''), end: a.ends_at.replace('Z', ''), backgroundColor: a.status === 'cancelled' ? '#dc526a' : '#2cb67d', editable: a.status !== 'cancelled', extendedProps: a }))); } catch (e) { failure(e); } },
        eventClick: info => editAppointment(info.event.extendedProps), select: info => editAppointment({ starts_at: info.start, ends_at: info.end }),
        eventDrop: async info => { try { const a = info.event.extendedProps; await request(`${apiUrl}/${info.event.id}`, 'PUT', { ...a, starts_at: localDateTime(info.event.start), ends_at: localDateTime(info.event.end) }); calendar.refetchEvents(); } catch (e) { info.revert(); alert(e.message); } },
        eventResize: async info => { try { const a = info.event.extendedProps; await request(`${apiUrl}/${info.event.id}`, 'PUT', { ...a, starts_at: localDateTime(info.event.start), ends_at: localDateTime(info.event.end) }); calendar.refetchEvents(); } catch (e) { info.revert(); alert(e.message); } }
    });
    calendar.render(); document.getElementById('new-appointment').onclick = () => editAppointment({});
});
