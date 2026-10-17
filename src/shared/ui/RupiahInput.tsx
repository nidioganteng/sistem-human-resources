import { useEffect, useState } from 'react';

interface Props {
  value: string;
  onChange: (raw: string) => void;
  placeholder?: string;
  inputClassName?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
}

function toFormatted(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('id-ID');
}

/** Format angka jadi "Rp 5.000.000" untuk ditampilkan. */
export function formatRupiah(amount: number | null | undefined): string {
  if (amount == null) return '-';
  return 'Rp ' + amount.toLocaleString('id-ID');
}

/**
 * Input teks untuk nilai rupiah. Menerima/mengeluarkan raw digit string ("5000000"),
 * menampilkan format "5.000.000" dengan prefix "Rp" di sisi kiri.
 */
export function RupiahInput({
  value,
  onChange,
  placeholder = 'mis. 5.000.000',
  inputClassName = 'field-input',
  id,
  required,
  disabled,
}: Props) {
  const [display, setDisplay] = useState(() => toFormatted(value));

  useEffect(() => {
    setDisplay(toFormatted(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setDisplay(raw ? Number(raw).toLocaleString('id-ID') : '');
    onChange(raw);
  };

  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium text-slate-400 select-none dark:text-slate-500">
        Rp
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        className={`${inputClassName} pl-10`}
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
      />
    </div>
  );
}
