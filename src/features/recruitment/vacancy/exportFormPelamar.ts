import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type { Applicant, ApplicantFormDetail } from './types';

async function blobUrlToArrayBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  return res.arrayBuffer();
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 80 },
    shading: {
      type: ShadingType.SOLID,
      color: '1e293b',
      fill: '1e293b',
    },
    children: [
      new TextRun({
        text,
        bold: true,
        color: 'FFFFFF',
        size: 22,
        allCaps: true,
      }),
    ],
  });
}

function labelValueRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 35, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: label, bold: true, size: 20 })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 65, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: value || '-', size: 20 })],
          }),
        ],
      }),
    ],
  });
}

function headerTableRow(headers: string[]): TableRow {
  return new TableRow({
    tableHeader: true,
    children: headers.map(
      (h) =>
        new TableCell({
          shading: { type: ShadingType.SOLID, color: 'e2e8f0', fill: 'e2e8f0' },
          children: [
            new Paragraph({
              children: [new TextRun({ text: h, bold: true, size: 18 })],
            }),
          ],
        }),
    ),
  });
}

function dataTableRow(cells: string[]): TableRow {
  return new TableRow({
    children: cells.map(
      (c) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: c || '-', size: 18 })],
            }),
          ],
        }),
    ),
  });
}

function emptyParagraph(): Paragraph {
  return new Paragraph({ children: [new TextRun({ text: '' })] });
}

function boldLabelParagraph(label: string): Paragraph {
  return new Paragraph({
    spacing: { before: 120, after: 40 },
    children: [new TextRun({ text: label, bold: true, size: 20 })],
  });
}

function textParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text: text || '-', size: 20 })],
  });
}

const rupiahFmt = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export async function exportFormPelamarDocx(
  applicant: Applicant,
  detail: ApplicantFormDetail,
  photoUrl: string | null,
  signatureUrl: string | null,
): Promise<void> {
  const sections: (Paragraph | Table)[] = [];

  // Judul
  sections.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: 'FORM PELAMAR',
          bold: true,
          size: 28,
          allCaps: true,
        }),
      ],
    }),
  );

  // ---- 1. IDENTITAS DIRI ----
  sections.push(sectionHeading('Identitas Diri'));

  // Foto jika ada
  if (photoUrl) {
    try {
      const buf = await blobUrlToArrayBuffer(photoUrl);
      sections.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new ImageRun({
              data: buf,
              transformation: { width: 80, height: 100 },
              type: 'jpg',
            }),
          ],
        }),
      );
    } catch {
      // Foto gagal dimuat, lanjutkan tanpa foto
    }
  }

  const id = detail.formData.identitas;
  sections.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        labelValueRow('Nama Lengkap', applicant.fullName),
        labelValueRow('Nama Panggilan', id.nama_panggilan),
        labelValueRow('Tempat, Tgl Lahir', `${id.tempat_lahir}, ${id.tanggal_lahir}`),
        labelValueRow('Alamat Tinggal', id.alamat_tinggal),
        labelValueRow('No. Telp / HP', applicant.phone),
        labelValueRow('No. Identitas (KTP)', id.no_identitas),
        labelValueRow('Agama', id.agama),
        labelValueRow('Status Perkawinan', id.status_perkawinan),
        labelValueRow('Kewarganegaraan', id.kewarganegaraan),
      ],
    }),
  );

  sections.push(emptyParagraph());

  // ---- 2. RIWAYAT PENDIDIKAN FORMAL ----
  sections.push(sectionHeading('Riwayat Pendidikan Formal'));
  if (detail.formData.pendidikan_formal.length === 0) {
    sections.push(textParagraph('-'));
  } else {
    sections.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          headerTableRow(['Tingkat', 'Sekolah/Universitas', 'Jurusan', 'Tahun Lulus', 'IPK/Nilai']),
          ...detail.formData.pendidikan_formal.map((p) =>
            dataTableRow([p.tingkat, p.nama_sekolah, p.jurusan, p.tahun_lulus, p.nilai]),
          ),
        ],
      }),
    );
  }

  sections.push(emptyParagraph());

  // ---- 3. PENDIDIKAN NON FORMAL ----
  sections.push(sectionHeading('Pendidikan Non Formal'));
  if (detail.formData.pendidikan_non_formal.length === 0) {
    sections.push(textParagraph('-'));
  } else {
    for (const item of detail.formData.pendidikan_non_formal) {
      sections.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 60 },
          children: [new TextRun({ text: item, size: 20 })],
        }),
      );
    }
  }

  sections.push(emptyParagraph());

  // ---- 4. PENGALAMAN KERJA ----
  sections.push(sectionHeading('Pengalaman Kerja'));
  if (detail.formData.pengalaman_kerja.length === 0) {
    sections.push(textParagraph('-'));
  } else {
    sections.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          headerTableRow(['Perusahaan', 'Periode', 'Jabatan', 'Gaji Terakhir']),
          ...detail.formData.pengalaman_kerja.map((k) =>
            dataTableRow([
              k.nama_perusahaan,
              `${k.periode_dari} - ${k.periode_hingga}`,
              k.jabatan,
              k.gaji_terakhir,
            ]),
          ),
        ],
      }),
    );
  }

  sections.push(emptyParagraph());

  // ---- 5. PENGUASAAN BAHASA ----
  sections.push(sectionHeading('Penguasaan Bahasa'));
  if (detail.formData.penguasaan_bahasa.length === 0) {
    sections.push(textParagraph('-'));
  } else {
    sections.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: detail.formData.penguasaan_bahasa.join(', '),
            size: 20,
          }),
        ],
      }),
    );
  }

  sections.push(emptyParagraph());

  // ---- 6. SOFT SKILL ----
  sections.push(sectionHeading('Soft Skill'));
  if (detail.formData.soft_skill.length === 0) {
    sections.push(textParagraph('-'));
  } else {
    sections.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: detail.formData.soft_skill.join(', '),
            size: 20,
          }),
        ],
      }),
    );
  }

  sections.push(emptyParagraph());

  // ---- 7. PENGALAMAN ORGANISASI ----
  sections.push(sectionHeading('Pengalaman Organisasi'));
  if (detail.formData.pengalaman_organisasi.length === 0) {
    sections.push(textParagraph('-'));
  } else {
    sections.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          headerTableRow(['Organisasi', 'Periode', 'Jabatan', 'Tugas']),
          ...detail.formData.pengalaman_organisasi.map((o) =>
            dataTableRow([o.nama_organisasi, o.periode, o.jabatan, o.tugas]),
          ),
        ],
      }),
    );
  }

  sections.push(emptyParagraph());

  // ---- 8. INFORMASI LAINNYA ----
  sections.push(sectionHeading('Informasi Lainnya'));
  const info = detail.formData.info_lainnya;
  sections.push(boldLabelParagraph('Sumber Informasi Lowongan'));
  sections.push(textParagraph(info.sumber_info));
  sections.push(boldLabelParagraph('Pengetahuan tentang Gaharu Sempana Group'));
  sections.push(textParagraph(info.tentang_gsg));
  sections.push(boldLabelParagraph('Alasan Bergabung'));
  sections.push(textParagraph(info.alasan_bergabung));
  sections.push(boldLabelParagraph('Misi dan Kontribusi ke Perusahaan'));
  sections.push(textParagraph(info.misi_kontribusi));

  sections.push(emptyParagraph());

  // ---- 9. EKSPEKTASI GAJI ----
  sections.push(sectionHeading('Ekspektasi Gaji'));
  sections.push(
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: rupiahFmt.format(detail.expectedSalary),
          bold: true,
          size: 24,
        }),
      ],
    }),
  );

  sections.push(emptyParagraph());

  // ---- 10. TANDA TANGAN ----
  sections.push(sectionHeading('Tanda Tangan'));

  if (detail.formData.kota_tanda_tangan) {
    const tanggalStr = new Date(detail.submittedAt).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    sections.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: `Dibuat di ${detail.formData.kota_tanda_tangan}, ${tanggalStr}`,
            size: 20,
          }),
        ],
      }),
    );
  }

  if (signatureUrl) {
    try {
      const buf = await blobUrlToArrayBuffer(signatureUrl);
      sections.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new ImageRun({
              data: buf,
              transformation: { width: 180, height: 80 },
              type: 'png',
            }),
          ],
        }),
      );
    } catch {
      sections.push(textParagraph('(Tanda tangan tidak tersedia)'));
    }
  } else {
    sections.push(textParagraph('(Tanda tangan tidak tersedia)'));
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 22,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              bottom: 720,
              left: 1080,
              right: 1080,
            },
          },
        },
        children: sections,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `form-pelamar-${applicant.fullName.replace(/\s+/g, '_')}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
