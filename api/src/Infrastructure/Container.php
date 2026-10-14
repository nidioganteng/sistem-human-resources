<?php
declare(strict_types=1);

namespace App\Infrastructure;

/** Container DI sederhana: daftar pabrik, objek dibuat sekali saat pertama diminta. */
final class Container
{
    /** @var array<string,callable> */
    private array $factories = [];
    /** @var array<string,mixed> */
    private array $instances = [];

    public function set(string $id, callable $factory): void
    {
        $this->factories[$id] = $factory;
    }

    public function get(string $id): mixed
    {
        if (!array_key_exists($id, $this->instances)) {
            if (!isset($this->factories[$id])) {
                throw new \LogicException("Layanan tidak terdaftar: $id");
            }
            $this->instances[$id] = ($this->factories[$id])($this);
        }

        return $this->instances[$id];
    }
}
