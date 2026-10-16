<?php
declare(strict_types=1);

namespace App\Application\Employee;

use App\Domain\Employee\Employee;

/** Bentuk keluaran Employee yang aman dikirim ke browser. Token dan path berkas tidak disertakan. */
final class EmployeeView
{
    /** @param array<int,array{docType:string,filePath:string,uploadedAt:string}> $documents */
    public static function from(Employee $e, array $documents = []): array
    {
        $docs = array_map(
            static fn (array $d) => [
                'docType'    => $d['docType'],
                'uploadedAt' => $d['uploadedAt'],
            ],
            $documents,
        );

        return [
            'id'               => $e->id(),
            'applicantId'      => $e->applicantId(),
            'nik'              => $e->nik(),
            'fullName'         => $e->fullName(),
            'email'            => $e->email(),
            'phone'            => $e->phone(),
            'position'         => $e->position(),
            'division'         => $e->division(),
            'employmentStatus' => $e->employmentStatus(),
            'salary'           => $e->salary(),
            'contractStart'    => $e->contractStart(),
            'contractEnd'      => $e->contractEnd(),
            'status'           => $e->status()->value,
            'personalData'     => $e->personalData(),
            'validatedAt'      => $e->validatedAt()?->format('Y-m-d H:i:s'),
            'validatedBy'      => $e->validatedBy(),
            'createdAt'        => $e->createdAt()->format('Y-m-d H:i:s'),
            'updatedAt'        => $e->updatedAt()->format('Y-m-d H:i:s'),
            'hasOnboardingToken' => $e->onboardingToken() !== null,
            'onboardingLink'   => null, // token asli tidak dikirim; hanya tersedia lewat generateOnboardingLink
            'documents'        => $docs,
        ];
    }
}
