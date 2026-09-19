<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AppointmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $appointments = Appointment::query()
            ->when($request->filled('start'), fn ($query) => $query->where('ends_at', '>=', $request->string('start')))
            ->when($request->filled('end'), fn ($query) => $query->where('starts_at', '<=', $request->string('end')))
            ->orderBy('starts_at')
            ->get();

        return response()->json($appointments);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $this->ensureTimeRangeIsAvailable($data);

        $appointment = Appointment::create($data);

        return response()->json($appointment, 201);
    }

    public function show(Appointment $appointment): JsonResponse
    {
        return response()->json($appointment);
    }

    public function update(Request $request, Appointment $appointment): JsonResponse
    {
        $data = $this->validated($request);
        $this->ensureTimeRangeIsAvailable($data, $appointment);
        $appointment->update($data);

        return response()->json($appointment->fresh());
    }

    public function destroy(Request $request, Appointment $appointment): JsonResponse
    {
        abort_if($appointment->status === Appointment::STATUS_CANCELLED, 422, 'La cita ya fue cancelada.');

        $data = $request->validate([
            'cancellation_reason' => ['required', 'string', 'max:500'],
        ]);

        $appointment->update([
            'status' => Appointment::STATUS_CANCELLED,
            'cancellation_reason' => $data['cancellation_reason'],
        ]);

        return response()->json($appointment->fresh());
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'patient_name' => ['required', 'string', 'max:120'],
            'patient_document' => ['nullable', 'string', 'max:30'],
            'doctor_name' => ['required', 'string', 'max:120'],
            'specialty' => ['required', 'string', 'max:80'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'status' => ['sometimes', Rule::in([Appointment::STATUS_SCHEDULED, Appointment::STATUS_CANCELLED])],
            'notes' => ['nullable', 'string', 'max:1000'],
            'cancellation_reason' => ['nullable', 'string', 'max:500'],
        ]);
    }

    private function ensureTimeRangeIsAvailable(array $data, ?Appointment $except = null): void
    {
        if (($data['status'] ?? Appointment::STATUS_SCHEDULED) === Appointment::STATUS_CANCELLED) {
            return;
        }

        $conflict = Appointment::query()
            ->where('doctor_name', $data['doctor_name'])
            ->where('status', Appointment::STATUS_SCHEDULED)
            ->when($except, fn ($query) => $query->whereKeyNot($except->id))
            ->where('starts_at', '<', $data['ends_at'])
            ->where('ends_at', '>', $data['starts_at'])
            ->exists();

        abort_if($conflict, 422, 'El médico ya tiene una cita en ese horario.');
    }
}
