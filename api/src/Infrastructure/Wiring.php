<?php
declare(strict_types=1);

namespace App\Infrastructure;

use App\Application\Employee\EmployeeUseCases;
use App\Application\Identity\Login;
use App\Application\Ports\AuditLog;
use App\Application\Ports\FileStorage;
use App\Application\Ports\Mailer;
use App\Application\Ports\PasswordHasher;
use App\Application\Ports\TokenService;
use App\Application\Recruitment\ApplicantUseCases;
use App\Application\Recruitment\MrfUseCases;
use App\Application\Recruitment\OfferingLetterUseCases;
use App\Application\Recruitment\VacancyUseCases;
use App\Domain\Employee\EmployeeRepository;
use App\Domain\Identity\UserRepository;
use App\Domain\Recruitment\ApplicantRepository;
use App\Domain\Recruitment\MrfRepository;
use App\Domain\Recruitment\OfferingLetterRepository;
use App\Domain\Recruitment\VacancyRepository;
use App\Infrastructure\Mail\LogMailer;
use App\Infrastructure\Mail\SmtpMailer;
use App\Infrastructure\Persistence\Database;
use App\Infrastructure\Persistence\PdoApplicantRepository;
use App\Infrastructure\Persistence\PdoAuditLog;
use App\Infrastructure\Persistence\PdoEmployeeRepository;
use App\Infrastructure\Persistence\PdoMrfRepository;
use App\Infrastructure\Persistence\PdoOfferingLetterRepository;
use App\Infrastructure\Persistence\PdoUserRepository;
use App\Infrastructure\Persistence\PdoVacancyRepository;
use App\Infrastructure\Security\JwtTokenService;
use App\Infrastructure\Security\NativePasswordHasher;
use App\Infrastructure\Storage\LocalFileStorage;
use App\Presentation\Http\Controllers\ApplicantController;
use App\Presentation\Http\Controllers\ApplicantFormController;
use App\Presentation\Http\Controllers\AuthController;
use App\Presentation\Http\Controllers\EmployeeController;
use App\Presentation\Http\Controllers\MrfController;
use App\Presentation\Http\Controllers\OfferingLetterController;
use App\Presentation\Http\Controllers\PublicApplyController;
use App\Presentation\Http\Controllers\PublicOnboardingController;
use App\Presentation\Http\Controllers\PublicOlController;
use App\Presentation\Http\Controllers\VacancyController;
use App\Presentation\Http\Middleware\Authenticate;
use PDO;

/** Satu-satunya tempat yang tahu implementasi konkret mana dipasang ke antarmuka mana. */
final class Wiring
{
    public static function build(): Container
    {
        $c = new Container();

        $c->set(PDO::class, static fn () => Database::connect());

        $c->set(UserRepository::class, static fn (Container $c) => new PdoUserRepository($c->get(PDO::class)));
        $c->set(MrfRepository::class,  static fn (Container $c) => new PdoMrfRepository($c->get(PDO::class)));
        $c->set(VacancyRepository::class,   static fn (Container $c) => new PdoVacancyRepository($c->get(PDO::class)));
        $c->set(ApplicantRepository::class,      static fn (Container $c) => new PdoApplicantRepository($c->get(PDO::class)));
        $c->set(OfferingLetterRepository::class, static fn (Container $c) => new PdoOfferingLetterRepository($c->get(PDO::class)));
        $c->set(EmployeeRepository::class, static fn (Container $c) => new PdoEmployeeRepository($c->get(PDO::class)));
        $c->set(AuditLog::class,           static fn (Container $c) => new PdoAuditLog($c->get(PDO::class)));

        $c->set(PasswordHasher::class, static fn () => new NativePasswordHasher());
        $c->set(TokenService::class, static fn () => new JwtTokenService(
            JWT_SECRET,
            defined('JWT_TTL_SECONDS') ? (int) JWT_TTL_SECONDS : 28800
        ));
        $c->set(Mailer::class, static fn () => (defined('APP_ENV') && APP_ENV === 'local')
            ? new LogMailer()
            : new SmtpMailer());
        $c->set(FileStorage::class, static fn () => new LocalFileStorage());

        $c->set(Login::class, static fn (Container $c) => new Login(
            $c->get(UserRepository::class), $c->get(PasswordHasher::class), $c->get(TokenService::class)
        ));
        $c->set(MrfUseCases::class, static fn (Container $c) => new MrfUseCases($c->get(MrfRepository::class)));
        $c->set(VacancyUseCases::class, static fn (Container $c) => new VacancyUseCases(
            $c->get(VacancyRepository::class), $c->get(MrfRepository::class),
            $c->get(ApplicantRepository::class), $c->get(FileStorage::class)
        ));
        $c->set(ApplicantUseCases::class, static fn (Container $c) => new ApplicantUseCases(
            $c->get(ApplicantRepository::class), $c->get(VacancyRepository::class),
            $c->get(MrfRepository::class), $c->get(FileStorage::class), $c->get(Mailer::class),
            $c->get(EmployeeRepository::class), $c->get(OfferingLetterRepository::class),
        ));
        $c->set(OfferingLetterUseCases::class, static fn (Container $c) => new OfferingLetterUseCases(
            $c->get(OfferingLetterRepository::class), $c->get(ApplicantRepository::class),
            $c->get(VacancyRepository::class), $c->get(FileStorage::class),
            $c->get(Mailer::class), $c->get(UserRepository::class)
        ));
        $c->set(EmployeeUseCases::class, static fn (Container $c) => new EmployeeUseCases(
            $c->get(EmployeeRepository::class), $c->get(FileStorage::class), $c->get(AuditLog::class)
        ));

        $c->set(Authenticate::class, static fn (Container $c) => new Authenticate(
            $c->get(TokenService::class), $c->get(UserRepository::class)
        ));
        $c->set(AuthController::class,     static fn (Container $c) => new AuthController($c->get(Login::class)));
        $c->set(MrfController::class,      static fn (Container $c) => new MrfController($c->get(MrfUseCases::class)));
        $c->set(VacancyController::class,  static fn (Container $c) => new VacancyController($c->get(VacancyUseCases::class)));
        $c->set(ApplicantController::class, static fn (Container $c) => new ApplicantController($c->get(ApplicantUseCases::class)));
        $c->set(OfferingLetterController::class, static fn (Container $c) => new OfferingLetterController($c->get(OfferingLetterUseCases::class)));
        $c->set(PublicOlController::class, static fn (Container $c) => new PublicOlController($c->get(OfferingLetterUseCases::class)));
        $c->set(PublicApplyController::class, static fn (Container $c) => new PublicApplyController(
            $c->get(VacancyUseCases::class), $c->get(ApplicantUseCases::class), $c->get(FileStorage::class)
        ));
        $c->set(ApplicantFormController::class, static fn (Container $c) => new ApplicantFormController(
            $c->get(ApplicantRepository::class), $c->get(VacancyRepository::class), $c->get(FileStorage::class)
        ));
        $c->set(EmployeeController::class, static fn (Container $c) => new EmployeeController($c->get(EmployeeUseCases::class)));
        $c->set(PublicOnboardingController::class, static fn (Container $c) => new PublicOnboardingController(
            $c->get(EmployeeUseCases::class), $c->get(FileStorage::class)
        ));

        return $c;
    }
}
