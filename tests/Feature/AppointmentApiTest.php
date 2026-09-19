<?php

namespace Tests\Feature;

use App\Models\Appointment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppointmentApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_appointment_can_be_scheduled(): void
    {
        $payload = [
            'patient_name' => 'Ana López',
            'patient_document' => '1234567890101',
            'doctor_name' => 'Carlos Méndez',
            'specialty' => 'Medicina interna',
            'starts_at' => '2026-10-01 09:00:00',
            'ends_at' => '2026-10-01 09:30:00',
        ];

        $this->postJson('/api/appointments', $payload)
            ->assertCreated()
            ->assertJsonPath('status', Appointment::STATUS_SCHEDULED);

        $this->assertDatabaseHas('appointments', ['patient_name' => 'Ana López']);
    }

    public function test_an_appointment_can_be_cancelled_without_being_deleted(): void
    {
        $appointment = Appointment::query()->create([
            'patient_name' => 'Ana López',
            'doctor_name' => 'Carlos Méndez',
            'specialty' => 'Medicina interna',
            'starts_at' => '2026-10-01 09:00:00',
            'ends_at' => '2026-10-01 09:30:00',
            'status' => Appointment::STATUS_SCHEDULED,
        ]);

        $this->deleteJson("/api/appointments/{$appointment->id}", [
            'cancellation_reason' => 'Paciente no podrá asistir.',
        ])->assertOk()->assertJsonPath('status', Appointment::STATUS_CANCELLED);

        $this->assertDatabaseHas('appointments', ['id' => $appointment->id, 'status' => Appointment::STATUS_CANCELLED]);
    }
}
