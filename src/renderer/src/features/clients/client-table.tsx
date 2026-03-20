import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef
} from "@tanstack/react-table";
import { FolderOpen, PencilLine, UserRoundX } from "lucide-react";

import type { ClientRecord } from "../../../../shared/contracts";
import { getClientIdentitySummary, getClientStatusLabel } from "./client-utils";

type ClientTableProps = {
  clients: ClientRecord[];
  onEdit: (client: ClientRecord) => void;
  onToggleStatus: (client: ClientRecord) => void;
  onOpenFolder: (client: ClientRecord) => void;
};

export function ClientTable({
  clients,
  onEdit,
  onToggleStatus,
  onOpenFolder
}: ClientTableProps) {
  const columns: ColumnDef<ClientRecord>[] = [
    {
      accessorKey: "name",
      header: "Mükellef",
      cell: ({ row }) => (
        <div className="client-name-cell">
          <strong>{row.original.name}</strong>
          <span>{row.original.taxOffice || "Vergi dairesi belirtilmedi"}</span>
        </div>
      )
    },
    {
      id: "identity",
      header: "Kimlik",
      cell: ({ row }) => getClientIdentitySummary(row.original)
    },
    {
      accessorKey: "authorizedPerson",
      header: "Yetkili",
      cell: ({ row }) => row.original.authorizedPerson || "—"
    },
    {
      accessorKey: "phone",
      header: "Telefon",
      cell: ({ row }) => row.original.phone || "—"
    },
    {
      accessorKey: "status",
      header: "Durum",
      cell: ({ row }) => (
        <span className={`client-status-pill ${row.original.status}`}>
          {getClientStatusLabel(row.original.status)}
        </span>
      )
    },
    {
      id: "actions",
      header: "İşlemler",
      cell: ({ row }) => (
        <div className="table-actions">
          <button className="table-action-button" onClick={() => onOpenFolder(row.original)} type="button">
            <FolderOpen size={16} />
            <span>Klasörü aç</span>
          </button>
          <button className="table-action-button" onClick={() => onEdit(row.original)} type="button">
            <PencilLine size={16} />
            <span>Düzenle</span>
          </button>
          <button className="table-action-button" onClick={() => onToggleStatus(row.original)} type="button">
            <UserRoundX size={16} />
            <span>{row.original.status === "active" ? "Pasife çek" : "Aktifleştir"}</span>
          </button>
        </div>
      )
    }
  ];

  const table = useReactTable({
    data: clients,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <div className="client-table-shell">
      <table className="client-table">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
